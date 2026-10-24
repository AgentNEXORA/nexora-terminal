import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { spawn } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createManusTask, getManusTaskProgress, MANUS_TASK_MAX_CHARS } from "./manus-api.js";
import { MANUS_WEBHOOK_URL, verifyManusWebhook } from "./manus-webhook.js";
import {
  addRequest,
  addExecution,
  addSecurityEvent,
  createKey,
  disableKey,
  findKey,
  listDevices,
  listExecutions,
  listKeys,
  listRequests,
  listSecurityEvents,
  overview,
  upsertDevice,
} from "./control-store.js";
import {
  createBridgeJobState,
  createInternalJobsRouter,
  DEFAULT_JOB_MAX_OUTPUT_BYTES,
  DEFAULT_JOB_MAX_DURATION_MS,
  DEFAULT_JOB_TTL_MS,
  INTERNAL_JOB_PATH,
  parseJobClockSkewSeconds,
  signBridgeRequest,
} from "./bridge-jobs.js";
import { startSelfHeartbeat } from "./self-heartbeat.js";
import { executeRenderAction, getRenderPolicy, listRenderServices } from "./render-ops.js";

dotenv.config();
const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.set({
    "Content-Security-Policy": "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; connect-src 'self'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
  next();
});
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, "../frontend");
const PORT = Number(process.env.PORT || 8787);
const configuredCommandsFile = process.env.COMMANDS_FILE || "./commands.json";
const requestedCommandsFile = path.isAbsolute(configuredCommandsFile) ? configuredCommandsFile : path.resolve(__dirname, configuredCommandsFile);
const bundledCommandsFile = path.resolve(__dirname, "commands.json");
const COMMANDS_FILE = fs.existsSync(requestedCommandsFile) ? requestedCommandsFile : bundledCommandsFile;
const configuredClockSkew = Number(process.env.HMAC_CLOCK_SKEW_SECONDS || 300);
const CLOCK_SKEW = Number.isFinite(configuredClockSkew) && configuredClockSkew > 0 ? configuredClockSkew : 300;
const JOB_CLOCK_SKEW = parseJobClockSkewSeconds(process.env.NEXORA_JOB_CLOCK_SKEW_SECONDS || "60");
const DANGEROUS = /[;&|`$<>\u0000-\u001f\u007f]/;
const SHELL_EXECUTABLES = new Set(["sh", "bash", "dash", "zsh", "fish", "cmd", "powershell", "pwsh"]);
const ALLOWED_COMMAND_ENV = new Set(["LANG", "LC_ALL", "TZ"]);
const ALLOWED_BUILTINS = new Set(["runtime_info"]);

app.use(cors({ origin: process.env.CORS_ORIGIN || false, credentials: true }));
const bridgeJobState = createBridgeJobState();
app.use("/internal/jobs", createInternalJobsRouter({
  secretProvider: () => process.env.NEXORA_BRIDGE_JOBS_MODE === "single_instance_memory"
    ? process.env.NEXORA_BRIDGE_HMAC_SECRET || ""
    : "",
  state: bridgeJobState,
  resolveCommand: resolveBridgeJobCommand,
  executeCommand: executeLocalBridgeCommand,
  clockSkewSeconds: JOB_CLOCK_SKEW,
  maxOutputBytes: DEFAULT_JOB_MAX_OUTPUT_BYTES,
  maxDurationMs: DEFAULT_JOB_MAX_DURATION_MS,
  onLog: (record) => console.info(JSON.stringify(record)),
}));
// The signed internal route must capture exact bytes before the global JSON parser.
app.use(express.json({ limit: "1mb", verify: (req, _res, buffer) => { req.rawBody = Buffer.from(buffer); } }));

function loadCommands() {
  if (!fs.existsSync(COMMANDS_FILE)) return { configured: false, reason: "missing", commands: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(COMMANDS_FILE, "utf-8"));
    if (!Array.isArray(parsed)) return { configured: false, reason: "invalid", commands: [] };
    const ids = new Set();
    for (const command of parsed) {
      const hasBuiltin = typeof command?.builtin === "string";
      const invalidParams = command?.params !== undefined && (
        !Array.isArray(command.params) || !command.params.every((param) => typeof param === "string")
      );
      const invalidJobFlag = command?.internalJob !== undefined && typeof command.internalJob !== "boolean";
      const invalidEnv = command?.env !== undefined && (
        !command.env || typeof command.env !== "object" || Array.isArray(command.env) ||
        Object.entries(command.env).some(([key, value]) => !ALLOWED_COMMAND_ENV.has(key) || typeof value !== "string" || value.length > 200)
      );
      const invalidExecutable = !hasBuiltin && (
        typeof command?.exec !== "string" || !command.exec.trim() || !path.isAbsolute(command.exec) ||
        SHELL_EXECUTABLES.has(path.basename(command.exec).toLowerCase())
      );
      const invalidBuiltin = command?.builtin !== undefined && (
        !hasBuiltin || !ALLOWED_BUILTINS.has(command.builtin) || command.exec !== undefined || command.params !== undefined ||
        command.cwd !== undefined || command.env !== undefined || command.internalJob !== undefined || command.serviceAction !== undefined
      );
      const invalidTimeout = command?.timeoutMs !== undefined && (!Number.isInteger(command.timeoutMs) || command.timeoutMs < 1000 || command.timeoutMs > 300000);
      const invalidCwd = command?.cwd !== undefined && (typeof command.cwd !== "string" || !path.isAbsolute(command.cwd));
      if (!command || typeof command.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(command.id) || ids.has(command.id) || typeof command.title !== "string" || invalidExecutable || invalidBuiltin || invalidParams || invalidJobFlag || invalidEnv || invalidTimeout || invalidCwd) {
        return { configured: false, reason: "invalid", commands: [] };
      }
      ids.add(command.id);
      if (command.serviceAction) {
        const action = command.serviceAction;
        if (!action || !["start", "stop", "restart"].includes(action.operation) || typeof action.service !== "string" || !action.service.trim() || action.service.length > 100) {
          return { configured: false, reason: "invalid", commands: [] };
        }
      }
    }
    return { configured: true, reason: parsed.length ? "ready" : "empty", commands: parsed };
  } catch {
    return { configured: false, reason: "invalid", commands: [] };
  }
}
function publicCommand(command) {
  const inputs = new Set((command.params || []).flatMap((param) => [...param.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map((match) => match[1])));
  const result = { id: command.id, title: command.title, description: command.description || "", inputs: [...inputs].map((name) => ({ name })) };
  if (command.builtin) result.builtin = command.builtin;
  if (command.serviceAction) result.serviceAction = { operation: command.serviceAction.operation, service: command.serviceAction.service };
  return result;
}
const builtInHealthCheck = Object.freeze({
  id: "health_check",
  title: "فحص صحة خدمة NEXORA",
  description: "يفحص عملية Node المحلية على خدمة Render فقط؛ لا يتصل بمضيف Linux خارجي.",
  timeoutMs: 5_000,
  builtin: "health_check",
});
function isBridgeJobCommand(command) {
  if (!command || command.internalJob !== true || command.serviceAction) return false;
  if (SHELL_EXECUTABLES.has(path.basename(command.exec || "").toLowerCase())) return false;
  return !(command.params || []).some((param) => /\{\{|\}\}/.test(param));
}
function listBridgeJobCommands() {
  const catalog = loadCommands();
  const configured = catalog.configured ? catalog.commands.filter(isBridgeJobCommand).map((command) => ({
    id: command.id,
    title: command.title,
    description: command.description || "",
  })) : [];
  return [builtInHealthCheck, ...configured];
}
function resolveBridgeJobCommand(commandId) {
  if (commandId === builtInHealthCheck.id) return builtInHealthCheck;
  const catalog = loadCommands();
  return catalog.configured ? catalog.commands.find((command) => command.id === commandId && isBridgeJobCommand(command)) || null : null;
}
function executeLocalBridgeCommand(command, { signal, maxOutputBytes = DEFAULT_JOB_MAX_OUTPUT_BYTES } = {}) {
  if (command?.builtin === "health_check") {
    const report = {
      status: "ok",
      runner: "local_render",
      service: "nexora-terminal-control",
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
    };
    return Promise.resolve({ status: "success", ok: true, code: 0, durationMs: 0, stdout: JSON.stringify(report), stderr: "" });
  }
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const childEnv = {
      PATH: process.env.PATH || "/usr/bin:/bin",
      HOME: process.env.HOME || "/tmp",
      TMPDIR: process.env.TMPDIR || "/tmp",
      LANG: process.env.LANG || "C.UTF-8",
    };
    const child = spawn(command.exec, command.params || [], {
      cwd: command.cwd || process.cwd(),
      env: childEnv,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let outputLimitReached = false;
    let settled = false;
    const appendBounded = (target, chunk) => {
      if (settled) return;
      const bytes = Buffer.from(chunk);
      const remaining = Math.max(0, maxOutputBytes - outputBytes);
      const kept = bytes.subarray(0, remaining);
      target.value += kept.toString("utf8");
      outputBytes += kept.length;
      if (kept.length < bytes.length) {
        outputLimitReached = true;
        child.kill("SIGKILL");
      }
    };
    const out = { get value() { return stdout; }, set value(value) { stdout = value; } };
    const err = { get value() { return stderr; }, set value(value) { stderr = value; } };
    const finish = (code, spawnError = false) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abortChild);
      const status = spawnError ? "spawn_error" : outputLimitReached ? "output_limit" : code === 0 ? "success" : "failed";
      resolve({ status, ok: status === "success", code: Number.isInteger(code) ? code : null, durationMs: Date.now() - startedAt, outputLimitReached, stdout, stderr: spawnError ? "Unable to execute whitelisted job" : stderr });
    };
    const abortChild = () => { if (!settled) child.kill("SIGKILL"); };
    child.stdout.on("data", (chunk) => appendBounded(out, chunk));
    child.stderr.on("data", (chunk) => appendBounded(err, chunk));
    child.once("error", () => finish(null, true));
    child.once("close", (code) => finish(code));
    if (signal?.aborted) abortChild();
    else signal?.addEventListener("abort", abortChild, { once: true });
  });
}
function sanitizeArg(value) {
  const clipped = (value === undefined || value === null ? "" : String(value)).slice(0, 800);
  if (DANGEROUS.test(clipped)) throw new Error("Argument contains disallowed characters.");
  return clipped;
}
function constantTimeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function requestFingerprint(signature) { return signature ? `${signature.slice(0, 8)}…${signature.slice(-4)}` : "—"; }
function recordRequest(pathname, device, status, startedAt, signature) {
  addRequest({ time: new Date().toISOString().slice(11, 19), method: "POST", path: pathname, device: device || "unknown", status, latency: `${Date.now() - startedAt}ms`, hash: requestFingerprint(signature) });
}
function rejectHmac(req, res, reason, level = "high") {
  const device = req.body?.deviceId || req.body?.id || "unknown";
  recordRequest(req.path, device, "rejected", req.hmacStartedAt || Date.now(), req.headers["x-nexora-signature"]);
  addSecurityEvent({ level, title: "تم رفض توقيع HMAC", detail: `${device}: ${reason}`, code: "SIG_REJECTED" });
  return res.status(401).json({ ok: false, error: "HMAC verification failed" });
}
const AUTH_COOKIE = process.env.NODE_ENV === "production" ? "__Host-nexora-admin" : "nexora-admin-dev";
const AUTH_TTL_SECONDS = 30 * 60;
const authAttempts = new Map();
function authSignature(payload) {
  return crypto.createHmac("sha256", process.env.CONTROL_API_KEY || "").update(`nexora-admin-session-v1\0${payload}`).digest("base64url");
}
function validAdminCookie(req) {
  const raw = req.headers.cookie || "";
  const match = raw.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${AUTH_COOKIE}=`));
  if (!match) return false;
  const token = decodeURIComponent(match.slice(AUTH_COOKIE.length + 1));
  const [expiresText, nonce, signature, extra] = token.split(".");
  if (extra || !/^\d{10,13}$/.test(expiresText || "") || !/^[A-Za-z0-9_-]{20,}$/.test(nonce || "")) return false;
  if (Number(expiresText) <= Math.floor(Date.now() / 1000)) return false;
  return constantTimeEqual(signature, authSignature(`${expiresText}.${nonce}`));
}
function sameOrigin(req) {
  const origin = req.get("origin");
  if (!origin) return true;
  try { const forwarded = (req.get("x-forwarded-proto") || req.protocol).split(",")[0].trim(); return new URL(origin).origin === `${forwarded}://${req.get("host")}`; } catch { return false; }
}
const MANUS_TASK_RECEIPT_TTL_SECONDS = 7 * 24 * 60 * 60;
function issueManusTaskReceipt(taskId) {
  const expiresAt = Math.floor(Date.now() / 1000) + MANUS_TASK_RECEIPT_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ taskId, expiresAt })).toString("base64url");
  const signature = crypto.createHmac("sha256", process.env.CONTROL_API_KEY || "").update(`nexora-manus-task-v1.${payload}`).digest("base64url");
  return `${payload}.${signature}`;
}
function validManusTaskReceipt(taskId, receipt) {
  if (typeof receipt !== "string" || receipt.length > 2_000) return false;
  const [payload, signature, extra] = receipt.split(".");
  if (!payload || !signature || extra) return false;
  const expected = crypto.createHmac("sha256", process.env.CONTROL_API_KEY || "").update(`nexora-manus-task-v1.${payload}`).digest("base64url");
  if (!constantTimeEqual(signature, expected)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return decoded?.taskId === taskId && Number.isInteger(decoded.expiresAt) && decoded.expiresAt > Math.floor(Date.now() / 1000);
  } catch { return false; }
}
const MANUS_TASK_OWNERSHIP_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MANUS_WEBHOOK_REPLAY_TTL_MS = 10 * 60 * 1000;
const MANUS_WEBHOOK_PENDING_TTL_MS = 2 * 60 * 1000;
const ownedManusTasks = new Map();
const pendingManusWebhookEvents = new Map();
const seenManusWebhookEventIds = new Map();
const manusTaskEventStreams = new Map();
function pruneWebhookMap(map, now = Date.now()) {
  for (const [key, value] of map) if (value.expiresAt <= now) map.delete(key);
}
function emitManusTaskEvent(taskId, eventType) {
  const owner = ownedManusTasks.get(taskId);
  if (!owner) return false;
  owner.expiresAt = Date.now() + MANUS_TASK_OWNERSHIP_TTL_MS;
  owner.latestEvent = { taskId, eventType };
  const streams = manusTaskEventStreams.get(taskId);
  if (streams) {
    const frame = `event: manus-task-update\ndata: ${JSON.stringify(owner.latestEvent)}\n\n`;
    for (const response of streams) { try { response.write(frame); } catch {} }
  }
  return true;
}
function registerOwnedManusTask(taskId) {
  if (typeof taskId !== "string" || !/^[A-Za-z0-9._:-]{1,256}$/.test(taskId)) return;
  pruneWebhookMap(ownedManusTasks);
  if (!ownedManusTasks.has(taskId) && ownedManusTasks.size >= 500) ownedManusTasks.delete(ownedManusTasks.keys().next().value);
  const previous = ownedManusTasks.get(taskId);
  ownedManusTasks.set(taskId, { expiresAt: Date.now() + MANUS_TASK_OWNERSHIP_TTL_MS, latestEvent: previous?.latestEvent || null });
  const pending = pendingManusWebhookEvents.get(taskId);
  if (pending) {
    pendingManusWebhookEvents.delete(taskId);
    for (const event of pending.events) emitManusTaskEvent(taskId, event.eventType);
  }
}
function queuePendingManusWebhook(taskId, eventType) {
  const now = Date.now();
  pruneWebhookMap(pendingManusWebhookEvents, now);
  if (!pendingManusWebhookEvents.has(taskId) && pendingManusWebhookEvents.size >= 200) pendingManusWebhookEvents.delete(pendingManusWebhookEvents.keys().next().value);
  const pending = pendingManusWebhookEvents.get(taskId) || { expiresAt: now + MANUS_WEBHOOK_PENDING_TTL_MS, events: [] };
  if (pending.events.length < 5) pending.events.push({ eventType });
  pendingManusWebhookEvents.set(taskId, pending);
}
function requireControlKey(req, res, next) {
  const expected = process.env.CONTROL_API_KEY;
  if (!expected || expected.length < 32) return res.status(503).json({ ok: false, error: "Admin authentication is not configured" });
  const supplied = req.get("x-control-key") || req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (validAdminCookie(req) || (supplied && constantTimeEqual(supplied, expected))) return next();
  return res.status(401).json({ ok: false, error: "Authentication required" });
}
app.get("/api/auth/session", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ configured: Boolean(process.env.CONTROL_API_KEY && process.env.CONTROL_API_KEY.length >= 32), authenticated: validAdminCookie(req) });
});
app.post("/api/auth/login", (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "Same-origin request required" });
  const expected = process.env.CONTROL_API_KEY || "";
  if (expected.length < 32) return res.status(503).json({ ok: false, error: "Admin authentication is not configured" });
  const ip = req.ip || "unknown";
  const now = Date.now();
  const attempt = authAttempts.get(ip);
  if (attempt && attempt.resetAt > now && attempt.count >= 5) return res.status(429).json({ ok: false, error: "Too many login attempts" });
  if (!attempt || attempt.resetAt <= now) authAttempts.set(ip, { count: 1, resetAt: now + 15 * 60_000 }); else attempt.count++;
  if (!constantTimeEqual(req.body?.secret, expected)) return res.status(401).json({ ok: false, error: "Invalid credentials" });
  authAttempts.delete(ip);
  const expiry = Math.floor(now / 1000) + AUTH_TTL_SECONDS;
  const payload = `${expiry}.${crypto.randomBytes(24).toString("base64url")}`;
  const token = `${payload}.${authSignature(payload)}`;
  res.append("Set-Cookie", `${AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${AUTH_TTL_SECONDS}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  res.json({ authenticated: true });
});
app.post("/api/auth/logout", (req, res) => {
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "Same-origin request required" });
  res.append("Set-Cookie", `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  res.json({ authenticated: false });
});
function requireHmac(req, res, next) {
  req.hmacStartedAt = Date.now();
  const keyId = req.get("x-nexora-key");
  const timestamp = req.get("x-nexora-timestamp");
  const signature = (req.get("x-nexora-signature") || "").replace(/^sha256=/, "");
  const key = findKey(keyId);
  if (!key || key.status !== "active") return rejectHmac(req, res, "مفتاح غير معروف أو معطل");
  const parsedTimestamp = Number(timestamp);
  if (!Number.isFinite(parsedTimestamp) || Math.abs(Date.now() / 1000 - parsedTimestamp) > CLOCK_SKEW) return rejectHmac(req, res, "الطابع الزمني خارج نافذة الصلاحية");
  const rawBody = (req.rawBody || Buffer.from("{}")).toString("utf8");
  const expected = crypto.createHmac("sha256", key.secret).update(`${timestamp}.${rawBody}`).digest("hex");
  if (!constantTimeEqual(signature, expected)) return rejectHmac(req, res, "التوقيع لا يطابق محتوى الطلب");
  key.lastUsed = new Date().toISOString();
  req.hmac = { keyId, signature, startedAt: req.hmacStartedAt };
  next();
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "nexora-terminal-control" }));

