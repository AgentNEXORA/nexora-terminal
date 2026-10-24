# NEXORA Control Center · Linux Bridge

NEXORA serves its Arabic RTL control center and protected Bridge API from the same Node.js service and origin. The existing terminal command catalog, HMAC heartbeat/event ingestion, audit views, Manus task integration, optional OpenRouter status, and read-only Render status remain in place.

## Operational boundary

- The current deployment target is the existing `nexora-terminal-control` Render service. The implementation runs its signed-job runner inside that service (`local_render`).
- No separate Linux host/agent has been configured or confirmed connected. The built-in `health_check` inspects the local Node process only; it does not execute a production shell command or claim that a remote terminal is online.
- The UI displays data returned by authenticated server endpoints. It does not seed demo devices, commands, job results, or fake connectivity. An absent command file is shown as unconfigured rather than replaced with sample data.

## Run locally

```bash
cd backend
cp .env.example .env
npm ci
npm start
```

The default port is `8787`. Set a strong `CONTROL_API_KEY` (at least 32 characters) and configure terminal HMAC keys through `NEXORA_KEYS_JSON` or the existing server-only `NEXORA_BRIDGE_HMAC_SECRET`. Never put secrets in Git or browser code.

The server-side allowlist file defaults to `backend/commands.json` (`COMMANDS_FILE`). It is intentionally not included. Create it only after reviewing every executable and fixed argument on the exact host that will run it. `commands.sample.json` is an optional template for a Linux host with the Python agent already installed at `/opt/nexora-agent/.venv/bin/python`; it calls Python directly with `shell: false`, but it is not an active Render command and must not be copied to a host where that path is absent.

## Existing command execution

- `GET /api/commands` exposes only the server allowlist's IDs, titles, descriptions, and placeholder names.
- `POST /api/run` requires an administrator session and a command ID from that allowlist. The browser cannot submit a shell string or executable.
- Commands run with `spawn(..., { shell: false })`, bounded time/output, and a minimal child environment that does not inherit control, HMAC, Render, or Manus secrets.
- Service actions are opt-in whitelist entries and require an independent confirmation in the UI. No default service commands are added.
- Execution and audit history are bounded process memory; a restart clears it.

## Signed HMAC jobs

The dashboard submits only `{ "jobId": "<32 hex chars>", "commandId": "<server allowlist id>" }` to `POST /api/control/jobs`. The authenticated server derives `requestedBy`, creates a fresh 18-byte base64url nonce and timestamp, signs the exact raw JSON bytes, and sends the signed request to `POST /internal/jobs`. The internal endpoint rejects stale timestamps, invalid signatures, reused nonces, unknown commands, and malformed bodies; it never accepts client-supplied `exec`, shell, args, or env.

The canonical message is `METHOD + "\\n" + PATH + "\\n" + TIMESTAMP + "\\n" + NONCE + "\\n" + RAW_BODY`, signed with HMAC-SHA256. The nonce and job result stores are bounded process memory: 10,000 nonces for 2 minutes and up to 1,000 job records for 24 hours. Requests are limited to 8 KiB, combined output to 16 KiB, runtime to 30 seconds, and rate to 30 requests per minute per client IP. A process restart clears replay/idempotency state; multiple instances do not share it.

`NEXORA_BRIDGE_JOBS_MODE=single_instance_memory` is an explicit opt-in and must only be used when Render is confirmed to run one instance with autoscaling off. Use a shared atomic TTL store such as Redis before enabling multiple instances or relying on durable deduplication. Extra commands are exposed to the signed-job UI only when the server-side command entry has `internalJob: true`, a fixed executable/argument list, no placeholders, and no service action. Keep the normal `/api/run` allowlist separate from the signed-job allowlist.

## Existing terminal HMAC endpoints

`POST /api/terminal/heartbeat` and `POST /api/terminal/event` retain their existing compatibility contract: `x-nexora-key`, `x-nexora-timestamp`, and `x-nexora-signature: sha256=<hex>`, signing `timestamp + "." + rawRequestBody`. When using `NEXORA_BRIDGE_HMAC_SECRET`, the key ID for these legacy endpoints is `nexora-linux-bridge-prod`. The new signed-job protocol is documented in [HMAC_INTEGRATION.md](HMAC_INTEGRATION.md); it is distinct from the legacy heartbeat/event format.

## Existing integrations and verification

The Manus task/API/webhook flows remain protected by the administrator session, keep the Manus API key on the server, request private tasks without account connectors, and never run merely by opening the page. OpenRouter displays server-reported optional status. Render status remains read-only; this change adds no Render deploy, stop, or restart endpoint.

Run tests and static checks from `backend/`:

```bash
npm test
node --check server.js
node --check bridge-jobs.js
```

The HMAC suite uses a test-only secret, local mock servers, and a mock executor. It does not connect to Render or execute production commands.
