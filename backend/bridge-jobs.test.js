import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import express from "express";
import {
  canonicalBridgePayload,
  createBridgeJobState,
  createInternalJobsRouter,
  parseJobClockSkewSeconds,
  signBridgeRequest,
} from "./bridge-jobs.js";

const secret = "mock-only-bridge-secret-never-used-in-production-0001";
const allowedCommand = { id: "health_check", timeoutMs: 5_000 };
const makeJob = (jobId = "a".repeat(32), commandId = "health_check", requestedBy = "nexora-control-center") => ({ jobId, commandId, requestedBy });

async function startHarness({
  state = createBridgeJobState(),
  commands = new Set(["health_check"]),
  executeCommand = async () => ({ status: "success", ok: true, code: 0, stdout: "mock-only-ok", stderr: "", durationMs: 1 }),
  now = () => Date.now(),
  maxOutputBytes = 16_384,
  maxDurationMs = 30_000,
} = {}) {
  const logs = [];
  let executions = 0;
  const app = express();
  app.use("/internal/jobs", createInternalJobsRouter({
    secretProvider: () => secret,
    state,
    resolveCommand: (commandId) => commands.has(commandId) ? { ...allowedCommand, id: commandId } : null,
    executeCommand: async (...args) => { executions += 1; return executeCommand(...args); },
    now,
    maxOutputBytes,
    maxDurationMs,
    onLog: (record) => logs.push(record),
  }));
  const server = await new Promise((resolve, reject) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    listening.once("error", reject);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const close = () => new Promise((resolve) => server.close(resolve));
  return { base, close, logs, executions: () => executions };
}

function signedHeaders(rawBody, { timestamp = String(Math.floor(Date.now() / 1000)), nonce = crypto.randomBytes(18).toString("base64url"), signatureBody = rawBody, signature = null } = {}) {
  return {
    "content-type": "application/json",
    "x-nexora-timestamp": timestamp,
    "x-nexora-nonce": nonce,
    "x-nexora-signature": signature || signBridgeRequest({ secret, timestamp, nonce, rawBody: signatureBody }),
  };
}

async function postJob(harness, body, options = {}) {
  const rawBody = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === "string" ? body : JSON.stringify(body), "utf8");
  return fetch(`${harness.base}/internal/jobs`, {
    method: "POST",
    headers: options.headers === undefined ? signedHeaders(rawBody, options) : options.headers,
    body: rawBody,
  });
}

test("canonical HMAC covers method, path, timestamp, nonce, and exact raw bytes", () => {
  const rawBody = Buffer.from('{"jobId":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}', "utf8");
  const timestamp = "1800000000";
  const nonce = "A".repeat(24);
  assert.deepEqual(canonicalBridgePayload({ timestamp, nonce, rawBody }), Buffer.concat([
    Buffer.from(`POST\n/internal/jobs\n${timestamp}\n${nonce}\n`, "utf8"), rawBody,
  ]));
  assert.throws(() => signBridgeRequest({ secret: "too-short", timestamp, nonce, rawBody }), /32 bytes/);
});

test("invalid or out-of-range job clock skew falls back to the 60-second default", () => {
  assert.equal(parseJobClockSkewSeconds(undefined), 60);
  assert.equal(parseJobClockSkewSeconds("invalid"), 60);
  assert.equal(parseJobClockSkewSeconds("0"), 60);
  assert.equal(parseJobClockSkewSeconds("301"), 60);
  assert.equal(parseJobClockSkewSeconds("300"), 300);
});

test("accepts a correctly signed allowlisted job without exposing the secret", async (t) => {
  const harness = await startHarness();
  t.after(harness.close);
  const response = await postJob(harness, makeJob());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.job.jobId, "a".repeat(32));
  assert.equal(body.job.commandId, "health_check");
  assert.equal(body.job.executor, "local_render");
  assert.equal(body.job.result.stdout, "mock-only-ok");
  assert.doesNotMatch(JSON.stringify(body), new RegExp(secret));
  assert.equal(JSON.stringify(harness.logs).includes(secret), false);
  assert.ok(harness.logs.every((record) => Object.keys(record).every((key) => ["jobId", "commandId", "executor", "status"].includes(key))));
  assert.equal(harness.executions(), 1);
});

