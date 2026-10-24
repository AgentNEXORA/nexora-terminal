import crypto from "node:crypto";
import express from "express";

export const INTERNAL_JOB_PATH = "/internal/jobs";
export const LOCAL_JOB_EXECUTOR = "local_render";
export const DEFAULT_JOB_MAX_OUTPUT_BYTES = 16_384;
export const DEFAULT_JOB_MAX_DURATION_MS = 30_000;
export const DEFAULT_JOB_TTL_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_NONCE_TTL_MS = 2 * 60 * 1000;
export const DEFAULT_CLOCK_SKEW_SECONDS = 60;
const JOB_ID_PATTERN = /^[a-f0-9]{32}$/i;
const COMMAND_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const REQUESTER_PATTERN = /^[A-Za-z0-9._:-]{1,80}$/;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{24}$/;
const SIGNATURE_PATTERN = /^[a-f0-9]{64}$/i;

export function parseJobClockSkewSeconds(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 300
    ? parsed
    : DEFAULT_CLOCK_SKEW_SECONDS;
}

export function canonicalBridgePayload({ method = "POST", path = INTERNAL_JOB_PATH, timestamp, nonce, rawBody }) {
  if (!Buffer.isBuffer(rawBody)) throw new TypeError("rawBody must be a Buffer");
  const prefix = Buffer.from(`${String(method).toUpperCase()}\n${path}\n${timestamp}\n${nonce}\n`, "utf8");
  return Buffer.concat([prefix, rawBody]);
}

export function signBridgeRequest({ secret, method = "POST", path = INTERNAL_JOB_PATH, timestamp, nonce, rawBody }) {
  if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("Bridge HMAC secret must contain at least 32 bytes");
  }
  return crypto.createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(canonicalBridgePayload({ method, path, timestamp, nonce, rawBody }))
    .digest("hex");
}

export function createBridgeJobState({
  now = () => Date.now(),
  nonceTtlMs = DEFAULT_NONCE_TTL_MS,
  jobTtlMs = DEFAULT_JOB_TTL_MS,
  maxNonces = 10_000,
  maxJobs = 1_000,
  rateWindowMs = 60_000,
  rateLimit = 30,
  maxRateKeys = 2_000,
} = {}) {
  const nonces = new Map();
  const jobs = new Map();
  const rates = new Map();

  function prune(map, time) {
    for (const [key, record] of map) {
      if (record.expiresAt <= time) map.delete(key);
    }
  }

  function publicJob(record, { includeResult = true } = {}) {
    const job = {
      jobId: record.jobId,
      commandId: record.commandId,
      requestedBy: record.requestedBy,
      executor: LOCAL_JOB_EXECUTOR,
      status: record.status,
      createdAt: record.createdAt,
      completedAt: record.completedAt,
      durationMs: record.durationMs,
    };
    if (includeResult && record.result) job.result = { ...record.result };
    return job;
  }

  return {
    registerNonce(nonce) {
      const time = now();
      prune(nonces, time);
      if (nonces.has(nonce)) return "replay";
      if (nonces.size >= maxNonces) return "full";
      nonces.set(nonce, { expiresAt: time + nonceTtlMs });
      return "stored";
    },
    reserveJob({ jobId, commandId, requestedBy }) {
      const time = now();
      prune(jobs, time);
      const existing = jobs.get(jobId);
      if (existing) {
        if (existing.commandId !== commandId || existing.requestedBy !== requestedBy) return { kind: "conflict" };
        return { kind: "existing", job: publicJob(existing) };
      }
      if (jobs.size >= maxJobs) return { kind: "full" };
      const record = {
        jobId,
        commandId,
        requestedBy,
        executor: LOCAL_JOB_EXECUTOR,
        status: "running",
        createdAt: new Date(time).toISOString(),
        completedAt: null,
        durationMs: null,
        result: null,
        expiresAt: time + jobTtlMs,
      };
      jobs.set(jobId, record);
      return { kind: "created", job: publicJob(record) };
    },
    finishJob(jobId, result) {
      const time = now();
      const record = jobs.get(jobId);
      if (!record) return null;
      record.status = result.status;
      record.completedAt = new Date(time).toISOString();
      record.durationMs = result.durationMs;
      record.result = {
        ok: result.ok,
        code: result.code,
        timedOut: result.timedOut,
        outputTruncated: result.outputTruncated,
        stdout: result.stdout,
        stderr: result.stderr,
      };
      record.expiresAt = time + jobTtlMs;
      return publicJob(record);
    },
    listJobs(limit = 50) {
      prune(jobs, now());
      return [...jobs.values()]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, Math.max(1, Math.min(100, Number(limit) || 50)))
        .map((record) => publicJob(record));
    },
    allowRate(key) {
      const time = now();
      prune(rates, time);
      let entry = rates.get(key);
      if (!entry) {
        if (rates.size >= maxRateKeys) return false;
        entry = { count: 0, expiresAt: time + rateWindowMs };
        rates.set(key, entry);
      }
      if (entry.count >= rateLimit) return false;
      entry.count += 1;
      return true;
    },
    get limits() {
      return { nonceTtlMs, jobTtlMs, maxNonces, maxJobs, rateWindowMs, rateLimit };
    },
  };
}

