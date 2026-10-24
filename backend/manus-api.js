export const MANUS_TASK_CREATE_URL = "https://api.manus.ai/v2/task.create";
export const MANUS_TASK_MESSAGES_URL = "https://api.manus.ai/v2/task.listMessages";
export const MANUS_TASK_DETAIL_URL = "https://api.manus.ai/v2/task.detail";
export const MANUS_TASK_MAX_CHARS = 10_000;

function safeTaskUrl(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || (parsed.hostname !== "manus.im" && !parsed.hostname.endsWith(".manus.im"))) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function safeText(value, apiKey, limit = 3_000) {
  if (typeof value !== "string") return "";
  const clipped = value.slice(0, limit);
  return apiKey ? clipped.split(apiKey).join("[مخفي]") : clipped;
}

async function requestManus(url, { method = "GET", body, apiKey, fetchImpl }) {
  try {
    const response = await fetchImpl(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        "x-manus-api-key": apiKey,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response?.ok) throw new Error("upstream error");
    const data = await response.json();
    if (!data || data.ok === false) throw new Error("upstream error");
    return data;
  } catch {
    throw new Error("Manus task request failed");
  }
}

function getCredentials({ apiKey = process.env.MANUS_API_KEY, fetchImpl = globalThis.fetch } = {}) {
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!key) throw new Error("Manus API key is not configured");
  if (typeof fetchImpl !== "function") throw new Error("Manus task request failed");
  return { apiKey: key, fetchImpl };
}

export async function createManusTask(message, options = {}) {
  const prompt = typeof message === "string" ? message.trim() : "";
  if (!prompt || prompt.length > MANUS_TASK_MAX_CHARS) throw new Error("Invalid task message");
  const credentials = getCredentials(options);
  const data = await requestManus(MANUS_TASK_CREATE_URL, {
    method: "POST",
    ...credentials,
    body: {
      message: { content: prompt, connectors: [] },
      share_visibility: "private",
    },
  });

  return {
    taskId: typeof data.task_id === "string" ? data.task_id.slice(0, 256) : null,
    taskUrl: safeTaskUrl(data.task_url),
  };
}

function normalizeMessage(event, apiKey) {
  if (!event || !["user_message", "assistant_message", "error_message", "status_update", "user_stop", "structured_output_result"].includes(event.type)) return null;
  let content = "";
  if (event.type === "user_message") content = event.user_message?.content;
  else if (event.type === "assistant_message") content = event.assistant_message?.content;
  else if (event.type === "error_message") content = event.error_message?.content;
  else if (event.type === "status_update") content = event.status_update?.brief || event.status_update?.description || event.status_update?.status_detail?.waiting_description || event.status_update?.agent_status;
  else if (event.type === "user_stop") content = "أوقف المستخدم تشغيل المهمة.";
  else if (event.type === "structured_output_result") content = event.structured_output_result?.success
    ? JSON.stringify(event.structured_output_result.value ?? null)
    : event.structured_output_result?.error || "تعذر استخراج النتيجة المنظمة.";

  const text = safeText(content, apiKey);
  if (!text) return null;
  const timestamp = Number.isFinite(event.timestamp) ? new Date(event.timestamp).toISOString() : null;
  return { type: event.type, content: text, timestamp };
}

function allowedStatus(value) {
  return ["running", "waiting", "stopped", "error"].includes(value) ? value : "unknown";
}

export async function getManusTaskProgress(taskId, options = {}) {
  if (typeof taskId !== "string" || !taskId.trim() || taskId.length > 256) throw new Error("Invalid task id");
  const credentials = getCredentials(options);
  const messagesUrl = new URL(MANUS_TASK_MESSAGES_URL);
  messagesUrl.searchParams.set("task_id", taskId);
  messagesUrl.searchParams.set("order", "desc");
  messagesUrl.searchParams.set("limit", "20");
  const data = await requestManus(messagesUrl.toString(), credentials);
  if (typeof data.task_id === "string" && data.task_id !== taskId) throw new Error("Manus task request failed");

  const rawMessages = Array.isArray(data.messages) ? data.messages.slice(0, 20) : [];
  const latestStatusEvent = rawMessages.find((event) => event?.type === "status_update" && ["running", "waiting", "stopped", "error"].includes(event?.status_update?.agent_status));
  let agentStatus = allowedStatus(latestStatusEvent?.status_update?.agent_status);
  const statusDetail = latestStatusEvent?.status_update?.status_detail;
  let hasRunningBackgroundJobs = null;
  let detailUnavailable = false;

  if (agentStatus === "stopped") {
    const detailUrl = new URL(MANUS_TASK_DETAIL_URL);
    detailUrl.searchParams.set("task_id", taskId);
    try {
      const detailResponse = await requestManus(detailUrl.toString(), credentials);
      const task = detailResponse.task;
      if (task?.id && task.id !== taskId) throw new Error("Manus task request failed");
      if (["running", "waiting", "stopped", "error"].includes(task?.status)) agentStatus = task.status;
      hasRunningBackgroundJobs = typeof task?.has_running_background_jobs === "boolean" ? task.has_running_background_jobs : null;
    } catch {
      detailUnavailable = true;
    }
  }

  let completionState = null;
  if (agentStatus === "stopped") {
    completionState = hasRunningBackgroundJobs === false
      ? "current_run_stopped"
      : hasRunningBackgroundJobs === true
        ? "background_jobs_running"
        : "unknown";
  }

  const waitingForEventType = typeof statusDetail?.waiting_for_event_type === "string"
    ? safeText(statusDetail.waiting_for_event_type, credentials.apiKey, 100)
    : null;
  const waitingDescription = typeof statusDetail?.waiting_description === "string"
    ? safeText(statusDetail.waiting_description, credentials.apiKey, 500)
    : null;

  return {
    taskId,
    agentStatus,
    completionState,
    hasRunningBackgroundJobs,
    detailUnavailable,
    waiting: agentStatus === "waiting" ? { eventType: waitingForEventType, description: waitingDescription } : null,
    messages: rawMessages.map((event) => normalizeMessage(event, credentials.apiKey)).filter(Boolean),
  };
}