test("rejects invalid signatures, missing headers, expired timestamps, and canonical raw-body mismatch", async (t) => {
  const nowMs = Date.now();
  const harness = await startHarness({ now: () => nowMs });
  t.after(harness.close);
  const job = makeJob();
  const raw = Buffer.from(JSON.stringify(job));

  const invalid = await postJob(harness, raw, { signature: "0".repeat(64) });
  assert.equal(invalid.status, 401);

  const missing = await postJob(harness, raw, { headers: { "content-type": "application/json" } });
  assert.equal(missing.status, 400);

  const expired = await postJob(harness, raw, { timestamp: String(Math.floor(nowMs / 1000) - 61) });
  assert.equal(expired.status, 401);

  const changed = Buffer.from(`${raw.toString("utf8")} `);
  const mismatched = await postJob(harness, changed, { signatureBody: raw });
  assert.equal(mismatched.status, 401);
  assert.equal(harness.executions(), 0);
  assert.doesNotMatch(JSON.stringify(harness.logs), /x-nexora-signature|nonce|rawBody|secret/i);
});

test("rejects replayed nonces and reuses the original result for a repeated jobId with a new nonce", async (t) => {
  const harness = await startHarness();
  t.after(harness.close);
  const job = makeJob();
  const raw = Buffer.from(JSON.stringify(job));
  const nonce = "N".repeat(24);

  const first = await postJob(harness, raw, { nonce });
  assert.equal(first.status, 200);
  const replay = await postJob(harness, raw, { nonce });
  assert.equal(replay.status, 409);

  const idempotent = await postJob(harness, raw);
  assert.equal(idempotent.status, 200);
  const idempotentBody = await idempotent.json();
  assert.equal(idempotentBody.duplicate, true);
  assert.equal(idempotentBody.job.result.stdout, "mock-only-ok");
  assert.equal(harness.executions(), 1);

  const conflictingId = await postJob(harness, makeJob("a".repeat(32), "other_command"));
  assert.equal(conflictingId.status, 409);
  assert.equal(harness.executions(), 1);
});

test("enforces exact job schema and server-side command whitelist, with no client executable or arguments", async (t) => {
  const harness = await startHarness();
  t.after(harness.close);

  const unlisted = await postJob(harness, makeJob("b".repeat(32), "arbitrary_shell"));
  assert.equal(unlisted.status, 404);
  const extra = await postJob(harness, { ...makeJob("c".repeat(32)), exec: "/bin/sh", args: ["-c", "id"], env: { SECRET: "no" } });
  assert.equal(extra.status, 400);
  assert.equal(harness.executions(), 0);
});

test("bounds output size and timeout even for a misbehaving executor", async (t) => {
  const outputHarness = await startHarness({
    maxOutputBytes: 64,
    executeCommand: async () => ({ status: "success", ok: true, stdout: "o".repeat(100), stderr: "e".repeat(100), durationMs: 2 }),
  });
  t.after(outputHarness.close);
  const outputResponse = await postJob(outputHarness, makeJob("d".repeat(32)));
  const outputBody = await outputResponse.json();
  assert.equal(outputBody.job.status, "output_limit");
  assert.equal(outputBody.job.result.outputTruncated, true);
  assert.ok(Buffer.byteLength(outputBody.job.result.stdout + outputBody.job.result.stderr, "utf8") <= 64);

  const timeoutHarness = await startHarness({
    maxDurationMs: 20,
    executeCommand: (_command, { signal }) => new Promise((resolve) => {
      signal.addEventListener("abort", () => resolve({ status: "failed", ok: false, stdout: "", stderr: "aborted" }), { once: true });
    }),
  });
  t.after(timeoutHarness.close);
  const timeoutResponse = await postJob(timeoutHarness, makeJob("e".repeat(32)));
  assert.equal(timeoutResponse.status, 504);
  const timeoutBody = await timeoutResponse.json();
  assert.equal(timeoutBody.job.status, "timeout");
  assert.equal(timeoutBody.job.result.timedOut, true);
});

test("rate limits signed requests and rejects capacity exhaustion instead of evicting live idempotency records", async (t) => {
  const rateState = createBridgeJobState({ rateLimit: 1 });
  const rateHarness = await startHarness({ state: rateState });
  t.after(rateHarness.close);
  assert.equal((await postJob(rateHarness, makeJob("f".repeat(32)))).status, 200);
  assert.equal((await postJob(rateHarness, makeJob("1".repeat(32)))).status, 429);

  const fullState = createBridgeJobState({ maxJobs: 1 });
  const fullHarness = await startHarness({ state: fullState });
  t.after(fullHarness.close);
  assert.equal((await postJob(fullHarness, makeJob("2".repeat(32)))).status, 200);
  assert.equal((await postJob(fullHarness, makeJob("3".repeat(32)))).status, 503);
  assert.equal(fullHarness.executions(), 1);
});
