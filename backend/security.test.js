import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createManusTask, getManusTaskProgress, MANUS_TASK_CREATE_URL, MANUS_TASK_MESSAGES_URL, MANUS_TASK_DETAIL_URL } from './manus-api.js';
import { MANUS_WEBHOOK_PUBLIC_KEY_URL, MANUS_WEBHOOK_URL, resetManusWebhookPublicKeyCache, verifyManusWebhook } from './manus-webhook.js';

const adminSecret = `test-only-${'x'.repeat(48)}`;
const hmacSecret = 'local-test-hmac-secret-never-used-outside-this-test';
const bridgeSecret = 'test-only-bridge-hmac-secret-never-used-outside-this-test';
const manusTestSecret = 'test-mock-manus-key-blocked-from-network';
const mockWebhookKeyPair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const mockWebhookPublicKeyPem = mockWebhookKeyPair.publicKey.export({ type: 'spki', format: 'pem' });
function signedWebhookBody(body, timestamp = String(Math.floor(Date.now() / 1000))) {
  const rawBody = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  const digest = crypto.createHash('sha256').update(rawBody).digest('hex');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${timestamp}.${MANUS_WEBHOOK_URL}.${digest}`), mockWebhookKeyPair.privateKey).toString('base64');
  return { rawBody, timestamp, signature };
}
const actionCommandId = 'test_local_restart';
let child;
let base;
let tempDir;
let commandsFile;
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function adminCookie() {
  const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify({ secret: adminSecret }) });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie').split(';')[0];
}
before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-bridge-test-'));
  commandsFile = path.join(tempDir, 'commands.json');
  fs.writeFileSync(commandsFile, JSON.stringify([{
    id: actionCommandId,
    title: 'Local harmless test action',
    description: 'Writes fixed text; this test does not touch a service or remote host.',
    exec: process.execPath,
    params: ['-e', "process.stdout.write('whitelist-ok')"],
    timeoutMs: 3000,
    serviceAction: { operation: 'restart', service: 'test-only-no-service' },
    exampleArgs: { internalNote: 'CANARY_SECRET_SHOULD_STAY_SERVER_SIDE' },
  }, {
    id: 'test_safe_argument',
    title: 'Local argument test',
    exec: process.execPath,
    params: ['-e', 'process.stdout.write(process.argv[1] || "")', '{{value}}'],
    exampleArgs: { internalNote: 'CANARY_SECRET_SHOULD_STAY_SERVER_SIDE' },
  }, {
    id: 'runtime_info',
    title: 'Runtime information',
    builtin: 'runtime_info',
    timeoutMs: 5000,
  }]));
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('.', import.meta.url),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'production',
      CONTROL_API_KEY: adminSecret,
      COMMANDS_FILE: commandsFile,
      NEXORA_KEYS_JSON: JSON.stringify([{ name: 'test-terminal', id: 'test-key', secret: hmacSecret, status: 'active' }]),
      NEXORA_BRIDGE_HMAC_SECRET: bridgeSecret,
      NEXORA_BRIDGE_JOBS_MODE: 'single_instance_memory',
      OPENROUTER_API_KEY: '',
      OPENROUTER_MODEL: '',
      MANUS_API_KEY: manusTestSecret,
      MOCK_MANUS_WEBHOOK_PUBLIC_KEY: mockWebhookPublicKeyPem,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${new URL('./test-support/mock-manus-fetch.js', import.meta.url).href}`].filter(Boolean).join(' '),
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${base}/health`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Nexora server did not start');
});
after(() => {
  child?.kill('SIGTERM');
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
});

test('all management, command, and GitHub routes reject unauthenticated requests', async () => {
  for (const pathName of ['/api/control/overview', '/api/control/devices', '/api/control/requests', '/api/control/security', '/api/control/keys', '/api/control/executions', '/api/control/openrouter/status', '/api/control/jobs', '/api/control/jobs/commands', '/api/commands', '/api/render/services', '/api/control/manus/tasks/task_mock_route_123/events']) {
    assert.equal((await fetch(`${base}${pathName}`)).status, 401, pathName);
  }
  for (const pathName of ['/api/run', '/api/control/jobs', '/api/control/manus/tasks', '/api/control/manus/tasks/progress', '/api/github/push', '/api/github/create-repo', '/api/github/connect', '/api/github/sync-commands']) {
    assert.equal((await fetch(`${base}${pathName}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 401, pathName);
  }
});

