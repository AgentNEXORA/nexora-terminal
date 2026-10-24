import test from "node:test";
import assert from "node:assert/strict";
import {
  executeRenderAction,
  getRenderPolicy,
  listRenderServices,
  publicRenderPolicy,
  resetRenderMutationStateForTests,
  validateRenderAction,
} from "./render-ops.js";

const serviceId = "srv-safe123";
const token = "render-token-never-returned-to-callers";
const baseEnv = {
  RENDER_API_KEY: token,
  RENDER_MUTATIONS_ENABLED: "1",
  RENDER_ALLOWED_SERVICE_IDS: serviceId,
  RENDER_ALLOWED_OPERATIONS: "restart,deploy,rollback",
};

test.afterEach(() => resetRenderMutationStateForTests());

test("Render policy is disabled unless the feature flag, token, service allowlist, and operation allowlist are all present", () => {
  const policy = getRenderPolicy({ RENDER_API_KEY: token });
  assert.equal(policy.mutationsEnabled, false);
  assert.deepEqual(publicRenderPolicy(policy), { readOnly: true, mutationsEnabled: false, allowedOperations: [] });
  assert.equal(getRenderPolicy(baseEnv).mutationsEnabled, true);
});

test("Render action validation requires an explicit confirmation for mutations", () => {
  assert.equal(validateRenderAction({ action: "restart", operationId: "op-12345678", serviceId, confirmed: false, dryRun: false }), "Explicit confirmation is required");
  assert.equal(validateRenderAction({ action: "restart", operationId: "op-12345678", serviceId, confirmed: false, dryRun: true }), null);
  assert.equal(validateRenderAction({ action: "shell", operationId: "op-12345678", serviceId, confirmed: true }), "Unsupported Render action");
  assert.equal(validateRenderAction({ action: "restart", operationId: "op-12345678", serviceId: "srv-other" , confirmed: true }), null);
});

test("dry-run never calls Render and returns no mutation", async () => {
  let calls = 0;
  const result = await executeRenderAction({
    token,
    env: baseEnv,
    action: "restart",
    operationId: "op-dry-run-123",
    serviceId,
    dryRun: true,
    fetchImpl: async () => { calls += 1; throw new Error("must not call upstream"); },
  });
  assert.deepEqual(result, { ok: true, dryRun: true, operationId: "op-dry-run-123", serviceId, action: "restart", mutation: "none" });
  assert.equal(calls, 0);
});

test("restart uses the official endpoint, keeps the token server-side, and is idempotent by operationId", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    return { ok: true, status: 200, json: async () => ({ message: "Service restarted", secret: token }) };
  };
  const first = await executeRenderAction({ token, env: baseEnv, action: "restart", operationId: "op-restart-123", serviceId, confirmed: true, fetchImpl });
  const second = await executeRenderAction({ token, env: baseEnv, action: "restart", operationId: "op-restart-123", serviceId, confirmed: true, fetchImpl });
  assert.equal(first.ok, true);
  assert.equal(second.duplicate, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://api.render.com/v1/services/${serviceId}/restart`);
  assert.equal(calls[0].options.method, "POST");
  assert.match(calls[0].options.headers.Authorization, /^Bearer /);
  assert.doesNotMatch(JSON.stringify(first), new RegExp(token));
  const conflict = await executeRenderAction({ token, env: baseEnv, action: "deploy", operationId: "op-restart-123", serviceId, confirmed: true, fetchImpl });
  assert.deepEqual(conflict, { ok: false, status: 409, error: "operationId was already used for a different Render action" });
});

test("deploy sends a non-destructive cache policy and blocks non-allowlisted services", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    return { ok: true, status: 202, json: async () => ({ id: "dep-safe", status: "created", trigger: "api" }) };
  };
  const blocked = await executeRenderAction({ token, env: baseEnv, action: "deploy", operationId: "op-blocked-123", serviceId: "srv-blocked", confirmed: true, fetchImpl });
  assert.deepEqual(blocked, { ok: false, status: 403, error: "Service is not allowlisted" });
  const deployed = await executeRenderAction({ token, env: baseEnv, action: "deploy", operationId: "op-deploy-123", serviceId, confirmed: true, fetchImpl });
  assert.equal(deployed.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://api.render.com/v1/services/${serviceId}/deploys`);
  assert.deepEqual(JSON.parse(calls[0].options.body), { clearCache: "do_not_clear", deployMode: "build_and_deploy" });
  assert.deepEqual(deployed.render, { id: "dep-safe", status: "created", trigger: "api", createdAt: null, updatedAt: null, startedAt: null, finishedAt: null });
});

test("service inventory exposes only safe fields and allowed operations", async () => {
  let call = 0;
  const fetchImpl = async (url) => {
    call += 1;
    if (String(url).includes("/deploys")) return { ok: true, json: async () => [{ deploy: { status: "live", createdAt: "2026-01-01T00:00:00.000Z" } }] };
    return { ok: true, json: async () => [{ cursor: null, service: { id: serviceId, name: "safe-bot", type: "web_service", suspended: "not_suspended", updatedAt: "2026-01-01T00:00:00.000Z", dashboardUrl: "https://dashboard.render.com/web/srv-safe123", serviceDetails: { url: "https://safe-bot.onrender.com", region: "frankfurt" }, secret: token } }] };
  };
  const result = await listRenderServices({ token, env: baseEnv, fetchImpl });
  assert.equal(call, 2);
  assert.equal(result.count, 1);
  assert.deepEqual(result.mutationPolicy, { readOnly: false, mutationsEnabled: true, allowedOperations: ["deploy", "restart", "rollback"] });
  assert.deepEqual(result.services[0], {
    id: serviceId,
    name: "safe-bot",
    type: "web_service",
    url: "https://safe-bot.onrender.com",
    dashboardUrl: "https://dashboard.render.com/web/srv-safe123",
    suspended: false,
    updatedAt: "2026-01-01T00:00:00.000Z",
    region: "frankfurt",
    latestDeploy: { status: "live", createdAt: "2026-01-01T00:00:00.000Z" },
    allowedOperations: ["deploy", "restart", "rollback"],
  });
  assert.doesNotMatch(JSON.stringify(result), new RegExp(token));
});
