const MAX_SERVICE_PAGES = 10;
const MAX_SERVICES_PER_PAGE = 100;
const MAX_DEPLOY_LOOKUPS = 10;
const OPERATION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const SERVICE_ID_PATTERN = /^srv-[A-Za-z0-9]+$/;

export const RENDER_ACTIONS = Object.freeze({
  restart: Object.freeze({ method: "POST", path: (serviceId) => `/v1/services/${encodeURIComponent(serviceId)}/restart` }),
  deploy: Object.freeze({
    method: "POST",
    path: (serviceId) => `/v1/services/${encodeURIComponent(serviceId)}/deploys`,
    body: Object.freeze({ clearCache: "do_not_clear", deployMode: "build_and_deploy" }),
  }),
  rollback: Object.freeze({ method: "POST", path: (serviceId) => `/v1/services/${encodeURIComponent(serviceId)}/rollback` }),
});

const mutationResults = new Map();

function csv(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

export function getRenderPolicy(env = process.env) {
  const allowedServiceIds = new Set(csv(env.RENDER_ALLOWED_SERVICE_IDS).filter((id) => SERVICE_ID_PATTERN.test(id)));
  const requestedOperations = new Set(csv(env.RENDER_ALLOWED_OPERATIONS));
  const allowedOperations = new Set([...requestedOperations].filter((operation) => Object.hasOwn(RENDER_ACTIONS, operation)));
  const configured = typeof env.RENDER_API_KEY === "string" && env.RENDER_API_KEY.trim().length > 0;
  const mutationsEnabled = env.RENDER_MUTATIONS_ENABLED === "1" && configured && allowedServiceIds.size > 0 && allowedOperations.size > 0;
  return { configured, mutationsEnabled, allowedServiceIds, allowedOperations };
}

export function publicRenderPolicy(policy) {
  return {
    readOnly: !policy.mutationsEnabled,
    mutationsEnabled: policy.mutationsEnabled,
    allowedOperations: policy.mutationsEnabled ? [...policy.allowedOperations].sort() : [],
  };
}

function publicService(service, policy) {
  return {
    id: service.id,
    name: service.name,
    type: service.type,
    url: service.url,
    dashboardUrl: service.dashboardUrl,
    suspended: service.suspended,
    updatedAt: service.updatedAt,
    region: service.region,
    latestDeploy: service.latestDeploy || null,
    allowedOperations: policy.mutationsEnabled && policy.allowedServiceIds.has(service.id) ? [...policy.allowedOperations].sort() : [],
  };
}

function renderUrl(pathname) {
  return new URL(pathname, "https://api.render.com").toString();
}

async function jsonOrNull(response) {
  try { return await response.json(); } catch { return null; }
}

function upstreamError(response) {
  const error = new Error("Render API request failed");
  error.upstreamStatus = response.status;
  return error;
}

async function renderFetch({ token, pathname, method = "GET", body, fetchImpl = fetch }) {
  const options = {
    method,
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(12_000),
    redirect: "error",
  };
  if (body !== undefined) {
    options.headers["content-type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const response = await fetchImpl(renderUrl(pathname), options);
  if (!response.ok) throw upstreamError(response);
  return response;
}

function safeOperationResult(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return {
    id: typeof body.id === "string" ? body.id : null,
    status: typeof body.status === "string" ? body.status : null,
    trigger: typeof body.trigger === "string" ? body.trigger : null,
    createdAt: body.createdAt || null,
    updatedAt: body.updatedAt || null,
    startedAt: body.startedAt || null,
    finishedAt: body.finishedAt || null,
  };
}

export async function listRenderServices({ token, env = process.env, fetchImpl = fetch } = {}) {
  if (!token || typeof token !== "string") throw new Error("Render API key is not configured");
  const policy = getRenderPolicy({ ...env, RENDER_API_KEY: token });
  const items = [];
  let cursor;
  for (let page = 0; page < MAX_SERVICE_PAGES; page += 1) {
    const url = new URL("/v1/services", "https://api.render.com");
    url.searchParams.set("limit", String(MAX_SERVICES_PER_PAGE));
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(12_000),
      redirect: "error",
    });
    if (!response.ok) throw upstreamError(response);
    const pageData = await response.json();
    if (!Array.isArray(pageData)) throw new Error("Unexpected Render response");
    for (const entry of pageData) {
      const service = entry?.service;
      if (!service || typeof service.id !== "string") continue;
      items.push({
        id: service.id,
        name: String(service.name || "Unknown"),
        type: String(service.type || "unknown"),
        url: typeof service.serviceDetails?.url === "string" ? service.serviceDetails.url : null,
        dashboardUrl: typeof service.dashboardUrl === "string" ? service.dashboardUrl : null,
        suspended: service.suspended === "suspended",
        updatedAt: service.updatedAt || null,
        region: service.serviceDetails?.region || null,
      });
    }
    cursor = pageData.at(-1)?.cursor;
    if (!cursor || pageData.length === 0) break;
  }
  for (let offset = 0; offset < items.length; offset += MAX_DEPLOY_LOOKUPS) {
    await Promise.all(items.slice(offset, offset + MAX_DEPLOY_LOOKUPS).map(async (service) => {
      try {
        const response = await fetchImpl(new URL(`/v1/services/${encodeURIComponent(service.id)}/deploys?limit=1`, "https://api.render.com"), {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10_000),
          redirect: "error",
        });
        if (!response.ok) return;
        const entries = await response.json();
        const deploy = Array.isArray(entries) ? entries[0]?.deploy : null;
        if (deploy) service.latestDeploy = { status: String(deploy.status || "unknown"), createdAt: deploy.createdAt || null };
      } catch { /* Per-service deploy status is optional. */ }
    }));
  }
  return {
    fetchedAt: new Date().toISOString(),
    count: items.length,
    services: items.map((service) => publicService(service, policy)),
    mutationPolicy: publicRenderPolicy(policy),
  };
}