function constantTimeSignatureMatch(supplied, expected) {
  if (typeof supplied !== "string" || !SIGNATURE_PATTERN.test(supplied)) return false;
  const left = Buffer.from(supplied, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function safeString(value, maxBytes) {
  const bytes = Buffer.from(typeof value === "string" ? value : String(value ?? ""), "utf8");
  const truncated = bytes.length > maxBytes;
  const text = bytes.subarray(0, maxBytes).toString("utf8");
  return { text, truncated };
}

function normalizeResult(result, { maxOutputBytes, durationMs }) {
  const source = result && typeof result === "object" ? result : {};
  const stdout = safeString(source.stdout, maxOutputBytes);
  const stderr = safeString(source.stderr, Math.max(0, maxOutputBytes - Buffer.byteLength(stdout.text, "utf8")));
  const outputTruncated = Boolean(source.outputTruncated || source.outputLimitReached || stdout.truncated || stderr.truncated);
  const timedOut = Boolean(source.timedOut || source.status === "timeout");
  let status = ["success", "failed", "timeout", "spawn_error", "output_limit"].includes(source.status)
    ? source.status
    : source.ok === true ? "success" : "failed";
  if (timedOut) status = "timeout";
  else if (outputTruncated && status === "success") status = "output_limit";
  const ok = status === "success" && source.ok !== false;
  const code = Number.isInteger(source.code) ? source.code : null;
  const requestedDuration = Number(source.durationMs);
  const boundedDuration = Number.isFinite(requestedDuration) && requestedDuration >= 0
    ? Math.min(requestedDuration, durationMs)
    : durationMs;
  return {
    status,
    ok,
    code,
    timedOut,
    outputTruncated,
    durationMs: boundedDuration,
    stdout: stdout.text,
    stderr: stderr.text,
  };
}

function validJobBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const keys = Object.keys(body).sort();
  if (keys.join(",") !== "commandId,jobId,requestedBy") return false;
  return JOB_ID_PATTERN.test(body.jobId) && COMMAND_ID_PATTERN.test(body.commandId) && REQUESTER_PATTERN.test(body.requestedBy);
}

export function createInternalJobsRouter({
  secretProvider,
  state = createBridgeJobState(),
  resolveCommand,
  executeCommand,
  now = () => Date.now(),
  clockSkewSeconds = DEFAULT_CLOCK_SKEW_SECONDS,
  maxBodyBytes = 8_192,
  maxOutputBytes = DEFAULT_JOB_MAX_OUTPUT_BYTES,
  maxDurationMs = DEFAULT_JOB_MAX_DURATION_MS,
  onLog = () => {},
} = {}) {
  if (typeof secretProvider !== "function" || typeof resolveCommand !== "function" || typeof executeCommand !== "function") {
    throw new TypeError("secretProvider, resolveCommand, and executeCommand are required");
  }
  const router = express.Router();

  router.post("/", express.raw({ type: "application/json", limit: maxBodyBytes, inflate: false }), async (req, res) => {
    if (req.originalUrl !== INTERNAL_JOB_PATH) return res.status(404).json({ ok: false, error: "Internal jobs endpoint not found" });
    if (!req.is("application/json") || !Buffer.isBuffer(req.body)) return res.status(400).json({ ok: false, error: "Invalid signed job request" });

    const rateKey = String(req.ip || req.socket?.remoteAddress || "unknown").slice(0, 100);
    if (!state.allowRate(rateKey)) {
      onLog({ executor: LOCAL_JOB_EXECUTOR, status: "rate_limited" });
      return res.status(429).json({ ok: false, error: "Job request rate limit exceeded" });
    }

    let secret;
    try { secret = await secretProvider(); } catch { secret = ""; }
    if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32) {
      return res.status(503).json({ ok: false, error: "Bridge job signing is not configured" });
    }

    const timestamp = req.get("x-nexora-timestamp");
    const nonce = req.get("x-nexora-nonce");
    const signature = req.get("x-nexora-signature");
    if (!timestamp || !nonce || !signature) {
      onLog({ executor: LOCAL_JOB_EXECUTOR, status: "rejected" });
      return res.status(400).json({ ok: false, error: "Required signature headers are missing" });
    }
    if (!/^\d{10}$/.test(timestamp) || !NONCE_PATTERN.test(nonce)) {
      onLog({ executor: LOCAL_JOB_EXECUTOR, status: "rejected" });
      return res.status(401).json({ ok: false, error: "HMAC verification failed" });
    }
    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds) || Math.abs(now() / 1000 - timestampSeconds) > clockSkewSeconds) {
      onLog({ executor: LOCAL_JOB_EXECUTOR, status: "rejected" });
      return res.status(401).json({ ok: false, error: "HMAC verification failed" });
    }

    let expected;
    try {
      expected = signBridgeRequest({ secret, method: req.method, path: INTERNAL_JOB_PATH, timestamp, nonce, rawBody: req.body });
    } catch {
      return res.status(503).json({ ok: false, error: "Bridge job signing is not configured" });
    }
    if (!constantTimeSignatureMatch(signature, expected)) {
      onLog({ executor: LOCAL_JOB_EXECUTOR, status: "rejected" });
      return res.status(401).json({ ok: false, error: "HMAC verification failed" });
    }

    const nonceStatus = state.registerNonce(nonce);
    if (nonceStatus === "replay") {
      onLog({ executor: LOCAL_JOB_EXECUTOR, status: "replay_rejected" });
      return res.status(409).json({ ok: false, error: "Nonce replay rejected" });
    }
    if (nonceStatus !== "stored") {
      onLog({ executor: LOCAL_JOB_EXECUTOR, status: "capacity_reached" });
      return res.status(503).json({ ok: false, error: "Bridge replay store is at capacity" });
    }

    let job;
    try { job = JSON.parse(req.body.toString("utf8")); } catch {
      onLog({ executor: LOCAL_JOB_EXECUTOR, status: "rejected" });
      return res.status(400).json({ ok: false, error: "Invalid signed job request" });
    }
    if (!validJobBody(job)) {
      onLog({ executor: LOCAL_JOB_EXECUTOR, status: "rejected" });
      return res.status(400).json({ ok: false, error: "Invalid signed job request" });
    }

    const reservation = state.reserveJob(job);
    if (reservation.kind === "conflict") {
      onLog({ jobId: job.jobId, commandId: job.commandId, executor: LOCAL_JOB_EXECUTOR, status: "job_id_conflict" });
      return res.status(409).json({ ok: false, error: "Job ID is already bound to a different request" });
    }
    if (reservation.kind === "full") {
      onLog({ jobId: job.jobId, commandId: job.commandId, executor: LOCAL_JOB_EXECUTOR, status: "capacity_reached" });
      return res.status(503).json({ ok: false, error: "Bridge job store is at capacity" });
    }
    if (reservation.kind === "existing") {
      const statusCode = reservation.job.status === "running" ? 202 : 200;
      onLog({ jobId: job.jobId, commandId: job.commandId, executor: LOCAL_JOB_EXECUTOR, status: "duplicate_returned" });
      return res.status(statusCode).json({ ok: true, duplicate: true, job: reservation.job });
    }

    let command;
    try { command = await resolveCommand(job.commandId); } catch { command = null; }
    if (!command) {
      state.finishJob(job.jobId, {
        status: "rejected", ok: false, code: null, timedOut: false, outputTruncated: false,
        durationMs: 0, stdout: "", stderr: "Command is not on the server whitelist",
      });
      onLog({ jobId: job.jobId, commandId: job.commandId, executor: LOCAL_JOB_EXECUTOR, status: "rejected" });
      return res.status(404).json({ ok: false, error: "Command is not on the server whitelist" });
    }

    const startedAt = now();
    const abortController = new AbortController();
    const requestedTimeout = Number(command.timeoutMs);
    const timeoutMs = Number.isFinite(requestedTimeout) && requestedTimeout > 0
      ? Math.min(requestedTimeout, maxDurationMs)
      : Math.min(5_000, maxDurationMs);
    let timer;
    let timedOut = false;
    const timeoutPromise = new Promise((resolve) => {
      timer = setTimeout(() => {
        timedOut = true;
        abortController.abort();
        resolve({ status: "timeout", ok: false, timedOut: true, durationMs: timeoutMs, stdout: "", stderr: "Execution timed out" });
      }, timeoutMs);
      timer.unref?.();
    });
    const executionPromise = Promise.resolve()
      .then(() => executeCommand(command, { signal: abortController.signal, timeoutMs, maxOutputBytes }))
      .catch(() => ({ status: "spawn_error", ok: false, durationMs: now() - startedAt, stdout: "", stderr: "Unable to execute whitelisted job" }));
    executionPromise.catch(() => {});
    let rawResult;
    try { rawResult = await Promise.race([executionPromise, timeoutPromise]); }
    finally { clearTimeout(timer); }
    if (timedOut && rawResult?.status !== "timeout") {
      rawResult = { status: "timeout", ok: false, timedOut: true, durationMs: timeoutMs, stdout: "", stderr: "Execution timed out" };
    }
    const result = normalizeResult(rawResult, { maxOutputBytes, durationMs: Math.max(0, now() - startedAt) });
    const completedJob = state.finishJob(job.jobId, result);
    onLog({ jobId: job.jobId, commandId: job.commandId, executor: LOCAL_JOB_EXECUTOR, status: result.status });
    return res.status(result.status === "success" ? 200 : result.status === "timeout" ? 504 : result.status === "rejected" ? 404 : 200)
      .json({ ok: result.ok, duplicate: false, job: completedJob });
  });

  router.use((error, _req, res, next) => {
    if (res.headersSent) return next(error);
    if (error?.type === "entity.too.large") return res.status(413).json({ ok: false, error: "Signed job request is too large" });
    if (error?.type === "encoding.unsupported") return res.status(415).json({ ok: false, error: "Unsupported request encoding" });
    return res.status(400).json({ ok: false, error: "Invalid signed job request" });
  });

  return router;
}
