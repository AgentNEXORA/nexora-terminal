import crypto from "node:crypto";

const DEFAULT_INTERVAL_SECONDS = 120;
const MIN_INTERVAL_SECONDS = 30;
const MAX_INTERVAL_SECONDS = 3600;

function parseIntervalSeconds(value) {
  const parsed = Number(value || DEFAULT_INTERVAL_SECONDS);
  if (!Number.isFinite(parsed)) return DEFAULT_INTERVAL_SECONDS;
  return Math.max(MIN_INTERVAL_SECONDS, Math.min(parsed, MAX_INTERVAL_SECONDS));
}

export function startSelfHeartbeat({
  enabled = String(process.env.NEXORA_SELF_HEARTBEAT_ENABLED || "").toLowerCase() === "true",
  endpoint = process.env.NEXORA_SELF_HEARTBEAT_URL || "",
  secret = process.env.NEXORA_BRIDGE_HMAC_SECRET || "",
  keyId = process.env.NEXORA_SELF_HEARTBEAT_KEY_ID || "nexora-linux-bridge-prod",
  deviceId = process.env.NEXORA_SELF_HEARTBEAT_DEVICE_ID || "local_render",
  version = process.env.NEXORA_SELF_HEARTBEAT_VERSION || "production",
  region = process.env.RENDER_REGION || "render",
  intervalSeconds = parseIntervalSeconds(process.env.NEXORA_SELF_HEARTBEAT_INTERVAL_SECONDS),
  fetchImpl = globalThis.fetch,
  logger = console,
} = {}) {
  const url = String(endpoint).trim();
  if (!enabled) return { enabled: false, stop() {} };
  if (!url || !secret || !keyId || !deviceId || typeof fetchImpl !== "function") {
    logger.warn("NEXORA self-heartbeat disabled: incomplete configuration");
    return { enabled: false, stop() {} };
  }

  let inFlight = false;
  const send = async () => {
    if (inFlight) return;
    inFlight = true;
    const rawBody = JSON.stringify({ deviceId, version, region });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-nexora-key": keyId,
          "x-nexora-timestamp": timestamp,
          "x-nexora-signature": `sha256=${signature}`,
        },
        body: rawBody,
        signal: typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(10_000) : undefined,
        redirect: "error",
      });
      if (!response.ok) logger.warn(`NEXORA self-heartbeat rejected: HTTP ${response.status}`);
    } catch {
      logger.warn("NEXORA self-heartbeat request failed");
    } finally {
      inFlight = false;
    }
  };

  const timer = setInterval(() => { void send(); }, intervalSeconds * 1000);
  timer.unref?.();
  void send();

  return {
    enabled: true,
    intervalSeconds,
    send,
    stop() { clearInterval(timer); },
  };
}