// Live admin data: protect these with CONTROL_API_KEY in production.
app.get("/api/control/overview", requireControlKey, (_req, res) => res.json(overview()));
app.get("/api/control/devices", requireControlKey, (_req, res) => res.json({ devices: listDevices() }));
app.get("/api/control/requests", requireControlKey, (_req, res) => res.json({ requests: listRequests() }));
app.get("/api/control/security", requireControlKey, (_req, res) => res.json({ events: listSecurityEvents() }));
app.get("/api/control/keys", requireControlKey, (_req, res) => res.json({ keys: listKeys() }));
app.get("/api/control/executions", requireControlKey, (_req, res) => res.json({ executions: listExecutions(), retention: "آخر 100 تنفيذ في ذاكرة العملية" }));
app.get("/api/control/openrouter/status", requireControlKey, (_req, res) => {
  res.set("Cache-Control", "no-store, private");
  res.json({
    configured: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    model: process.env.OPENROUTER_MODEL?.trim() || null,
    lastTest: { status: "not_run", testedAt: null },
  });
});
function bridgeJobConfiguration() {
  const modeEnabled = process.env.NEXORA_BRIDGE_JOBS_MODE === "single_instance_memory";
  const secretConfigured = Buffer.byteLength(process.env.NEXORA_BRIDGE_HMAC_SECRET || "", "utf8") >= 32;
  const enabled = modeEnabled && secretConfigured;
  return {
    enabled,
    executor: "local_render",
    remoteLinuxAgentConnected: false,
    storage: "bounded_process_memory",
    retentionSeconds: Math.floor(DEFAULT_JOB_TTL_MS / 1000),
    nonceRetentionSeconds: Math.floor(120_000 / 1000),
    reason: enabled ? null : modeEnabled ? "hmac_secret_missing" : "single_instance_mode_not_enabled",
  };
}
app.get("/api/control/jobs", requireControlKey, (_req, res) => {
  res.set("Cache-Control", "no-store, private");
  res.json({ ...bridgeJobConfiguration(), jobs: bridgeJobState.listJobs(50) });
});
app.get("/api/control/jobs/commands", requireControlKey, (_req, res) => {
  res.set("Cache-Control", "no-store, private");
  res.json({ ...bridgeJobConfiguration(), commands: listBridgeJobCommands() });
});
app.post("/api/control/jobs", requireControlKey, async (req, res) => {
  res.set("Cache-Control", "no-store, private");
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "Same-origin request required" });
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).sort().join(",") !== "commandId,jobId") {
    return res.status(400).json({ ok: false, error: "أرسل معرّف الوظيفة ومعرّف أمر الخادم فقط." });
  }
  if (typeof body.jobId !== "string" || !/^[a-f0-9]{32}$/i.test(body.jobId) || typeof body.commandId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(body.commandId)) {
    return res.status(400).json({ ok: false, error: "معرّف الوظيفة أو الأمر غير صالح." });
  }
  if (process.env.NEXORA_BRIDGE_JOBS_MODE !== "single_instance_memory") {
    return res.status(503).json({ ok: false, configured: false, error: "Job execution is disabled until single-instance memory mode is confirmed and configured." });
  }
  const secret = process.env.NEXORA_BRIDGE_HMAC_SECRET || "";
  if (Buffer.byteLength(secret, "utf8") < 32) {
    return res.status(503).json({ ok: false, configured: false, error: "Bridge job signing is not configured." });
  }
  if (!resolveBridgeJobCommand(body.commandId)) return res.status(404).json({ ok: false, error: "Command is not on the server whitelist." });

  const job = { jobId: body.jobId, commandId: body.commandId, requestedBy: "nexora-control-center" };
  const rawBody = Buffer.from(JSON.stringify(job), "utf8");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(18).toString("base64url");
  const signature = signBridgeRequest({ secret, method: "POST", path: INTERNAL_JOB_PATH, timestamp, nonce, rawBody });
  try {
    const response = await fetch(`http://127.0.0.1:${PORT}${INTERNAL_JOB_PATH}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-nexora-timestamp": timestamp,
        "x-nexora-nonce": nonce,
        "x-nexora-signature": signature,
      },
      body: rawBody,
      signal: AbortSignal.timeout(DEFAULT_JOB_MAX_DURATION_MS + 5_000),
    });
    let result;
    try { result = await response.json(); } catch { return res.status(502).json({ ok: false, error: "Local job runner returned an invalid response." }); }
    return res.status(response.status).json(result);
  } catch {
    return res.status(503).json({ ok: false, error: "Local job runner is unavailable." });
  }
});
app.post("/api/control/manus/tasks", requireControlKey, async (req, res) => {
  res.set("Cache-Control", "no-store, private");
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "Same-origin request required" });

  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, "message")) {
    return res.status(400).json({ ok: false, error: "أرسل نص التعليمات فقط." });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MANUS_TASK_MAX_CHARS) {
    return res.status(400).json({ ok: false, error: `يجب أن تكون التعليمات غير فارغة وألا تتجاوز ${MANUS_TASK_MAX_CHARS} حرف.` });
  }
  if (!process.env.MANUS_API_KEY?.trim()) {
    return res.status(503).json({ ok: false, error: "تكامل Manus غير مهيأ على الخادم." });
  }

  try {
    const task = await createManusTask(message);
    registerOwnedManusTask(task.taskId);
    const taskReceipt = task.taskId ? issueManusTaskReceipt(task.taskId) : null;
    return res.status(201).json({ ok: true, taskId: task.taskId, taskUrl: task.taskUrl, taskReceipt });
  } catch {
    return res.status(502).json({ ok: false, error: "تعذر إرسال المهمة إلى Manus. تحقق من الإعداد ثم أعد المحاولة." });
  }
});
app.post("/api/control/manus/tasks/progress", requireControlKey, async (req, res) => {
  res.set("Cache-Control", "no-store, private");
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "Same-origin request required" });
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 2 || !Object.hasOwn(body, "taskId") || !Object.hasOwn(body, "taskReceipt")) {
    return res.status(400).json({ ok: false, error: "بيانات تتبع المهمة غير صالحة." });
  }
  const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
  if (!taskId || taskId.length > 256 || !validManusTaskReceipt(taskId, body.taskReceipt)) {
    return res.status(404).json({ ok: false, error: "المهمة غير متاحة للتتبع من هذا المركز." });
  }
  try {
    const progress = await getManusTaskProgress(taskId);
    return res.json({ ok: true, ...progress });
  } catch {
    return res.status(502).json({ ok: false, error: "تعذر قراءة حالة المهمة من Manus. أعد المحاولة لاحقًا." });
  }
});
app.post("/api/manus/webhook", async (req, res) => {
  res.set("Cache-Control", "no-store, private");
  if (req.originalUrl !== "/api/manus/webhook") return res.status(404).json({ ok: false, error: "Webhook endpoint not found" });
  if (!req.is("application/json") || !Buffer.isBuffer(req.rawBody) || req.rawBody.length > 1_000_000) return res.status(400).json({ ok: false, error: "Invalid webhook request" });

  const signature = req.get("x-webhook-signature");
  const timestamp = req.get("x-webhook-timestamp");
  if (!signature || !timestamp) return res.status(400).json({ ok: false, error: "Invalid webhook request" });
  let verification;
  try {
    verification = await verifyManusWebhook({ signature, timestamp, rawBody: req.rawBody, url: MANUS_WEBHOOK_URL });
  } catch {
    return res.status(503).json({ ok: false, error: "Webhook verification temporarily unavailable" });
  }
  if (!verification.valid) return res.status(401).json({ ok: false, error: "Webhook verification failed" });

  let event;
  try { event = JSON.parse(req.rawBody.toString("utf8")); } catch { return res.status(400).json({ ok: false, error: "Invalid webhook request" }); }
  if (!event || typeof event !== "object" || Array.isArray(event)) return res.status(400).json({ ok: false, error: "Invalid webhook request" });
  if (!["task_created", "task_stopped"].includes(event.event_type)) return res.status(200).json({ ok: true, ignored: true });

  const eventId = typeof event.event_id === "string" ? event.event_id : "";
  const taskId = typeof event.task_detail?.task_id === "string" ? event.task_detail.task_id : "";
  if (!/^[A-Za-z0-9._:-]{1,256}$/.test(eventId) || !/^[A-Za-z0-9._:-]{1,256}$/.test(taskId)) {
    return res.status(400).json({ ok: false, error: "Invalid webhook event" });
  }

  const now = Date.now();
  pruneWebhookMap(seenManusWebhookEventIds, now);
  const bodyHash = crypto.createHash("sha256").update(req.rawBody).digest("hex");
  const previousEvent = seenManusWebhookEventIds.get(eventId);
  if (previousEvent) {
    if (previousEvent.bodyHash !== bodyHash) return res.status(409).json({ ok: false, error: "Webhook event replay rejected" });
    return res.status(200).json({ ok: true, duplicate: true });
  }
  if (seenManusWebhookEventIds.size >= 10_000) seenManusWebhookEventIds.delete(seenManusWebhookEventIds.keys().next().value);
  seenManusWebhookEventIds.set(eventId, { bodyHash, expiresAt: now + MANUS_WEBHOOK_REPLAY_TTL_MS });

  if (ownedManusTasks.has(taskId)) emitManusTaskEvent(taskId, event.event_type);
  else queuePendingManusWebhook(taskId, event.event_type);
  return res.status(200).json({ ok: true });
});
app.get("/api/control/manus/tasks/:taskId/events", requireControlKey, (req, res) => {
  const taskId = req.params.taskId;
  const owner = ownedManusTasks.get(taskId);
  if (!owner || owner.expiresAt <= Date.now()) return res.status(404).json({ ok: false, error: "Task events are not available" });

  res.set({ "Cache-Control": "no-store, private", "Content-Type": "text/event-stream; charset=utf-8", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.status(200);
  res.flushHeaders?.();
  res.write(`event: ready\ndata: ${JSON.stringify({ taskId })}\n\n`);
  if (owner.latestEvent) res.write(`event: manus-task-update\ndata: ${JSON.stringify(owner.latestEvent)}\n\n`);
  const streams = manusTaskEventStreams.get(taskId) || new Set();
  streams.add(res);
  manusTaskEventStreams.set(taskId, streams);
  const heartbeat = setInterval(() => { try { res.write(": keepalive\n\n"); } catch {} }, 20_000);
  heartbeat.unref?.();
  req.on("close", () => {
    clearInterval(heartbeat);
    streams.delete(res);
    if (!streams.size) manusTaskEventStreams.delete(taskId);
  });
});
app.post("/api/control/keys", requireControlKey, (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ ok: false, error: "name is required" });
  res.status(201).json({ ok: true, key: createKey(name) });
});
app.post("/api/control/keys/:id/disable", requireControlKey, (req, res) => {
  const key = disableKey(req.params.id);
  if (!key) return res.status(404).json({ ok: false, error: "Key not found" });
  res.json({ ok: true, key });
});

// Terminal ingress: HMAC-SHA256 over `${timestamp}.${rawBody}`.
app.post("/api/terminal/heartbeat", requireHmac, (req, res) => {
  const deviceId = String(req.body?.deviceId || req.body?.id || "").trim();
  if (!deviceId) return res.status(400).json({ ok: false, error: "deviceId is required" });
  const device = upsertDevice(deviceId, { status: "online", ip: req.body?.ip || undefined, version: req.body?.version || undefined, region: req.body?.region || undefined });
  recordRequest(req.path, deviceId, "verified", req.hmac.startedAt, req.hmac.signature);
  res.json({ ok: true, device, serverTime: new Date().toISOString() });
});
app.post("/api/terminal/event", requireHmac, (req, res) => {
  const deviceId = String(req.body?.deviceId || req.body?.id || "").trim();
  const level = ["high", "medium", "low"].includes(req.body?.level) ? req.body.level : "low";
  if (!deviceId || !req.body?.type) return res.status(400).json({ ok: false, error: "deviceId and type are required" });
  recordRequest(req.path, deviceId, "verified", req.hmac.startedAt, req.hmac.signature);
  if (level !== "low") addSecurityEvent({ level, title: String(req.body.type).slice(0, 120), detail: String(req.body.message || "Terminal event").slice(0, 500), code: String(req.body.code || "TERMINAL_EVENT").slice(0, 40) });
  res.status(202).json({ ok: true, accepted: true, serverTime: new Date().toISOString() });
});

app.get("/api/render/services", requireControlKey, async (_req, res) => {
  res.set("Cache-Control", "no-store, private");
  const token = process.env.RENDER_API_KEY || "";
  if (!token) return res.status(503).json({ ok: false, configured: false, error: "Render API key is not configured" });
  try {
    res.json({ ok: true, readOnly: !getRenderPolicy().mutationsEnabled, ...(await listRenderServices({ token })) });
  } catch (error) {
    res.status(error?.upstreamStatus === 401 || error?.upstreamStatus === 403 ? 502 : 503).json({ ok: false, configured: true, error: "Unable to read Render services" });
  }
});

app.post("/api/control/render/actions", requireControlKey, async (req, res) => {
  res.set("Cache-Control", "no-store, private");
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "Same-origin request required" });
  const body = req.body;
  const allowedFields = ["action", "confirmed", "dryRun", "operationId", "serviceId"];
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !allowedFields.includes(key))) {
    return res.status(400).json({ ok: false, error: "Render action payload contains unsupported fields" });
  }
  const result = await executeRenderAction({
    token: process.env.RENDER_API_KEY || "",
    action: body.action,
    confirmed: body.confirmed === true,
    dryRun: body.dryRun === true,
    operationId: body.operationId,
    serviceId: body.serviceId,
  });
  addExecution({
    operationId: body.operationId || null,
    commandId: `render_${String(body.action || "unknown")}`,
    service: typeof body.serviceId === "string" ? body.serviceId : "unknown",
    operation: typeof body.action === "string" ? body.action : "unknown",
    status: result.ok ? result.dryRun ? "dry_run" : result.duplicate ? "duplicate" : "success" : "rejected",
    durationMs: 0,
  });
  return res.status(result.ok ? 200 : result.status || 400).json(result);
});

app.get("/api/commands", requireControlKey, (_req, res) => {
  res.set("Cache-Control", "no-store, private");
  const catalog = loadCommands();
  res.json({ configured: catalog.configured, reason: catalog.reason, source: "server-side COMMANDS_FILE whitelist", commands: catalog.commands.map(publicCommand) });
});
app.post("/api/run", requireControlKey, async (req, res) => {
  const startedAt = Date.now();
  const commandId = typeof req.body?.commandId === "string" ? req.body.commandId.slice(0, 80) : "";
  try {
    if (!commandId) return res.status(400).json({ error: "commandId is required" });
    const catalog = loadCommands();
    if (!catalog.configured || !catalog.commands.length) return res.status(503).json({ ok: false, configured: false, error: "Command catalog is not configured" });
    const command = catalog.commands.find((item) => item.id === commandId);
    if (!command) return res.status(404).json({ error: "Command not found" });
    if (command.serviceAction && req.body?.confirmedCommandId !== command.id) {
      addExecution({ commandId: command.id, title: command.title, operation: command.serviceAction.operation, service: command.serviceAction.service, status: "confirmation_required", durationMs: 0 });
      return res.status(428).json({ ok: false, confirmationRequired: true, commandId: command.id, title: command.title, serviceAction: { operation: command.serviceAction.operation, service: command.serviceAction.service } });
    }
    const args = req.body?.args;
    if (args !== undefined && (!args || typeof args !== "object" || Array.isArray(args))) return res.status(400).json({ ok: false, error: "args must be an object" });
    const safeArgs = args || {};
    const requiredInputs = new Set((command.params || []).flatMap((param) => [...param.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map((match) => match[1])));
    for (const input of requiredInputs) {
      if (!Object.prototype.hasOwnProperty.call(safeArgs, input)) return res.status(400).json({ ok: false, error: `Missing command input: ${input}` });
    }
    if (command.builtin === "runtime_info") {
      if (Object.keys(safeArgs).length) return res.status(400).json({ ok: false, error: "Built-in commands do not accept arguments" });
      const stdout = `${JSON.stringify({ node: process.version, uptimeSeconds: Math.floor(process.uptime()), service: "nexora-terminal-control" })}\n`;
      const durationMs = Date.now() - startedAt;
      addExecution({ commandId: command.id, title: command.title, operation: "builtin", service: null, status: "success", durationMs });
      return res.json({ ok: true, commandId: command.id, title: command.title, operation: "builtin", service: null, code: 0, timedOut: false, durationMs, stdout, stderr: "" });
    }
    const finalParams = (command.params || []).map((param) => typeof param === "string" ? param.replace(/\{\{(\w+)\}\}/g, (_, key) => sanitizeArg(safeArgs[key])) : "");
    const requestedTimeout = Number(command.timeoutMs || 120000);
    const timeoutMs = Number.isFinite(requestedTimeout) ? Math.max(1000, Math.min(requestedTimeout, 300000)) : 120000;
    const childEnv = { PATH: process.env.PATH || "/usr/bin:/bin", HOME: process.env.HOME || "/tmp", TMPDIR: process.env.TMPDIR || "/tmp", LANG: process.env.LANG || "C.UTF-8", ...(command.env && typeof command.env === "object" ? command.env : {}) };
    const child = spawn(command.exec, finalParams, { cwd: command.cwd || process.cwd(), env: childEnv, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = ""; let timedOut = false; let settled = false;
    const appendOutput = (current, chunk) => `${current}${chunk.toString()}`.slice(0, 16_000);
    child.stdout.on("data", (data) => { stdout = appendOutput(stdout, data); });
    child.stderr.on("data", (data) => { stderr = appendOutput(stderr, data); });
    const finish = (code, spawnError = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      const durationMs = Date.now() - startedAt;
      const status = spawnError ? "spawn_error" : timedOut ? "timeout" : code === 0 ? "success" : "failed";
      addExecution({ commandId: command.id, title: command.title, operation: command.serviceAction?.operation || "command", service: command.serviceAction?.service || null, status, exitCode: Number.isInteger(code) ? code : null, durationMs });
      if (spawnError) return res.status(500).json({ ok: false, error: "Unable to start whitelisted command" });
      return res.json({ ok: code === 0 && !timedOut, commandId: command.id, title: command.title, operation: command.serviceAction?.operation || "command", service: command.serviceAction?.service || null, code, timedOut, durationMs, stdout, stderr });
    };
    const killTimer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
    child.once("error", (error) => finish(null, error));
    child.once("close", (code) => finish(code));
  } catch (error) {
    addExecution({ commandId: commandId || "unknown", title: "أمر مرفوض", operation: "command", status: "rejected", durationMs: Date.now() - startedAt });
    res.status(400).json({ ok: false, error: String(error?.message || error) });
  }
});

function ghRequest(method, requestPath, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const request = https.request({ hostname: "api.github.com", path: requestPath, method, headers: { "User-Agent": "nexora-bridge", "Accept": "application/vnd.github+json", "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Content-Length": data ? Buffer.byteLength(data) : 0 } }, (response) => {
      let buffer = "";
      response.on("data", (chunk) => { buffer += chunk.toString(); });
      response.on("end", () => { try { const json = buffer ? JSON.parse(buffer) : {}; response.statusCode >= 200 && response.statusCode < 300 ? resolve(json) : reject(new Error(json?.message || String(response.statusCode))); } catch (error) { reject(error); } });
    });
    request.on("error", reject); if (data) request.write(data); request.end();
  });
}
function ghGetSha(owner, repo, filePath, branch, token) { return ghRequest("GET", `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`, token).then((json) => json?.sha || null); }
function ghPutContent(owner, repo, filePath, branch, token, content, message, sha) { const body = { message: message || "Update via NEXORA Bridge", content: Buffer.from(content, "utf8").toString("base64"), branch }; if (sha) body.sha = sha; return ghRequest("PUT", `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`, token, body); }
function runGit(args, cwd, options = {}) {
  return new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd: cwd || process.cwd(),
      shell: false,
      env: options.env || process.env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += data.toString(); });
    child.stderr.on("data", (data) => { stderr += data.toString(); });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}
function createGitAskPass(token) {
  const askPassPath = path.join(os.tmpdir(), `nexora-git-askpass-${crypto.randomBytes(16).toString("hex")}`);
  fs.writeFileSync(askPassPath, "#!/bin/sh\nprintf '%s\n' \"$NEXORA_GIT_TOKEN\"\n", { mode: 0o700 });
  const env = {
    ...process.env,
    GIT_ASKPASS: askPassPath,
    GIT_TERMINAL_PROMPT: "0",
    NEXORA_GIT_TOKEN: token,
  };
  return { env, cleanup: () => { try { fs.rmSync(askPassPath, { force: true }); } catch {} } };
}

app.post("/api/github/sync-commands", requireControlKey, async (_req, res) => {
  try { const owner = process.env.GITHUB_OWNER || ""; const repo = process.env.GITHUB_REPO || ""; const branch = process.env.GITHUB_BRANCH || "main"; const token = process.env.GITHUB_TOKEN || ""; const destination = process.env.GITHUB_PATH || "backend/commands.json"; if (!owner || !repo || !token) return res.status(400).json({ ok: false, error: "Missing GitHub configuration" }); const content = fs.existsSync(COMMANDS_FILE) ? fs.readFileSync(COMMANDS_FILE, "utf8") : "[]"; const sha = await ghGetSha(owner, repo, destination, branch, token).catch(() => null); const result = await ghPutContent(owner, repo, destination, branch, token, content, "Sync commands.json", sha); res.json({ ok: true, url: result?.content?.html_url || "", message: `Synced to ${owner}/${repo}:${branch}/${destination}` }); } catch (error) { res.status(400).json({ ok: false, error: String(error?.message || error) }); }
});
app.post("/api/github/create-repo", requireControlKey, async (_req, res) => {
  try { const token = process.env.GITHUB_TOKEN || ""; const repo = process.env.GITHUB_REPO || ""; const isPrivate = String(process.env.GITHUB_PRIVATE || "true") === "true"; if (!token || !repo) return res.status(400).json({ ok: false, error: "Missing GitHub token or repo" }); await ghRequest("POST", "/user/repos", token, { name: repo, private: isPrivate, auto_init: false }).catch((error) => { if (!String(error?.message || "").includes("already exists")) throw error; }); res.json({ ok: true, message: "Repository ensured" }); } catch (error) { res.status(400).json({ ok: false, error: String(error?.message || error) }); }
});
app.post("/api/github/connect", requireControlKey, async (_req, res) => {
  try {
    const token = process.env.GITHUB_TOKEN || "";
    const owner = process.env.GITHUB_OWNER || "";
    const repo = process.env.GITHUB_REPO || "";
    const branch = process.env.GITHUB_BRANCH || "main";
    const remoteName = process.env.GIT_REMOTE_NAME || "origin";
    if (!token || !owner || !repo) return res.status(400).json({ ok: false, error: "Missing GitHub configuration" });
    const url = `https://github.com/${owner}/${repo}.git`;
    await runGit(["init"]);
    await runGit(["config", "user.name", process.env.GIT_USER_NAME || "NEXORA"]);
    await runGit(["config", "user.email", process.env.GIT_USER_EMAIL || "noreply@nexora.local"]);
    const added = await runGit(["remote", "add", remoteName, url]);
    if (added.code !== 0) await runGit(["remote", "set-url", remoteName, url]);
    await runGit(["add", "-A"]);
    await runGit(["commit", "-m", "Initial commit"]);
    await runGit(["branch", "-M", branch]);
    res.json({ ok: true, message: "Connected to remote without storing the GitHub token" });
  } catch (error) { res.status(400).json({ ok: false, error: String(error?.message || error) }); }
});
app.post("/api/github/push", requireControlKey, async (_req, res) => {
  const remoteName = process.env.GIT_REMOTE_NAME || "origin";
  const branch = process.env.GIT_BRANCH || process.env.GITHUB_BRANCH || "main";
  const token = process.env.GITHUB_TOKEN || "";
  const auth = token ? createGitAskPass(token) : null;
  try {
    const result = await runGit(["push", "-u", remoteName, branch], undefined, auth ? { env: auth.env } : {});
    res.json({ ok: result.code === 0, code: result.code, stdout: result.stdout, stderr: result.stderr });
  } finally { auth?.cleanup(); }
});

if (fs.existsSync(frontendDir)) app.use(express.static(frontendDir, { index: "index.html" }));
app.get("*", (req, res, next) => { if (req.path.startsWith("/api/")) return next(); const indexPath = path.join(frontendDir, "index.html"); if (fs.existsSync(indexPath)) return res.sendFile(indexPath); res.status(404).json({ ok: false, error: "Frontend not installed" }); });

app.listen(PORT, "0.0.0.0", () => {
  startSelfHeartbeat();
  console.log(`NEXORA COMMAND · META-BOT NODE listening on :${PORT}`);
  console.log(`Commands file: ${COMMANDS_FILE}`);
});