test('login rejects cross-origin and invalid credentials, then issues a secure HttpOnly session', async () => {
  const payload = { method: 'POST', headers: { 'content-type': 'application/json', origin: `${base}` }, body: JSON.stringify({ secret: adminSecret }) };
  assert.equal((await fetch(`${base}/api/auth/login`, { ...payload, headers: { ...payload.headers, origin: 'https://evil.example' } })).status, 403);
  assert.equal((await fetch(`${base}/api/auth/login`, { ...payload, body: JSON.stringify({ secret: 'wrong' }) })).status, 401);
  const response = await fetch(`${base}/api/auth/login`, payload);
  assert.equal(response.status, 200);
  const cookieHeader = response.headers.get('set-cookie');
  assert.match(cookieHeader, /HttpOnly/);
  assert.match(cookieHeader, /SameSite=Strict/);
  assert.match(cookieHeader, /Secure/);
  const cookie = cookieHeader.split(';')[0];
  assert.deepEqual(await (await fetch(`${base}/api/auth/session`, { headers: { cookie } })).json(), { configured: true, authenticated: true });
  assert.equal((await fetch(`${base}/api/control/overview`, { headers: { cookie } })).status, 200);
});

test('command catalog exposes only the whitelist, requires explicit service confirmation, and audits local execution', async () => {
  const cookie = await adminCookie();
  const catalogResponse = await fetch(`${base}/api/commands`, { headers: { cookie } });
  assert.equal(catalogResponse.status, 200);
  const catalog = await catalogResponse.json();
  assert.equal(catalog.configured, true);
  assert.equal(catalog.commands.length, 3);
  assert.equal(catalog.commands[0].id, actionCommandId);
  assert.equal('exec' in catalog.commands[0], false);
  assert.equal('params' in catalog.commands[0], false);
  assert.equal('exampleArgs' in catalog.commands[0], false);
  assert.doesNotMatch(JSON.stringify(catalog), /CANARY_SECRET_SHOULD_STAY_SERVER_SIDE/);

  const unconfirmed = await fetch(`${base}/api/run`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ commandId: actionCommandId }) });
  assert.equal(unconfirmed.status, 428);
  assert.equal((await unconfirmed.json()).confirmationRequired, true);

  const confirmed = await fetch(`${base}/api/run`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ commandId: actionCommandId, confirmedCommandId: actionCommandId }) });
  assert.equal(confirmed.status, 200);
  const result = await confirmed.json();
  assert.equal(result.ok, true);
  assert.equal(result.stdout, 'whitelist-ok');
  assert.equal(result.operation, 'restart');

  const missingArgument = await fetch(`${base}/api/run`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ commandId: 'test_safe_argument' }) });
  assert.equal(missingArgument.status, 400);

  const safeArgument = await fetch(`${base}/api/run`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ commandId: 'test_safe_argument', args: { value: 'plain operator value' } }) });
  assert.equal(safeArgument.status, 200);
  assert.equal((await safeArgument.json()).stdout, 'plain operator value');
  const unsafeArgument = await fetch(`${base}/api/run`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ commandId: 'test_safe_argument', args: { value: '$(not-allowed)' } }) });
  assert.equal(unsafeArgument.status, 400);

  const runtimeInfo = await fetch(`${base}/api/run`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ commandId: 'runtime_info' }) });
  assert.equal(runtimeInfo.status, 200);
  const runtimeResult = await runtimeInfo.json();
  assert.equal(runtimeResult.operation, 'builtin');
  assert.match(runtimeResult.stdout, /nexora-terminal-control/);
  assert.doesNotMatch(JSON.stringify(runtimeResult), /\/usr\/bin\/node|"exec"/);

  const runtimeWithArgs = await fetch(`${base}/api/run`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ commandId: 'runtime_info', args: { value: 'unexpected' } }) });
  assert.equal(runtimeWithArgs.status, 400);

  const logResponse = await fetch(`${base}/api/control/executions`, { headers: { cookie } });
  const { executions, retention } = await logResponse.json();
  assert.match(retention, /ذاكرة/);
  const statuses = executions.map((entry) => entry.status);
  assert.ok(statuses.includes('rejected'));
  assert.ok(statuses.includes('success'));
  assert.ok(statuses.includes('confirmation_required'));
  assert.equal(executions.find((entry) => entry.service === 'test-only-no-service').status, 'success');
});

