import crypto from "node:crypto";
import "dotenv/config";

const now = () => new Date().toISOString();
const HEARTBEAT_STALE_MS = Math.max(30, Number(process.env.HEARTBEAT_STALE_SECONDS || 300)) * 1000;

// Production telemetry starts empty. Devices appear only after a valid HMAC heartbeat.
const devices = new Map();
const requests = [];
const securityEvents = [];
const executions = [];

function loadKeys() {
  let configuredKeys = [];
  try {
    const parsed = JSON.parse(process.env.NEXORA_KEYS_JSON || "[]");
    if (Array.isArray(parsed)) configuredKeys = parsed;
  } catch {
    // Keep an empty key set when production configuration is invalid.
  }
  const bridgeSecret = process.env.NEXORA_BRIDGE_HMAC_SECRET;
  if (typeof bridgeSecret === "string" && bridgeSecret.length > 0) {
    const bridgeId = "nexora-linux-bridge-prod";
    const existingIndex = configuredKeys.findIndex((key) => key?.id === bridgeId);
    const existing = existingIndex >= 0 ? configuredKeys[existingIndex] : {};
    const bridgeKey = {
      ...existing,
      name: bridgeId,
      id: bridgeId,
      secret: bridgeSecret,
      status: "active",
      created: existing.created || now(),
      lastUsed: existing.lastUsed || null,
    };
    if (existingIndex >= 0) configuredKeys[existingIndex] = bridgeKey;
    else configuredKeys.push(bridgeKey);
  }
  if (configuredKeys.length) return configuredKeys;
  if (process.env.NODE_ENV === "production") return [];
  return [{ name: "local-demo", id: "key_demo", secret: "change-me-in-env", status: "active", created: now(), lastUsed: null }];
}
const keys = new Map(loadKeys().map((key) => [key.id, key]));

export function publicKey(key) { return { name: key.name, id: key.id, created: key.created, status: key.status, lastUsed: key.lastUsed }; }

export function listKeys() { return [...keys.values()].map(publicKey); }
export function createKey(name) {
  const id = `key_live_${crypto.randomBytes(5).toString("hex")}`;
  const secret = crypto.randomBytes(32).toString("hex");
  const key = { name: String(name || "terminal-key").slice(0, 80), id, secret, status: "active", created: now(), lastUsed: null };
  keys.set(id, key);
  return { ...publicKey(key), secret };
}
export function findKey(id) { return keys.get(id); }
export function disableKey(id) { const key = keys.get(id); if (!key) return null; key.status = "disabled"; return publicKey(key); }

export function addRequest(entry) {
  requests.unshift({ ...entry, receivedAt: now() });
  if (requests.length > 500) requests.pop();
}
export function addSecurityEvent(entry) {
  securityEvents.unshift({ ...entry, time: now() });
  if (securityEvents.length > 200) securityEvents.pop();
}
export function upsertDevice(id, patch = {}) {
  const existing = devices.get(id) || { id, name: `محطة ${id}`, type: "Terminal", region: "غير محدد", version: "unknown" };
  const updated = { ...existing, ...patch, id, lastSeen: now() };
  devices.set(id, updated);
  return updated;
}
export function listDevices() {
  const cutoff = Date.now() - HEARTBEAT_STALE_MS;
  return [...devices.values()].map((device) => ({
    ...device,
    status: Date.parse(device.lastSeen || "") >= cutoff ? "online" : "offline",
  })).sort((a, b) => a.id.localeCompare(b.id));
}
export function listRequests() { return requests.slice(0, 100); }
export function listSecurityEvents() { return securityEvents.slice(0, 100); }
export function addExecution(entry) {
  executions.unshift({ ...entry, time: now() });
  if (executions.length > 100) executions.pop();
}
export function listExecutions() { return executions.slice(0, 100); }
export function overview() {
  const all = listDevices();
  const verified = requests.filter((item) => item.status === "verified").length;
  const rejected = requests.filter((item) => item.status !== "verified").length;
  const latestHeartbeat = all.reduce((latest, device) => !latest || device.lastSeen > latest ? device.lastSeen : latest, null);
  const online = all.filter((device) => device.status === "online").length;
  return {
    devices: { total: all.length, online, warning: all.filter((device) => device.status === "warning").length, offline: all.filter((device) => device.status === "offline").length },
    requests: { total: requests.length, verified, rejected },
    security: { open: securityEvents.filter((event) => event.level === "high" || event.level === "medium").length },
    telemetry: {
      configured: [...keys.values()].some((key) => key.status === "active"),
      heartbeatReceived: all.length > 0,
      latestHeartbeat,
      staleAfterSeconds: Math.round(HEARTBEAT_STALE_MS / 1000),
    },
    generatedAt: now(),
  };
}
