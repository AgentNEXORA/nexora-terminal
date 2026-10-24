import crypto from "node:crypto";

export const MANUS_WEBHOOK_URL = "https://nexora-terminal-control.onrender.com/api/manus/webhook";
export const MANUS_WEBHOOK_PUBLIC_KEY_URL = "https://api.manus.ai/v2/webhook.publicKey";
export const MANUS_WEBHOOK_KEY_TTL_MS = 60 * 60 * 1000;
export const MANUS_WEBHOOK_TIMESTAMP_WINDOW_SECONDS = 300;

let cachedPublicKey = null;
let cachedPublicKeyExpiresAt = 0;
let pendingPublicKeyRequest = null;

export function resetManusWebhookPublicKeyCache() {
  cachedPublicKey = null;
  cachedPublicKeyExpiresAt = 0;
  pendingPublicKeyRequest = null;
}

async function fetchManusPublicKey({ apiKey, fetchImpl, now }) {
  if (cachedPublicKey && cachedPublicKeyExpiresAt > now) return cachedPublicKey;
  if (pendingPublicKeyRequest) return pendingPublicKeyRequest;

  pendingPublicKeyRequest = (async () => {
    let response;
    try {
      response = await fetchImpl(MANUS_WEBHOOK_PUBLIC_KEY_URL, {
        method: "GET",
        headers: { Accept: "application/json", "x-manus-api-key": apiKey },
        redirect: "error",
        signal: AbortSignal.timeout(5_000),
      });
      if (!response?.ok) throw new Error("Public key lookup failed");
      const data = await response.json();
      if (data?.ok !== true || data?.algorithm !== "RSA-SHA256" || typeof data.public_key !== "string") throw new Error("Public key lookup failed");
      const key = crypto.createPublicKey(data.public_key);
      const keyBits = key.asymmetricKeyDetails?.modulusLength;
      if (key.asymmetricKeyType !== "rsa" || !Number.isInteger(keyBits) || keyBits < 2048) throw new Error("Public key lookup failed");
      cachedPublicKey = key;
      cachedPublicKeyExpiresAt = now + MANUS_WEBHOOK_KEY_TTL_MS;
      return key;
    } catch {
      throw new Error("Manus webhook verification unavailable");
    } finally {
      pendingPublicKeyRequest = null;
    }
  })();

  return pendingPublicKeyRequest;
}

function validBase64Signature(signature) {
  if (typeof signature !== "string" || signature.length < 300 || signature.length > 1_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(signature)) return null;
  const decoded = Buffer.from(signature, "base64");
  if (!decoded.length || decoded.toString("base64").replace(/=+$/, "") !== signature.replace(/=+$/, "")) return null;
  return decoded;
}

export async function verifyManusWebhook({
  signature,
  timestamp,
  rawBody,
  url = MANUS_WEBHOOK_URL,
  apiKey = process.env.MANUS_API_KEY,
  fetchImpl = globalThis.fetch,
  now = Date.now(),
} = {}) {
  const keyValue = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!keyValue || typeof fetchImpl !== "function" || !Buffer.isBuffer(rawBody)) return { valid: false, reason: "invalid_request" };
  if (typeof timestamp !== "string" || !/^\d{10}$/.test(timestamp)) return { valid: false, reason: "invalid_timestamp" };
  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds) || Math.abs(Math.floor(now / 1000) - timestampSeconds) > MANUS_WEBHOOK_TIMESTAMP_WINDOW_SECONDS) return { valid: false, reason: "stale_timestamp" };
  const signatureBytes = validBase64Signature(signature);
  if (!signatureBytes) return { valid: false, reason: "invalid_signature" };

  const publicKey = await fetchManusPublicKey({ apiKey: keyValue, fetchImpl, now });
  const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const signedContent = Buffer.from(`${timestamp}.${url}.${bodyHash}`, "utf8");
  try {
    const valid = crypto.verify("RSA-SHA256", signedContent, publicKey, signatureBytes);
    return { valid, reason: valid ? null : "invalid_signature" };
  } catch {
    return { valid: false, reason: "invalid_signature" };
  }
}