test('OpenRouter status is authenticated, reports unconfigured and untested state, and never returns a key', async () => {
  const cookie = await adminCookie();
  const response = await fetch(`${base}/api/control/openrouter/status`, { headers: { cookie } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store, private');
  const body = await response.json();
  assert.deepEqual(body, { configured: false, model: null, lastTest: { status: 'not_run', testedAt: null } });
  assert.doesNotMatch(JSON.stringify(body), /OPENROUTER_API_KEY|secret|Bearer/i);
});

test('telemetry starts empty and only a valid HMAC heartbeat creates a live device', async () => {
  const cookie = await adminCookie();
  const initial = await (await fetch(`${base}/api/control/overview`, { headers: { cookie } })).json();
  assert.equal(initial.devices.total, 0);
  assert.equal(initial.telemetry.configured, true);
  assert.equal(initial.telemetry.heartbeatReceived, false);
  assert.deepEqual((await (await fetch(`${base}/api/control/devices`, { headers: { cookie } })).json()).devices, []);

  const payload = JSON.stringify({ deviceId: 'local-test-terminal', version: 'test-only' });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto.createHmac('sha256', hmacSecret).update(`${timestamp}.${payload}`).digest('hex');
  const heartbeat = await fetch(`${base}/api/terminal/heartbeat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-nexora-key': 'test-key', 'x-nexora-timestamp': timestamp, 'x-nexora-signature': `sha256=${signature}` },
    body: payload,
  });
  assert.equal(heartbeat.status, 200);
  const after = await (await fetch(`${base}/api/control/overview`, { headers: { cookie } })).json();
  assert.equal(after.devices.total, 1);
  assert.equal(after.telemetry.heartbeatReceived, true);
  assert.equal(after.devices.online, 1);
});

test('bridge env key is merged, accepts only a valid HMAC, and never exposes its secret', async () => {
  const payload = JSON.stringify({ deviceId: 'bridge-env-test-terminal', type: 'bridge-test' });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto.createHmac('sha256', bridgeSecret).update(`${timestamp}.${payload}`).digest('hex');
  const accepted = await fetch(`${base}/api/terminal/heartbeat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-nexora-key': 'nexora-linux-bridge-prod', 'x-nexora-timestamp': timestamp, 'x-nexora-signature': `sha256=${signature}` },
    body: payload,
  });
  assert.equal(accepted.status, 200);

  const invalidSignature = crypto.createHmac('sha256', 'incorrect-bridge-secret').update(`${timestamp}.${payload}`).digest('hex');
  const rejected = await fetch(`${base}/api/terminal/event`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-nexora-key': 'nexora-linux-bridge-prod', 'x-nexora-timestamp': timestamp, 'x-nexora-signature': `sha256=${invalidSignature}` },
    body: payload,
  });
  assert.equal(rejected.status, 401);

  const cookie = await adminCookie();
  const keyResponse = await fetch(`${base}/api/control/keys`, { headers: { cookie } });
  assert.equal(keyResponse.status, 200);
  const listedKeys = (await keyResponse.json()).keys;
  assert.deepEqual(new Set(listedKeys.map((key) => key.id)), new Set(['test-key', 'nexora-linux-bridge-prod']));
  assert.equal(listedKeys.find((key) => key.id === 'nexora-linux-bridge-prod').name, 'nexora-linux-bridge-prod');
  assert.equal(JSON.stringify(listedKeys).includes(bridgeSecret), false);
});

