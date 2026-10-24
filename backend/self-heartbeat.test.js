import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { startSelfHeartbeat } from "./self-heartbeat.js";

test("self-heartbeat stays disabled unless explicitly enabled", () => {
  let calls = 0;
  const state = startSelfHeartbeat({
    enabled: false,
    endpoint: "https://example.invalid/api/terminal/heartbeat",
    secret: "local-test-secret",
    fetchImpl: async () => { calls += 1; return { ok: true }; },
  });
  assert.equal(state.enabled, false);
  assert.equal(calls, 0);
});

test("self-heartbeat signs and sends the exact raw JSON body", async () => {
  const secret = "local-test-secret-for-heartbeat";
  let request;
  const state = startSelfHeartbeat({
    enabled: true,
    endpoint: "https://example.test/api/terminal/heartbeat",
    secret,
    keyId: "nexora-linux-bridge-prod",
    deviceId: "local_render",
    version: "production",
    region: "render",
    intervalSeconds: 120,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true };
    },
    logger: { warn() {} },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  state.stop();

  assert.equal(request.url, "https://example.test/api/terminal/heartbeat");
  const timestamp = request.options.headers["x-nexora-timestamp"];
  const signature = request.options.headers["x-nexora-signature"].replace(/^sha256=/, "");
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${request.options.body}`, "utf8").digest("hex");
  assert.match(request.options.body, /^\{"deviceId":"local_render","version":"production","region":"render"\}$/);
  assert.equal(signature, expected);
  assert.equal(signature.length, 64);
});
