const realFetch = globalThis.fetch;

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname === "api.manus.ai") {
    const key = new Headers(init.headers).get("x-manus-api-key");
    if (!key || key !== process.env.MANUS_API_KEY) return new Response(JSON.stringify({ ok: false, error: { message: "mock authentication rejected" } }), { status: 401 });

    if (url.pathname === "/v2/webhook.publicKey" && init.method === "GET") {
      const publicKey = process.env.MOCK_MANUS_WEBHOOK_PUBLIC_KEY;
      if (!publicKey) return new Response(JSON.stringify({ ok: false, error: { message: "mock key unavailable" } }), { status: 503 });
      return new Response(JSON.stringify({ ok: true, public_key: publicKey, algorithm: "RSA-SHA256" }), { status: 200, headers: { "content-type": "application/json" } });
    }

    if (url.pathname === "/v2/task.create" && init.method === "POST") {
      let requestBody;
      try { requestBody = JSON.parse(init.body || "{}"); } catch { return new Response("{}", { status: 400 }); }
      const valid = requestBody?.message?.content === "Mock-only task text"
        && Array.isArray(requestBody?.message?.connectors)
        && requestBody.message.connectors.length === 0
        && requestBody.share_visibility === "private"
        && Object.keys(requestBody).length === 2;
      if (!valid) return new Response(JSON.stringify({ ok: false, error: { message: "mock request validation failed" } }), { status: 400 });
      return new Response(JSON.stringify({ ok: true, task_id: "task_mock_route_123", task_url: "https://manus.im/app/task_mock_route_123", share_visibility: "private" }), { status: 200, headers: { "content-type": "application/json" } });
    }

    if (url.pathname === "/v2/task.listMessages" && init.method === "GET") {
      const valid = url.searchParams.get("task_id") === "task_mock_route_123"
        && url.searchParams.get("order") === "desc"
        && url.searchParams.get("limit") === "20";
      if (!valid) return new Response(JSON.stringify({ ok: false, error: { message: "mock query validation failed" } }), { status: 400 });
      return new Response(JSON.stringify({
        ok: true,
        task_id: "task_mock_route_123",
        messages: [
          { id: "event_mock_2", type: "status_update", timestamp: 1_800_000_000_000, status_update: { agent_status: "waiting", status_detail: { waiting_for_event_type: "gmailSendAction", waiting_description: "Confirmation is required in Manus." } } },
          { id: "event_mock_1", type: "assistant_message", timestamp: 1_799_999_000_000, assistant_message: { content: "Mock progress message; no API task was created." } },
        ],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }

    if (url.pathname === "/v2/task.detail" && init.method === "GET") {
      return new Response(JSON.stringify({ ok: true, task: { id: "task_mock_route_123", status: "stopped", has_running_background_jobs: true } }), { status: 200, headers: { "content-type": "application/json" } });
    }

    throw new Error("Mock blocked an unsupported Manus API request");
  }

  if (url.hostname === "127.0.0.1" || url.hostname === "localhost") return realFetch(input, init);
  throw new Error("Mock blocked all non-local external requests");
};