test('Control Center submits only server-whitelisted jobs through the signed local runner', async () => {
  const cookie = await adminCookie();
  const headers = { cookie, 'content-type': 'application/json', origin: base };
  const configuration = await (await fetch(`${base}/api/control/jobs`, { headers: { cookie } })).json();
  assert.equal(configuration.enabled, true);
  assert.equal(configuration.executor, 'local_render');
  assert.equal(configuration.remoteLinuxAgentConnected, false);
  assert.equal(configuration.storage, 'bounded_process_memory');

  const catalog = await (await fetch(`${base}/api/control/jobs/commands`, { headers: { cookie } })).json();
  assert.ok(catalog.commands.some((command) => command.id === 'health_check'));
  assert.equal(catalog.remoteLinuxAgentConnected, false);

  const jobId = crypto.randomBytes(16).toString('hex');
  const submitted = await fetch(`${base}/api/control/jobs`, { method: 'POST', headers, body: JSON.stringify({ jobId, commandId: 'health_check' }) });
  assert.equal(submitted.status, 200);
  const first = await submitted.json();
  assert.equal(first.job.jobId, jobId);
  assert.equal(first.job.status, 'success');
  assert.equal(first.job.executor, 'local_render');
  const health = JSON.parse(first.job.result.stdout);
  assert.equal(health.runner, 'local_render');
  assert.equal(health.service, 'nexora-terminal-control');
  assert.doesNotMatch(JSON.stringify(first), new RegExp(bridgeSecret));

  const duplicate = await fetch(`${base}/api/control/jobs`, { method: 'POST', headers, body: JSON.stringify({ jobId, commandId: 'health_check' }) });
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).duplicate, true);

  const jobs = await (await fetch(`${base}/api/control/jobs`, { headers: { cookie } })).json();
  assert.equal(jobs.jobs[0].jobId, jobId);
  assert.doesNotMatch(JSON.stringify(jobs), new RegExp(bridgeSecret));

  const badOrigin = await fetch(`${base}/api/control/jobs`, { method: 'POST', headers: { ...headers, origin: 'https://evil.example' }, body: JSON.stringify({ jobId: crypto.randomBytes(16).toString('hex'), commandId: 'health_check' }) });
  assert.equal(badOrigin.status, 403);
  const extraFields = await fetch(`${base}/api/control/jobs`, { method: 'POST', headers, body: JSON.stringify({ jobId: crypto.randomBytes(16).toString('hex'), commandId: 'health_check', exec: '/bin/sh' }) });
  assert.equal(extraFields.status, 400);
  const unlisted = await fetch(`${base}/api/control/jobs`, { method: 'POST', headers, body: JSON.stringify({ jobId: crypto.randomBytes(16).toString('hex'), commandId: 'arbitrary_shell' }) });
  assert.equal(unlisted.status, 404);

  const noHeaders = await fetch(`${base}/internal/jobs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(noHeaders.status, 400);
});

test('Render remains read-only and does not contact upstream when its server key is absent', async () => {
  const cookie = await adminCookie();
  const response = await fetch(`${base}/api/render/services`, { headers: { cookie } });
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.equal(body, JSON.stringify({ ok: false, configured: false, error: 'Render API key is not configured' }));
  assert.doesNotMatch(body, /Authorization|Bearer/);
  const healthResponse = await fetch(`${base}/health`);
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), { ok: true, service: 'nexora-terminal-control' });
});

test('Manus create/progress routes are authenticated, text-only, receipt-scoped, and use only the local mock', async () => {
  const cookie = await adminCookie();
  const headers = { cookie, 'content-type': 'application/json', origin: base };
  const request = (body, extraHeaders = headers) => fetch(`${base}/api/control/manus/tasks`, {
    method: 'POST', headers: extraHeaders, body: JSON.stringify(body),
  });

  assert.equal((await request({ message: 'private task' }, { 'content-type': 'application/json', origin: base })).status, 401);
  for (const body of [{ message: '' }, { message: '  \n  ' }, { message: 'x'.repeat(10_001) }, { message: 'task', share_visibility: 'public' }, { message: 'task', endpoint: 'https://attacker.example' }, { message: 'task', attachments: [] }, { message: 'task', connectors: ['unapproved'] }, { message: 'task', oauth_scopes: ['all'] }]) {
    assert.equal((await request(body)).status, 400);
  }

  const response = await request({ message: 'Mock-only task text' });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store, private');
  const created = await response.json();
  assert.deepEqual({ ok: created.ok, taskId: created.taskId, taskUrl: created.taskUrl }, { ok: true, taskId: 'task_mock_route_123', taskUrl: 'https://manus.im/app/task_mock_route_123' });
  assert.equal(typeof created.taskReceipt, 'string');
  assert.doesNotMatch(JSON.stringify(created), /MANUS_API_KEY|test-mock-manus-key|secret|Bearer/i);

  const progressResponse = await fetch(`${base}/api/control/manus/tasks/progress`, { method: 'POST', headers, body: JSON.stringify({ taskId: created.taskId, taskReceipt: created.taskReceipt }) });
  assert.equal(progressResponse.status, 200);
  assert.equal(progressResponse.headers.get('cache-control'), 'no-store, private');
  const progress = await progressResponse.json();
  assert.equal(progress.agentStatus, 'waiting');
  assert.deepEqual(progress.waiting, { eventType: 'gmailSendAction', description: 'Confirmation is required in Manus.' });
  assert.ok(progress.messages.some((message) => message.content.includes('Mock progress message')));
  assert.doesNotMatch(JSON.stringify(progress), /MANUS_API_KEY|test-mock-manus-key|secret|Bearer/i);

  const unknownTask = await fetch(`${base}/api/control/manus/tasks/progress`, { method: 'POST', headers, body: JSON.stringify({ taskId: 'task_from_elsewhere', taskReceipt: created.taskReceipt }) });
  assert.equal(unknownTask.status, 404);
  const extraFields = await fetch(`${base}/api/control/manus/tasks/progress`, { method: 'POST', headers, body: JSON.stringify({ taskId: created.taskId, taskReceipt: created.taskReceipt, endpoint: 'https://attacker.example' }) });
  assert.equal(extraFields.status, 400);
});

test('Manus transport uses the fixed endpoint, server-only API-key header, text-only prompt and private visibility with a mock', async () => {
  const testKey = 'mock-only-manus-key-never-sent-to-network';
  let captured;
  const result = await createManusTask('اكتب ملخصًا تجريبيًا', {
    apiKey: testKey,
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return { ok: true, json: async () => ({ task_id: 'task_mock_123', task_url: 'https://manus.im/app/task_mock_123', share_visibility: 'public' }) };
    },
  });

  assert.equal(captured.url, MANUS_TASK_CREATE_URL);
  assert.equal(captured.options.method, 'POST');
  assert.equal(captured.options.headers['x-manus-api-key'], testKey);
  assert.deepEqual(JSON.parse(captured.options.body), {
    message: { content: 'اكتب ملخصًا تجريبيًا', connectors: [] },
    share_visibility: 'private',
  });
  assert.deepEqual(result, { taskId: 'task_mock_123', taskUrl: 'https://manus.im/app/task_mock_123' });
  assert.doesNotMatch(JSON.stringify(result), new RegExp(testKey));
});

test('Manus transport hides upstream error details and rejects unsafe returned task URLs', async () => {
  const testKey = 'mock-only-manus-key-never-sent-to-network';
  await assert.rejects(() => createManusTask('Mock-only task text', {
    apiKey: testKey,
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ error: `unauthorized ${testKey}` }) }),
  }), (error) => error.message === 'Manus task request failed' && !error.message.includes(testKey));

  const result = await createManusTask('Mock-only task text', {
    apiKey: testKey,
    fetchImpl: async () => ({ ok: true, json: async () => ({ task_id: 'task_mock_456', task_url: 'https://attacker.example/leak' }) }),
  });
  assert.deepEqual(result, { taskId: 'task_mock_456', taskUrl: null });
});

test('Manus status polling uses only task.listMessages and presents waiting as user action without confirmation calls', async () => {
  const testKey = 'mock-only-manus-key-never-sent-to-network';
  const calls = [];
  const result = await getManusTaskProgress('task_owned_mock', {
    apiKey: testKey,
    fetchImpl: async (url, options) => {
      const parsed = new URL(url);
      calls.push({ parsed, options });
      return { ok: true, json: async () => ({
        ok: true,
        task_id: 'task_owned_mock',
        messages: [
          { id: 'waiting-event', type: 'status_update', timestamp: 1_800_000_000_000, status_update: { agent_status: 'waiting', status_detail: { waiting_for_event_type: 'unlistedAction', waiting_description: 'Open the task and act in Manus.' } } },
          { id: 'result-event', type: 'assistant_message', timestamp: 1_799_999_000_000, assistant_message: { content: `Result; key=${testKey}` } },
        ],
      }) };
    },
  });
  assert.equal(result.agentStatus, 'waiting');
  assert.deepEqual(result.waiting, { eventType: 'unlistedAction', description: 'Open the task and act in Manus.' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].parsed.origin + calls[0].parsed.pathname, new URL(MANUS_TASK_MESSAGES_URL).origin + new URL(MANUS_TASK_MESSAGES_URL).pathname);
  assert.equal(calls[0].parsed.searchParams.get('task_id'), 'task_owned_mock');
  assert.equal(calls[0].parsed.searchParams.get('order'), 'desc');
  assert.equal(calls[0].parsed.searchParams.get('limit'), '20');
  assert.equal(calls[0].options.headers['x-manus-api-key'], testKey);
  assert.equal(calls.some(({ parsed }) => parsed.pathname.includes('confirmAction')), false);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(testKey));

  const running = await getManusTaskProgress('task_running_mock', {
    apiKey: testKey,
    fetchImpl: async () => ({ ok: true, json: async () => ({ ok: true, task_id: 'task_running_mock', messages: [
      { id: 'running', type: 'status_update', timestamp: 1_800_000_000_000, status_update: { agent_status: 'running', brief: 'Working in the mock.' } },
    ] }) }),
  });
  assert.equal(running.agentStatus, 'running');
  assert.equal(running.waiting, null);
});

test('stopped Manus tasks remain non-complete when background work is active or its state is omitted', async () => {
  const testKey = 'mock-only-manus-key-never-sent-to-network';
  const messagesPath = new URL(MANUS_TASK_MESSAGES_URL).pathname;
  const detailPath = new URL(MANUS_TASK_DETAIL_URL).pathname;
  for (const [backgroundValue, expected] of [[true, 'background_jobs_running'], [false, 'current_run_stopped'], [undefined, 'unknown']]) {
    const paths = [];
    const result = await getManusTaskProgress('task_stopped_mock', {
      apiKey: testKey,
      fetchImpl: async (url) => {
        const parsed = new URL(url);
        paths.push(parsed.pathname);
        if (parsed.pathname === messagesPath) return { ok: true, json: async () => ({ ok: true, task_id: 'task_stopped_mock', messages: [{ id: 'stop', type: 'status_update', timestamp: 1_800_000_000_000, status_update: { agent_status: 'stopped' } }] }) };
        const task = { id: 'task_stopped_mock', status: 'stopped' };
        if (backgroundValue !== undefined) task.has_running_background_jobs = backgroundValue;
        return { ok: true, json: async () => ({ ok: true, task }) };
      },
    });
    assert.equal(result.agentStatus, 'stopped');
    assert.equal(result.completionState, expected);
    assert.equal(result.hasRunningBackgroundJobs, backgroundValue ?? null);
    assert.deepEqual(paths, [messagesPath, detailPath]);
  }
});

test('Manus error status and messages are normalized and redact the server API key', async () => {
  const testKey = 'mock-only-manus-key-never-sent-to-network';
  const result = await getManusTaskProgress('task_error_mock', {
    apiKey: testKey,
    fetchImpl: async () => ({ ok: true, json: async () => ({ ok: true, task_id: 'task_error_mock', messages: [
      { id: 'error', type: 'error_message', timestamp: 1_800_000_000_000, error_message: { content: `Failed with ${testKey}` } },
      { id: 'status', type: 'status_update', timestamp: 1_799_999_000_000, status_update: { agent_status: 'error' } },
    ] }) }),
  });
  assert.equal(result.agentStatus, 'error');
  assert.ok(result.messages.some((message) => message.content.includes('[مخفي]')));
  assert.doesNotMatch(JSON.stringify(result), new RegExp(testKey));
});

test('Manus webhook verifier validates RSA-SHA256 against raw bytes, enforces five minutes, and caches the public key', async () => {
  resetManusWebhookPublicKeyCache();
  let fetchCount = 0;
  let captured;
  const fetchImpl = async (url, options) => {
    fetchCount++;
    captured = { url, options };
    return { ok: true, json: async () => ({ ok: true, public_key: mockWebhookPublicKeyPem, algorithm: 'RSA-SHA256' }) };
  };
  const now = Date.now();
  const rawBody = Buffer.from('{"event_id":"evt_crypto_1","event_type":"test"}');
  const timestamp = String(Math.floor(now / 1000));
  const signed = signedWebhookBody(rawBody, timestamp);
  const options = { signature: signed.signature, timestamp, rawBody, apiKey: manusTestSecret, fetchImpl, now };
  assert.deepEqual(await verifyManusWebhook(options), { valid: true, reason: null });
  assert.equal(captured.url, MANUS_WEBHOOK_PUBLIC_KEY_URL);
  assert.equal(captured.options.method, 'GET');
  assert.equal(captured.options.headers['x-manus-api-key'], manusTestSecret);
  assert.equal(fetchCount, 1);
  assert.deepEqual(await verifyManusWebhook({ ...options, now: now + 1_000 }), { valid: true, reason: null });
  assert.equal(fetchCount, 1);

  const modifiedBody = Buffer.concat([rawBody, Buffer.from(' ')]);
  assert.deepEqual(await verifyManusWebhook({ ...options, rawBody: modifiedBody }), { valid: false, reason: 'invalid_signature' });
  assert.deepEqual(await verifyManusWebhook({ ...options, signature: Buffer.alloc(256).toString('base64') }), { valid: false, reason: 'invalid_signature' });
  const staleTimestamp = String(Math.floor(now / 1000) - 301);
  const staleSigned = signedWebhookBody(rawBody, staleTimestamp);
  assert.deepEqual(await verifyManusWebhook({ ...options, timestamp: staleTimestamp, signature: staleSigned.signature }), { valid: false, reason: 'stale_timestamp' });
  assert.equal(fetchCount, 1);

  const laterNow = now + 60 * 60 * 1000 + 1;
  const laterTimestamp = String(Math.floor(laterNow / 1000));
  const laterSigned = signedWebhookBody(rawBody, laterTimestamp);
  assert.deepEqual(await verifyManusWebhook({ ...options, timestamp: laterTimestamp, signature: laterSigned.signature, now: laterNow }), { valid: true, reason: null });
  assert.equal(fetchCount, 2);
  assert.doesNotMatch(JSON.stringify(captured), /privateKey|-----BEGIN PRIVATE KEY-----/i);
  resetManusWebhookPublicKeyCache();
});

test('Manus webhook route verifies signatures, limits processing to NEXORA-owned task IDs, deduplicates and streams minimal events', async () => {
  const cookie = await adminCookie();
  const adminHeaders = { cookie };
  const created = await fetch(`${base}/api/control/manus/tasks`, {
    method: 'POST', headers: { ...adminHeaders, 'content-type': 'application/json', origin: base }, body: JSON.stringify({ message: 'Mock-only task text' }),
  });
  assert.equal(created.status, 201);
  const { taskId } = await created.json();
  const streamAbort = new AbortController();
  const streamTimer = setTimeout(() => streamAbort.abort(), 5_000);
  const stream = await fetch(`${base}/api/control/manus/tasks/${encodeURIComponent(taskId)}/events`, { headers: adminHeaders, signal: streamAbort.signal });
  assert.equal(stream.status, 200);
  const reader = stream.body.getReader();
  const decoder = new TextDecoder();
  let streamText = '';
  const readUntil = async (marker) => {
    while (!streamText.includes(marker)) {
      const { value, done } = await reader.read();
      if (done) break;
      streamText += decoder.decode(value, { stream: true });
    }
    return streamText;
  };

  const postWebhook = (signed, rawBody = signed.rawBody) => fetch(`${base}/api/manus/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-webhook-signature': signed.signature, 'x-webhook-timestamp': signed.timestamp },
    body: rawBody,
  });
  try {
    await readUntil('event: ready');
    const createdPayload = {
      event_id: 'event_nexora_created_1', event_type: 'task_created',
      task_detail: { task_id: taskId, task_title: 'CONFIDENTIAL_WEBHOOK_TITLE', task_url: 'https://manus.im/app/task_mock_route_123' },
    };
    const createdBody = JSON.stringify(createdPayload);
    const createdSigned = signedWebhookBody(createdBody);
    const createdEventResponse = await postWebhook(createdSigned);
    assert.equal(createdEventResponse.status, 200);
    assert.deepEqual(await createdEventResponse.json(), { ok: true });
    const createdStream = await readUntil('event: manus-task-update');
    const createdData = JSON.parse(createdStream.match(/event: manus-task-update\ndata: ([^\n]+)/)?.[1] || 'null');
    assert.deepEqual(createdData, { taskId, eventType: 'task_created' });
    assert.doesNotMatch(createdStream, /CONFIDENTIAL_WEBHOOK_TITLE|task_url|attachments|https:/i);

    const stoppedPayload = {
      event_id: 'event_nexora_stopped_1', event_type: 'task_stopped',
      task_detail: {
        task_id: taskId, task_title: 'CONFIDENTIAL_WEBHOOK_TITLE', task_url: 'https://manus.im/app/task_mock_route_123',
        message: 'CONFIDENTIAL_WEBHOOK_MESSAGE', attachments: [{ file_name: 'PRIVATE.pdf', url: 'https://files.example/private', size_bytes: 7 }],
        stop_reason: 'ask', question_expectation: { event_id: 'nested-question-id', options: ['private option'], response_method: 'send_message' },
      },
    };
    const stoppedSigned = signedWebhookBody(JSON.stringify(stoppedPayload));
    const stoppedResponse = await postWebhook(stoppedSigned);
    assert.equal(stoppedResponse.status, 200);
    assert.deepEqual(await stoppedResponse.json(), { ok: true });
    const stoppedStream = await readUntil('eventType":"task_stopped');
    assert.match(stoppedStream, /"taskId":"task_mock_route_123","eventType":"task_stopped"/);
    assert.doesNotMatch(stoppedStream, /CONFIDENTIAL_WEBHOOK_MESSAGE|PRIVATE\.pdf|private option|files\.example|nested-question-id/i);

    const duplicate = await postWebhook(createdSigned);
    assert.equal(duplicate.status, 200);
    assert.deepEqual(await duplicate.json(), { ok: true, duplicate: true });

    const otherTaskSigned = signedWebhookBody(JSON.stringify({ event_id: 'event_other_task_1', event_type: 'task_created', task_detail: { task_id: 'task_not_created_by_nexora' } }));
    const otherTask = await postWebhook(otherTaskSigned);
    assert.equal(otherTask.status, 200);
    const otherStream = await fetch(`${base}/api/control/manus/tasks/task_not_created_by_nexora/events`, { headers: adminHeaders });
    assert.equal(otherStream.status, 404);

    const invalidBodyPayload = { event_id: 'event_raw_mismatch_1', event_type: 'task_created', task_detail: { task_id: taskId } };
    const invalidBodySigned = signedWebhookBody(JSON.stringify(invalidBodyPayload));
    const rawMismatch = await postWebhook(invalidBodySigned, Buffer.from(`${invalidBodySigned.rawBody.toString()} `));
    assert.equal(rawMismatch.status, 401);
    const invalidSignature = await fetch(`${base}/api/manus/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-webhook-signature': Buffer.alloc(256).toString('base64'), 'x-webhook-timestamp': String(Math.floor(Date.now() / 1000)) }, body: JSON.stringify(invalidBodyPayload) });
    assert.equal(invalidSignature.status, 401);
    const expiredTimestamp = String(Math.floor(Date.now() / 1000) - 301);
    const expiredSigned = signedWebhookBody(JSON.stringify(invalidBodyPayload), expiredTimestamp);
    const expired = await postWebhook(expiredSigned);
    assert.equal(expired.status, 401);
    const malformedIdSigned = signedWebhookBody(JSON.stringify({ event_id: '', event_type: 'task_stopped', task_detail: { task_id: taskId } }));
    const malformedId = await postWebhook(malformedIdSigned);
    assert.equal(malformedId.status, 400);
    const missingSignature = await fetch(`${base}/api/manus/webhook`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(invalidBodyPayload) });
    assert.equal(missingSignature.status, 400);

    const safeBodies = [await rawMismatch.text(), await invalidSignature.text(), await expired.text(), await malformedId.text(), await missingSignature.text()];
    assert.doesNotMatch(safeBodies.join(' '), /MANUS_API_KEY|test-mock-manus-key|CONFIDENTIAL_WEBHOOK|PRIVATE\.pdf|Bearer/i);
  } finally {
    clearTimeout(streamTimer);
    await reader.cancel().catch(() => {});
  }
});