export function validateRenderAction({ action, operationId, serviceId, confirmed = false, dryRun = false }) {
  if (!Object.hasOwn(RENDER_ACTIONS, action)) return "Unsupported Render action";
  if (typeof operationId !== "string" || !OPERATION_ID_PATTERN.test(operationId)) return "Invalid operationId";
  if (typeof serviceId !== "string" || !SERVICE_ID_PATTERN.test(serviceId)) return "Invalid serviceId";
  if (typeof confirmed !== "boolean" || typeof dryRun !== "boolean") return "Invalid confirmation flags";
  if (!dryRun && confirmed !== true) return "Explicit confirmation is required";
  return null;
}

export async function executeRenderAction({ token, env = process.env, action, operationId, serviceId, confirmed = false, dryRun = false, fetchImpl = fetch } = {}) {
  const validationError = validateRenderAction({ action, operationId, serviceId, confirmed, dryRun });
  if (validationError) return { ok: false, status: 400, error: validationError };
  const policy = getRenderPolicy({ ...env, RENDER_API_KEY: token });
  if (!policy.allowedServiceIds.has(serviceId)) return { ok: false, status: 403, error: "Service is not allowlisted" };
  if (!policy.allowedOperations.has(action)) return { ok: false, status: 403, error: "Render action is not allowlisted" };
  if (dryRun) return { ok: true, dryRun: true, operationId, serviceId, action, mutation: "none" };
  if (!token || typeof token !== "string") return { ok: false, status: 503, error: "Render API key is not configured" };
  if (!policy.mutationsEnabled) return { ok: false, status: 503, error: "Render mutations are disabled" };
  const previous = mutationResults.get(operationId);
  if (previous) {
    if (previous.serviceId !== serviceId || previous.mutation !== action) return { ok: false, status: 409, error: "operationId was already used for a different Render action" };
    return { ...previous, duplicate: true };
  }
  try {
    const spec = RENDER_ACTIONS[action];
    const response = await renderFetch({ token, pathname: spec.path(serviceId), method: spec.method, body: spec.body, fetchImpl });
    const result = {
      ok: true,
      dryRun: false,
      mutation: action,
      operationId,
      serviceId,
      acceptedAt: new Date().toISOString(),
      render: safeOperationResult(await jsonOrNull(response)),
    };
    mutationResults.set(operationId, result);
    if (mutationResults.size > 500) mutationResults.delete(mutationResults.keys().next().value);
    return result;
  } catch (error) {
    return { ok: false, status: error.upstreamStatus === 401 || error.upstreamStatus === 403 ? 502 : 503, error: "Render operation failed" };
  }
}

export function resetRenderMutationStateForTests() {
  mutationResults.clear();
}
