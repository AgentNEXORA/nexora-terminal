const icon = (name, size = 19) => {
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 1v4M15 1v4M9 19v4M15 19v-4M1 9h4M1 15h4M19 9h4M19 15h-4"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    shield: '<path d="M12 3 20 6v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z"/><path d="m8 12 2.5 2.5L16 9"/>',
    settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.2a2 2 0 0 1-4 0v-.2a2 2 0 0 0-3.4-1.4l-.1.1A2 2 0 0 1 3 15.1l.1-.1A2 2 0 0 0 1.7 11.6h-.2a2 2 0 0 1 0-4h.2A2 2 0 0 0 3.1 4.2L3 4.1A2 2 0 0 1 5.8 1.3l.1.1a2 2 0 0 0 3.4-1.4v-.2a2 2 0 0 1 4 0V0a2 2 0 0 0 3.4 1.4l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a2 2 0 0 0 1.4 3.4h.2a2 2 0 0 1 0 4h-.2a2 2 0 0 0-1.4 3.4Z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    refresh: '<path d="M20 11a8.1 8.1 0 0 0-14.9-3L3 11"/><path d="M3 5v6h6M4 13a8.1 8.1 0 0 0 14.9 3L21 13"/><path d="M21 19v-6h-6"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8m-2 0 2 2m-5 1 2 2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    alert: '<path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    terminal: '<path d="m4 7 5 5-5 5M12 17h8"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    play: '<path d="m8 5 12 7-12 7V5Z"/>',
    stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  };
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
};

const app = document.querySelector('#app');
const navItems = [
  { id: 'dashboard', label: 'المركز التشغيلي', icon: 'grid', group: 'العمليات' },
  { id: 'commands', label: 'كتالوج الأوامر', icon: 'terminal', group: 'العمليات' },
  { id: 'jobs', label: 'مهام HMAC الموقّعة', icon: 'shield', group: 'العمليات' },
  { id: 'devices', label: 'البوتات والطبقات', icon: 'layers', group: 'العمليات' },
  { id: 'executions', label: 'سجل التنفيذ', icon: 'activity', group: 'السجلات' },
  { id: 'requests', label: 'طلبات HMAC', icon: 'shield', group: 'السجلات' },
  { id: 'security', label: 'أحداث الأمان', icon: 'alert', group: 'السجلات' },
  { id: 'render', label: 'خدمات Render', icon: 'activity', group: 'الإدارة' },
  { id: 'manus', label: 'مهام Manus', icon: 'play', group: 'الإدارة' },
  { id: 'integration', label: 'اتصال الجسر', icon: 'link', group: 'الإدارة' },
  { id: 'settings', label: 'الإعدادات والمفاتيح', icon: 'settings', group: 'الإدارة' },
];
const statusLabel = { online: 'متصل', warning: 'تحذير', offline: 'غير متصل', verified: 'موثّق', rejected: 'مرفوض', expired: 'منتهي' };
const actionLabel = { start: 'تشغيل', stop: 'إيقاف', restart: 'إعادة تشغيل', command: 'أمر مسموح' };
const renderActionLabel = { restart: 'إعادة تشغيل', deploy: 'نشر', rollback: 'Rollback' };
const executionLabel = { success: 'نجح', failed: 'فشل', timeout: 'انتهت المهلة', spawn_error: 'تعذر البدء', rejected: 'مرفوض', confirmation_required: 'ينتظر التأكيد' };
function readLastManusTask() {
  try {
    const saved = JSON.parse(sessionStorage.getItem('nexora-last-manus-task') || 'null');
    return saved && typeof saved.taskId === 'string' && typeof saved.taskReceipt === 'string' ? saved : null;
  } catch { return null; }
}
const state = {
  section: 'dashboard', menuOpen: false, modal: null, toast: '', search: '', deviceFilter: 'all', requestFilter: 'all', securityFilter: 'all',
  live: false, liveError: '', lastSync: '', overview: null, stations: [], requests: [], securityEvents: [], keys: [], executions: [],
  commandsConfigured: false, commandsReason: 'missing', commands: [], selectedCommandId: '', commandError: '', commandResult: null, executionStatus: 'idle', executing: false,
  bridgeJobConfig: null, bridgeJobError: '', bridgeJobs: [], jobCommands: [], selectedJobCommandId: 'health_check', jobBusy: false, bridgeJobResult: null,
  renderServices: [], renderError: '', renderFetchedAt: '', renderPolicy: null, renderActionBusy: '', renderActionResult: null, openRouterStatus: null, openRouterError: '',
  manusPrompt: '', manusTaskBusy: false, manusTaskError: '', manusTaskResult: readLastManusTask(),
  manusProgressBusy: false, manusProgressError: '', manusTaskProgress: null,
};
let manusEventSource = null;
let manusEventSourceTaskId = '';
let manusAutoRefreshPending = false;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}
function relativeTime(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'غير متاح';
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
}
function fmtDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'غير متاح';
  return new Date(value).toLocaleString('ar-JO', { dateStyle: 'medium', timeStyle: 'short' });
}
async function apiRequest(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
  let body = {};
  try { body = await response.json(); } catch { /* non-JSON response */ }
  if (!response.ok) {
    const error = new Error(body.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}
function statusPill(status, text) {
  const valid = ['online', 'warning', 'offline', 'verified', 'rejected', 'expired', 'success', 'failed', 'active', 'disabled'].includes(status) ? status : 'offline';
  return `<span class="status-pill ${valid}"><span class="status-dot"></span>${escapeHtml(text || statusLabel[status] || status)}</span>`;
}
function button(label, cls = 'button secondary', action = '', iconName = '') {
  return `<button type="button" class="${cls}" data-action="${escapeHtml(action)}">${iconName ? icon(iconName, 16) : ''}<span>${escapeHtml(label)}</span></button>`;
}
function sectionTitle(kicker, title, description, actions = '') {
  return `<div class="page-heading"><div><div class="eyebrow">${escapeHtml(kicker)}</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div><div class="heading-actions">${actions}</div></div>`;
}
function commandCatalogStatus() {
  if (state.commandError) return { cls: 'warning', text: 'مصدر الأوامر غير متاح' };
  if (!state.commandsConfigured && state.commandsReason === 'invalid') return { cls: 'warning', text: 'قائمة الخادم غير صالحة' };
  if (!state.commandsConfigured) return { cls: 'warning', text: 'كتالوج الأوامر غير مهيأ' };
  if (!state.commands.length) return { cls: 'warning', text: 'الكتالوج فارغ' };
  return { cls: 'online', text: `${state.commands.length} أمرًا مسموحًا على الخادم` };
}
function bridgeStatus() {
  const telemetry = state.overview?.telemetry;
  if (!state.live || !telemetry) return { cls: 'warning', text: 'حالة الجسر غير متاحة' };
  if (!telemetry.configured) return { cls: 'warning', text: 'مفاتيح الجسر غير مهيأة' };
  if (!telemetry.heartbeatReceived) return { cls: 'warning', text: 'بانتظار أول نبض من الجسر' };
  return state.overview.devices?.online
    ? { cls: 'online', text: `${state.overview.devices.online} محطة تتصل حاليًا` }
    : { cls: 'warning', text: 'لا توجد محطة بنبض حديث' };
}
function bridgeJobStatusText() {
  const config = state.bridgeJobConfig;
  if (!config) return state.bridgeJobError ? 'حالة مشغّل HMAC غير متاحة' : 'بانتظار حالة مشغّل HMAC';
  if (config.enabled) return 'مشغّل HMAC محلي مفعّل';
  if (config.reason === 'hmac_secret_missing') return 'سر HMAC غير مهيأ';
  return 'مشغّل HMAC المحلي غير مفعّل';
}
function bridgeJobExplanation() {
  const config = state.bridgeJobConfig;
  if (config?.enabled) return 'حالة التنفيذ والتوقيع تظهر في سجل المهام.';
  if (config?.reason === 'hmac_secret_missing') return 'يلزم سر HMAC صالح على الخادم قبل قبول أي مهمة.';
  if (!config && state.bridgeJobError) return 'تعذر قراءة الإعدادات المحمية للمشغّل.';
  return 'يتطلب التفعيل تأكيد تشغيل نسخة واحدة ووضع التخزين الذاكري المحدود.';
}
async function loadLiveData() {
  const [overview, devices, requests, security, keys, executions, commandCatalog, openRouter, bridgeJobs, jobCatalog] = await Promise.allSettled([
    apiRequest('/api/control/overview'), apiRequest('/api/control/devices'), apiRequest('/api/control/requests'),
    apiRequest('/api/control/security'), apiRequest('/api/control/keys'), apiRequest('/api/control/executions'), apiRequest('/api/commands'), apiRequest('/api/control/openrouter/status'),
    apiRequest('/api/control/jobs'), apiRequest('/api/control/jobs/commands'),
  ]);
  state.live = overview.status === 'fulfilled';
  state.liveError = overview.status === 'rejected' ? overview.reason.message : '';
  state.overview = overview.status === 'fulfilled' ? overview.value : null;
  state.stations = devices.status === 'fulfilled' && Array.isArray(devices.value.devices) ? devices.value.devices : [];
  state.requests = requests.status === 'fulfilled' && Array.isArray(requests.value.requests) ? requests.value.requests : [];
  state.securityEvents = security.status === 'fulfilled' && Array.isArray(security.value.events) ? security.value.events : [];
  state.keys = keys.status === 'fulfilled' && Array.isArray(keys.value.keys) ? keys.value.keys : [];
  state.executions = executions.status === 'fulfilled' && Array.isArray(executions.value.executions) ? executions.value.executions : [];
  if (commandCatalog.status === 'fulfilled') {
    state.commandsConfigured = Boolean(commandCatalog.value.configured);
    state.commandsReason = commandCatalog.value.reason || 'missing';
    state.commands = Array.isArray(commandCatalog.value.commands) ? commandCatalog.value.commands : [];
    state.commandError = '';
    if (!state.commands.some((command) => command.id === state.selectedCommandId)) state.selectedCommandId = state.commands[0]?.id || '';
  } else {
    state.commandsConfigured = false;
    state.commandsReason = 'unavailable';
    state.commands = [];
    state.commandError = commandCatalog.reason.message;
  }
  state.openRouterStatus = openRouter.status === 'fulfilled' ? openRouter.value : null;
  state.openRouterError = openRouter.status === 'rejected' ? openRouter.reason.message : '';
  state.bridgeJobConfig = bridgeJobs.status === 'fulfilled' ? bridgeJobs.value : null;
  state.bridgeJobError = bridgeJobs.status === 'rejected' ? bridgeJobs.reason.message : '';
  state.bridgeJobs = bridgeJobs.status === 'fulfilled' && Array.isArray(bridgeJobs.value.jobs) ? bridgeJobs.value.jobs : [];
  state.jobCommands = jobCatalog.status === 'fulfilled' && Array.isArray(jobCatalog.value.commands) ? jobCatalog.value.commands : [];
  if (!state.jobCommands.some((command) => command.id === state.selectedJobCommandId)) state.selectedJobCommandId = state.jobCommands[0]?.id || '';
  state.lastSync = state.live ? new Date().toISOString() : '';
  render();
}
async function loadRenderServices() {
  state.renderError = '';
  render();
  try {
    const response = await apiRequest('/api/render/services');
    state.renderServices = Array.isArray(response.services) ? response.services : [];
    state.renderFetchedAt = response.fetchedAt || '';
    state.renderPolicy = response.mutationPolicy || null;
  } catch (error) {
    state.renderPolicy = null;
    state.renderError = error.status === 503 && error.body?.configured === false ? 'مفتاح Render غير مهيأ على الخادم.' : 'تعذرت قراءة خدمات Render من المصدر.';
  }
  render();
}
async function bootstrap() {
  try {
    const session = await apiRequest('/api/auth/session');
    if (!session.configured) {
      app.innerHTML = '<div class="nexora-login" dir="rtl"><div class="nexora-login-card"><h1>الإدارة غير مهيأة</h1><p>يجب ضبط CONTROL_API_KEY في أسرار خدمة الخادم (32 محرفًا على الأقل).</p></div></div>';
      return;
    }
    if (!session.authenticated) return renderLogin();
    render();
    loadLiveData();
  } catch {
    app.innerHTML = '<div class="nexora-login" dir="rtl"><div class="nexora-login-card"><h1>تعذر الاتصال بالخادم</h1><p>تحقق من اتصال الشبكة ثم أعد تحميل الصفحة.</p></div></div>';
  }
}
function renderLogin() {
  app.innerHTML = `<div class="nexora-login" dir="rtl"><form id="nexora-login-form" class="nexora-login-card"><div class="eyebrow">NEXORA COMMAND · دخول محمي</div><h1>مركز التشغيل</h1><p>أدخل مفتاح الإدارة. يُستخدم لإنشاء جلسة HttpOnly ولا يُحفظ في الواجهة.</p><label for="nexora-admin-secret">مفتاح الإدارة</label><input id="nexora-admin-secret" type="password" autocomplete="current-password" required minlength="32" /><button class="button primary" type="submit">دخول آمن</button><div id="nexora-login-error" role="alert"></div></form></div>`;
  document.querySelector('#nexora-login-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.querySelector('#nexora-admin-secret');
    const error = document.querySelector('#nexora-login-error');
    const submit = event.currentTarget.querySelector('button');
    submit.disabled = true;
    try {
      await apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ secret: input.value }) });
      input.value = '';
      await bootstrap();
    } catch (err) { error.textContent = err.message; submit.disabled = false; }
  });
}
function renderNav() {
  let group = '';
  return navItems.map((item) => {
    const title = item.group !== group ? `<div class="nav-group-label">${escapeHtml(item.group)}</div>` : '';
    group = item.group;
    return `${title}<button class="nav-item ${state.section === item.id ? 'active' : ''}" data-section="${item.id}" title="${escapeHtml(item.label)}">${icon(item.icon)}<span>${escapeHtml(item.label)}</span></button>`;
  }).join('');
}
function renderShell(content) {
  const bridge = bridgeStatus();
  const dockIds = ['dashboard', 'commands', 'devices', 'executions'];
  return `<div class="shell ${state.menuOpen ? 'menu-open' : ''}">
    <aside class="sidebar"><div class="brand"><div class="brand-mark"><i></i><i></i></div><div><strong>NEXORA COMMAND</strong><small>LINUX BRIDGE · CONTROL</small></div></div>
      <div class="workspace-card"><span class="workspace-dot ${bridge.cls}"></span><div><small>اتصال الجسر</small><strong>${escapeHtml(bridge.text)}</strong></div>${icon('activity', 16)}</div>
      <nav class="main-nav">${renderNav()}</nav>
      <div class="sidebar-footer"><div class="uptime-line"><span class="status-dot ${bridge.cls}"></span><span>${escapeHtml(bridge.text)}</span><strong>${state.lastSync ? escapeHtml(relativeTime(state.lastSync)) : '—'}</strong></div><div class="profile"><div class="avatar">N</div><div><strong>جلسة مدير</strong><small>مصادقة الخادم</small></div>${icon('shield', 16)}</div></div>
    </aside><div class="sidebar-backdrop" data-action="close-menu"></div>
    <main class="main-content"><header class="topbar"><button class="mobile-menu" data-action="toggle-menu" aria-label="فتح القائمة">${icon('grid')}</button><div class="breadcrumb"><span>NEXORA</span><b>/</b><strong>${escapeHtml(navItems.find((item) => item.id === state.section)?.label || 'المركز التشغيلي')}</strong></div><div class="topbar-actions"><div class="last-sync">${state.lastSync ? `آخر تحديث <strong>${escapeHtml(relativeTime(state.lastSync))}</strong>` : 'لا توجد مزامنة مؤكدة'}</div><button class="icon-button" data-action="refresh-data" aria-label="تحديث البيانات">${icon('refresh')}</button></div></header><div class="content-wrap">${content}</div></main>
    <nav class="mobile-dock">${dockIds.map((id) => { const item = navItems.find((entry) => entry.id === id); return `<button class="${state.section === id ? 'active' : ''}" data-section="${id}">${icon(item.icon, 18)}<span>${escapeHtml(item.label)}</span></button>`; }).join('')}</nav>
    ${state.modal ? renderModal() : ''}${state.toast ? `<div class="toast"><span class="toast-icon">${icon('check', 16)}</span>${escapeHtml(state.toast)}</div>` : ''}
  </div>`;
}
function renderStatusBanner() {
  const bridge = bridgeStatus();
  const commands = commandCatalogStatus();
  const noHeartbeat = state.overview?.telemetry?.configured && !state.overview?.telemetry?.heartbeatReceived;
  const sourceMessage = !state.live
    ? state.liveError ? `تعذر تحميل بيانات الخادم: ${escapeHtml(state.liveError)}` : 'بانتظار تحميل بيانات الخادم؛ لم تُعرض مؤشرات غير مؤكدة.'
    : noHeartbeat ? 'مفاتيح HMAC مهيأة، لكن لم يصل نبض موثّق بعد؛ لا تُعرض بيانات غير مؤكدة.'
      : !state.overview?.telemetry?.configured ? 'يلزم إعداد مفتاح HMAC فعّال في الخادم لاستقبال نبضات الجسر.'
        : 'قراءة مباشرة من واجهات NEXORA ذات المصدر نفسه.';
  return `<div class="ops-banner ${bridge.cls === 'online' ? 'ok' : 'warn'}"><div class="ops-banner-icon">${icon(bridge.cls === 'online' ? 'activity' : 'alert', 20)}</div><div class="ops-banner-copy"><strong>${escapeHtml(bridge.text)}</strong><p>${sourceMessage}</p></div><div class="ops-banner-side"><span class="mini-status ${commands.cls}">${escapeHtml(commands.text)}</span><small>${state.overview?.telemetry?.latestHeartbeat ? `آخر نبض ${escapeHtml(relativeTime(state.overview.telemetry.latestHeartbeat))}` : 'لا يوجد نبض مسجل'}</small></div></div>`;
}
function renderStat(label, value, caption, glyph, tone = 'blue') {
  return `<article class="stat-card ops-stat"><div class="stat-top"><span>${escapeHtml(label)}</span><span class="stat-icon ${tone}">${icon(glyph, 18)}</span></div><div class="stat-value">${escapeHtml(value)}</div><div class="stat-foot"><span>${escapeHtml(caption)}</span></div></article>`;
}
function renderSignalCard(label, value, description, tone, glyph) {
  return `<article class="signal-card ${tone}"><span class="signal-icon">${icon(glyph, 18)}</span><div class="signal-copy"><span class="signal-label">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(description)}</small></div></article>`;
}
function renderOperationsSnapshot() {
  const telemetry = state.overview?.telemetry;
  const heartbeatReady = bridgeStatus().cls === 'online';
  const heartbeatText = !state.live ? 'بانتظار المصدر' : !telemetry?.configured ? 'غير مهيأ' : heartbeatReady ? 'نبض HMAC حديث وموثّق' : 'لا يوجد نبض HMAC حديث';
  const heartbeatDetail = telemetry?.heartbeatReceived ? `آخر نبض ${relativeTime(telemetry.latestHeartbeat)}` : 'لا تُعرض محطة كجاهزة قبل نبض صحيح وحديث.';
  const runner = state.bridgeJobConfig?.executor || (state.bridgeJobConfig ? 'local_render' : state.bridgeJobError ? 'غير متاح' : 'بانتظار المصدر');
  const runnerDetail = runner === 'local_render' ? 'تنفيذ محلي داخل خدمة Render فقط.' : 'المشغّل كما أعاده مصدر الخادم.';
  const catalogText = !state.live ? 'بانتظار المصدر' : state.commandError ? 'تعذرت قراءة القائمة' : state.commandsConfigured ? state.commands.length ? `${state.commands.length} أمرًا مسموحًا على الخادم` : 'الكتالوج فارغ' : 'كتالوج الخادم غير مهيأ';
  return `<section class="ops-snapshot" aria-label="ملخص الحالة التشغيلية">
    ${renderSignalCard('واجهة التحكم', state.live ? 'متصلة' : state.liveError ? 'تعذر الاتصال' : 'بانتظار المصدر', state.live ? 'بيانات مباشرة من واجهة الخدمة.' : 'لا تُعرض مؤشرات غير مؤكدة.', state.live ? 'ok' : 'warn', 'activity')}
    ${renderSignalCard('نبض الجسر', heartbeatText, heartbeatDetail, heartbeatReady ? 'ok' : 'warn', 'shield')}
    ${renderSignalCard('المشغّل الحالي', runner, runnerDetail, 'blue', 'cpu')}
    ${renderSignalCard('قائمة أوامر الخادم', catalogText, 'مصدر الخادم فقط؛ لا تثبت اتصال وكيل Linux بعيد.', state.commandsConfigured && state.commands.length ? 'ok' : 'warn', 'terminal')}
  </section>`;
}
function renderDashboardCatalog() {
  const commands = state.commands.slice(0, 4);
  const body = state.commandError
    ? `<div class="empty-state compact">${icon('alert', 24)}<h3>تعذر قراءة الكتالوج</h3><p>${escapeHtml(state.commandError)}</p></div>`
    : commands.length
      ? `<div class="catalog-preview-list">${commands.map((command) => `<button type="button" class="catalog-command-card ${command.id === state.selectedCommandId ? 'selected' : ''}" data-select-command="${escapeHtml(command.id)}"><span class="catalog-card-top"><strong>${escapeHtml(command.title)}</strong><code>${escapeHtml(command.id)}</code></span><span class="catalog-card-description">${escapeHtml(command.description || 'لا يوجد وصف وارد من الخادم.')}</span><span class="catalog-card-meta">${(command.inputs || []).length ? `${(command.inputs || []).length} مدخلات يحددها الأمر` : 'لا يتطلب مدخلات'}${command.serviceAction ? ` · ${escapeHtml(actionLabel[command.serviceAction.operation])} ${escapeHtml(command.serviceAction.service)}` : ''}</span></button>`).join('')}</div>${state.commands.length > commands.length ? `<p class="catalog-preview-note">تُعرض ${commands.length} عناصر من أصل ${state.commands.length} أعادها الخادم.</p>` : ''}`
      : `<div class="empty-state compact"><span class="unconfigured-chip">${escapeHtml(commandCatalogStatus().text)}</span><h3>لا توجد أوامر موثقة للعرض</h3><p>${state.commandsConfigured ? 'أعاد الخادم كتالوجًا فارغًا.' : 'لم يُهيأ مصدر أوامر صالح؛ لا توجد عناصر حقيقية للعرض.'} لن يُرسل أي أمر.</p></div>`;
  return `<section class="panel ops-panel catalog-preview"><div class="panel-head"><div><h2>كتالوج الأوامر</h2><p>عناصر مصدرها قائمة الخادم فقط؛ اختيار العنصر يحدّث مساحة الأوامر.</p></div><button type="button" class="text-button" data-section="commands">فتح الكتالوج الكامل ${icon('arrow', 15)}</button></div>${body}</section>`;
}
function renderDashboard() {
  const telemetry = state.overview?.telemetry;
  const serviceCommands = state.commands.filter((command) => ['start', 'stop', 'restart'].includes(command.serviceAction?.operation));
  const apiText = state.live ? 'متصل' : state.liveError ? 'تعذر الاتصال' : 'بانتظار المصدر';
  const heartbeatText = telemetry?.heartbeatReceived ? fmtDate(telemetry.latestHeartbeat) : telemetry?.configured ? 'بانتظار أول نبض موثّق' : 'غير مهيأ';
  const runner = state.bridgeJobConfig?.executor || (state.bridgeJobConfig ? 'local_render' : 'غير متاح');
  const remoteConnected = state.bridgeJobConfig?.remoteLinuxAgentConnected === true;
  const remoteText = remoteConnected ? 'اتصال بعيد موثّق من المصدر' : 'لا يوجد مضيف Linux بعيد موثّق الاتصال';
  const openRouterState = state.openRouterStatus?.configured ? 'مهيأ على الخادم' : state.openRouterError ? 'حالة الإعداد غير متاحة' : state.openRouterStatus ? 'غير مهيأ' : 'بانتظار المصدر';
  const openRouterTest = ({ success: 'نجح آخر اختبار', failed: 'فشل آخر اختبار', not_run: 'لم يُجر اختبار بعد' })[state.openRouterStatus?.lastTest?.status] || 'حالة الاختبار غير متاحة';
  const openRouterModel = state.openRouterStatus?.model || 'غير محدد';
  return `${sectionTitle('NEXORA · مركز القيادة', 'مركز التشغيل', 'واجهة تشغيل عربية تعرض بيانات الخدمة الفعلية، وقائمة الخادم المسموحة، ونتائج التنفيذ المسجلة فقط.', `${button('مهام HMAC', 'button secondary', 'go-jobs', 'shield')}${button('تحديث البيانات', 'button secondary', 'refresh-data', 'refresh')}`)}
    ${renderStatusBanner()}
    ${renderOperationsSnapshot()}
    <div class="ops-banner info"><span class="ops-banner-icon">${icon('shield', 18)}</span><div class="ops-banner-copy"><strong>${escapeHtml(bridgeJobStatusText())} · ${escapeHtml(runner)}</strong><p>${escapeHtml(remoteText)}. لا تُعد أي محطة أوامر جاهزة ما لم يصل نبض HMAC صحيح وحديث. ${escapeHtml(bridgeJobExplanation())}</p></div>${button('فتح المهام الموقعة', 'button secondary', 'go-jobs', 'arrow')}</div>
    <div class="workbench-grid">
      <section class="panel ops-panel command-panel workbench-main">${renderCommandForm(true)}</section>
      <div class="workbench-side">
        <section class="panel ops-panel runtime-panel"><div class="panel-head"><div><h2>حالة المصدر</h2><p>معلومات حية من واجهات NEXORA المحمية.</p></div><span class="panel-icon">${icon('activity', 18)}</span></div><div class="runtime-state-list"><div class="runtime-state-row"><span>واجهة التحكم</span><strong class="${state.live ? 'tone-ok' : 'tone-warn'}">${escapeHtml(apiText)}</strong></div><div class="runtime-state-row"><span>قائمة الأوامر</span><strong class="${state.commandsConfigured && state.commands.length ? 'tone-ok' : 'tone-warn'}">${escapeHtml(commandCatalogStatus().text)}</strong></div><div class="runtime-state-row"><span>نبض الجسر</span><strong>${escapeHtml(heartbeatText)}</strong></div><div class="runtime-state-row"><span>المشغّل</span><strong><code>${escapeHtml(runner)}</code></strong></div><div class="runtime-state-row"><span>آخر مزامنة</span><strong>${state.lastSync ? escapeHtml(fmtDate(state.lastSync)) : 'بانتظار المصدر'}</strong></div></div><div class="provider-status"><div class="provider-status-head"><strong>OpenRouter · اختياري</strong><span class="mini-status ${state.openRouterStatus?.configured ? 'online' : 'warning'}">${escapeHtml(openRouterState)}</span></div><div class="provider-status-row"><span>الطراز المحدد</span><code>${escapeHtml(openRouterModel)}</code></div><div class="provider-status-row"><span>آخر اختبار</span><strong>${escapeHtml(openRouterTest)}</strong></div>${state.openRouterStatus?.lastTest?.testedAt ? `<small class="provider-test-time">${escapeHtml(fmtDate(state.openRouterStatus.lastTest.testedAt))}</small>` : ''}<small class="provider-note">حالة قراءة فقط من الخادم؛ لا يُرسل مفتاح أو طلب إلى OpenRouter من هذه اللوحة.</small></div><div class="panel-footnote">لا تُعرض خدمة أو أمر أو حالة إلا إذا أعادها المصدر المتصل.</div></section>
        <section class="panel ops-panel service-panel"><div class="panel-head"><div><h2>إجراءات الخدمات المسموحة</h2><p>تظهر فقط إذا وردت كإجراءات فعلية في الكتالوج.</p></div><span class="panel-icon">${icon('shield', 18)}</span></div><div class="service-actions">${serviceCommands.length ? serviceCommands.map((command) => `<button class="service-action-card" data-select-command="${escapeHtml(command.id)}"><span class="action-symbol">${icon(command.serviceAction.operation === 'stop' ? 'stop' : command.serviceAction.operation === 'start' ? 'play' : 'refresh', 16)}</span><span><strong>${escapeHtml(command.serviceAction.service)}</strong><small>${escapeHtml(actionLabel[command.serviceAction.operation])} · ${escapeHtml(command.title)}</small></span>${icon('arrow', 16)}</button>`).join('') : `<div class="empty-state compact">${icon('layers', 25)}<h3>لا توجد إجراءات مهيأة</h3><p>لا توجد حاليًا إجراءات خدمة مسموحة في مصدر الأوامر.</p></div>`}</div><div class="panel-footnote">يتطلب كل إجراء خدمة مراجعة وتأكيدًا مستقلًا قبل إرساله.</div></section>
      </div>
    </div>
    ${renderDashboardCatalog()}
    ${renderCommandResult()}
    <section class="panel ops-panel audit-preview"><div class="panel-head"><div><h2>آخر عمليات التنفيذ</h2><p>سجل الخادم الفعلي؛ لا تُعرض مدخلات الأوامر.</p></div>${button('فتح سجل التنفيذ', 'text-button', 'go-executions', 'arrow')}</div>${state.executions.length ? `<div class="mini-execution-list">${state.executions.slice(0, 5).map(renderExecutionRow).join('')}</div>` : `<div class="empty-state compact">${icon('terminal', 25)}<h3>لا يوجد سجل تنفيذ بعد</h3><p>ستظهر هنا المحاولات المسجلة من واجهة الخادم بعد تشغيل أمر مسموح.</p></div>`}</section>`;
}
function commandInputFields(command) {
  return (command?.inputs || []).map((field) => `<label class="command-field"><span><code>${escapeHtml(field.name)}</code></span>${/prompt|message|text|query/i.test(field.name) ? `<textarea data-command-arg="${escapeHtml(field.name)}" aria-label="مدخل ${escapeHtml(field.name)}" rows="3" autocomplete="off"></textarea>` : `<input data-command-arg="${escapeHtml(field.name)}" aria-label="مدخل ${escapeHtml(field.name)}" type="text" autocomplete="off">`}</label>`).join('');
}
function renderCommandForm(compact = false) {
  const title = compact ? 'منفذ الأوامر' : 'تشغيل من قائمة الخادم';
  const description = 'الأوامر ومدخلاتها تأتي من واجهة الكتالوج المحمية؛ لا يوجد إدخال shell حر.';
  if (state.commandError) return `<div class="panel-head"><div><h2>${title}</h2><p>${description}</p></div><span class="unconfigured-chip">المصدر غير متاح</span></div><div class="empty-state compact"><h3>تعذر قراءة قائمة الخادم</h3><p>${escapeHtml(state.commandError)}</p></div>`;
  if (!state.commandsConfigured) {
    const stateText = state.commandsReason === 'invalid' ? 'قائمة الخادم غير صالحة' : 'غير مهيأ';
    return `<div class="panel-head"><div><h2>${title}</h2><p>${description}</p></div><span class="unconfigured-chip">${escapeHtml(stateText)}</span></div><div class="empty-state compact"><span class="unconfigured-chip">${escapeHtml(stateText)}</span><h3>لا توجد قائمة أوامر موثقة متاحة</h3><p>لم يُنفّذ أي أمر. يلزم إعداد مصدر أوامر صالح على الخادم قبل إتاحة التشغيل.</p></div>`;
  }
  if (!state.commands.length) return `<div class="panel-head"><div><h2>${title}</h2><p>${description}</p></div><span class="unconfigured-chip">الكتالوج فارغ</span></div><div class="empty-state compact"><span class="unconfigured-chip">لا أوامر مسموحة</span><h3>لا يوجد أمر متاح للتشغيل</h3><p>أعاد الخادم كتالوجًا فارغًا؛ لم يُرسل أي تنفيذ.</p></div>`;
  const selected = state.commands.find((command) => command.id === state.selectedCommandId) || state.commands[0];
  const options = state.commands.map((command) => `<option value="${escapeHtml(command.id)}" ${command.id === selected.id ? 'selected' : ''}>${escapeHtml(command.title)}${command.serviceAction ? ` · ${escapeHtml(actionLabel[command.serviceAction.operation])} ${escapeHtml(command.serviceAction.service)}` : ''}</option>`).join('');
  const runLabel = selected.serviceAction ? 'مراجعة إجراء الخدمة' : 'تنفيذ الأمر المسموح';
  return `<div class="panel-head"><div><h2>${title}</h2><p>${description}</p></div><span class="mini-status online">${state.commands.length} من الخادم</span></div><div class="command-console"><label class="command-select-label" for="command-select">الأمر المسموح</label><select id="command-select" ${state.executing ? 'disabled' : ''}>${options}</select><div class="command-description"><div class="command-title-row"><strong>${escapeHtml(selected.title)}</strong><code>${escapeHtml(selected.id)}</code></div><p>${escapeHtml(selected.description || 'لا يوجد وصف وارد من الخادم.')}</p>${selected.serviceAction ? `<span class="service-meta">${escapeHtml(actionLabel[selected.serviceAction.operation])} · ${escapeHtml(selected.serviceAction.service)}</span>` : ''}</div><div class="command-arguments-head"><strong>المدخلات</strong><small>تعريفها من الأمر المحدد في المصدر</small></div><div class="command-fields">${commandInputFields(selected) || '<p class="no-args">هذا الأمر لا يطلب مدخلات.</p>'}</div><button type="button" class="button primary run-button" data-action="run-selected" ${state.executing ? 'disabled' : ''}>${icon(selected.serviceAction ? 'shield' : 'play', 16)}<span>${state.executing ? 'جارٍ تنفيذ الطلب…' : escapeHtml(runLabel)}</span></button><p class="command-safety-note">${selected.serviceAction ? 'يتطلب الإجراء مراجعة وتأكيدًا منفصلًا قبل الإرسال.' : 'يُرسل معرّف الأمر ومدخلاته فقط إلى واجهة التنفيذ المحمية.'} لا يُرسل مفتاح الإدارة إلى المتصفح.</p></div>`;
}
function renderCommandResult() {
  const result = state.commandResult;
  const status = state.executing ? 'جارٍ التنفيذ' : state.executionStatus === 'review' ? 'بانتظار التأكيد' : state.executionStatus === 'cancelled' ? 'أُلغي قبل التنفيذ' : result ? result.ok ? 'اكتمل' : 'لم يكتمل' : 'بانتظار التنفيذ';
  const statusClass = state.executing ? 'running' : result?.ok ? 'success' : result ? 'failed' : state.executionStatus === 'review' ? 'review' : 'idle';
  const pendingText = state.executing ? 'أُرسل طلب التنفيذ إلى الخادم الموثق.' : state.executionStatus === 'review' ? 'راجع تفاصيل إجراء الخدمة في نافذة التأكيد قبل المتابعة.' : state.executionStatus === 'cancelled' ? 'أُلغي الإجراء قبل تأكيده؛ لم يبدأ تنفيذ الخدمة.' : state.commandError ? 'المخرجات غير متاحة لأن مصدر الأوامر لا يستجيب.' : !state.commandsConfigured || !state.commands.length ? 'بانتظار مصدر أوامر صالح؛ لم يُرسل أي أمر.' : 'لم يبدأ تنفيذ في هذه الجلسة بعد.';
  const output = result ? `${result.stdout ? `<strong>stdout</strong><pre>${escapeHtml(result.stdout)}</pre>` : ''}${result.stderr ? `<strong class="stderr-label">stderr</strong><pre class="stderr">${escapeHtml(result.stderr)}</pre>` : ''}${result.error ? `<strong class="stderr-label">رسالة الخادم</strong><pre class="stderr">${escapeHtml(result.error)}</pre>` : ''}${!result.stdout && !result.stderr && !result.error ? '<div class="result-no-output">لم يُرجع التنفيذ مخرجات نصية.</div>' : ''}` : '';
  return `<section class="panel command-result"><div class="panel-head result-heading"><div><h2>حالة التنفيذ والمخرجات</h2><p>${result ? `${escapeHtml(result.title || result.commandId)} · ${escapeHtml(fmtDate(result.executedAt))}` : 'تظهر النتيجة بعد استجابة واجهة الخادم فقط.'}</p></div><div class="result-heading-actions"><span class="execution-state-pill ${statusClass}">${escapeHtml(status)}</span>${button('مسح العرض', 'button secondary', 'clear-result', 'close')}${result && (result.stdout || result.stderr) ? button('نسخ المخرجات', 'button secondary', 'copy-output', 'copy') : ''}</div></div><div class="execution-state-row ${statusClass}"><span class="execution-state-indicator"></span><div><strong>${escapeHtml(status)}</strong><p>${escapeHtml(result?.error || pendingText)}</p></div></div>${result ? `<div class="result-meta">${result.code !== undefined && result.code !== null ? `<span>رمز الخروج: <code>${escapeHtml(result.code)}</code></span>` : ''}${Number.isFinite(result.durationMs) ? `<span>المدة: <code>${escapeHtml(result.durationMs)} ms</code></span>` : ''}${result.service ? `<span>${escapeHtml(actionLabel[result.operation] || result.operation)} · ${escapeHtml(result.service)}</span>` : ''}</div><div class="result-output">${output}</div>` : `<div class="result-empty">${icon(state.commandsConfigured && state.commands.length ? 'terminal' : 'alert', 22)}<span>${escapeHtml(pendingText)}</span></div>`}</section>`;
}
function renderCommandCatalog() {
  const cards = state.commands.map((command) => `<button type="button" class="catalog-command-card ${command.id === state.selectedCommandId ? 'selected' : ''}" data-select-command="${escapeHtml(command.id)}"><span class="catalog-card-top"><strong>${escapeHtml(command.title)}</strong><code>${escapeHtml(command.id)}</code></span><span class="catalog-card-description">${escapeHtml(command.description || 'لا يوجد وصف وارد من الخادم.')}</span><span class="catalog-card-meta">${(command.inputs || []).length ? `${(command.inputs || []).length} مدخلات من تعريف الأمر` : 'لا يتطلب مدخلات'}${command.serviceAction ? ` · ${escapeHtml(actionLabel[command.serviceAction.operation])} ${escapeHtml(command.serviceAction.service)}` : ''}</span></button>`).join('');
  return `${sectionTitle('العمليات / مصدر الخادم', 'كتالوج الأوامر', 'العناصر التالية تُعرض كما أعادتها واجهة /api/commands بعد التحقق من جلسة الإدارة؛ لا يعرض المركز إلا عناصر المصدر الفعلي.', `${button('إعادة تحميل المصدر', 'button secondary', 'refresh-data', 'refresh')}`)}${cards ? `<section class="command-catalog-list" aria-label="قائمة الأوامر الفعلية">${cards}</section>` : ''}<section class="panel ops-panel command-page">${renderCommandForm(false)}</section>${renderCommandResult()}<div class="ops-banner info"><div class="ops-banner-icon">${icon('shield', 19)}</div><div class="ops-banner-copy"><strong>حدود التنفيذ</strong><p>كل طلب يتطلب جلسة المدير ومعرّفًا موجودًا فعليًا في قائمة الخادم. لا يقبل هذا المركز نص shell حرًا، ولا يرسل مفاتيح الإدارة إلى المتصفح.</p></div></div>`;
}
function renderSignedJobRow(job) {
  const labels = { success: 'نجحت', failed: 'فشلت', timeout: 'انتهت المهلة', output_limit: 'تجاوزت حد المخرجات', spawn_error: 'تعذر البدء', rejected: 'مرفوضة', running: 'قيد التنفيذ' };
  const successful = job.status === 'success';
  const waiting = job.status === 'running';
  const when = job.completedAt || job.createdAt;
  return `<div class="execution-row"><span class="execution-mark ${successful ? 'ok' : waiting ? 'wait' : 'bad'}">${icon(successful ? 'check' : waiting ? 'activity' : 'alert', 15)}</span><div class="execution-copy"><strong>${escapeHtml(job.commandId)}</strong><small><code>${escapeHtml(job.jobId)}</code> · ${escapeHtml(job.executor || 'local_render')}</small></div><span class="execution-status ${successful ? 'ok' : ''}">${escapeHtml(labels[job.status] || job.status || 'غير معروف')}</span><time>${escapeHtml(fmtDate(when))}</time></div>`;
}
function renderSignedJobResult() {
  const job = state.bridgeJobResult;
  if (!job) return '';
  const status = job.status === 'success' ? 'اكتملت المهمة' : job.status === 'running' ? 'المهمة قيد التنفيذ' : `حالة المهمة: ${job.status || 'غير معروفة'}`;
  const stdout = job.result?.stdout || '';
  const stderr = job.result?.stderr || '';
  return `<section class="panel command-result"><div class="panel-head result-heading"><div><h2>نتيجة المهمة الموقّعة</h2><p>${escapeHtml(job.commandId)} · ${escapeHtml(job.jobId)}</p></div><div class="result-heading-actions"><span class="execution-state-pill ${job.status === 'success' ? 'success' : job.status === 'running' ? 'running' : 'failed'}">${escapeHtml(status)}</span><button class="button secondary" data-action="clear-job-result" type="button">مسح العرض</button></div></div><div class="result-meta"><span>المشغّل: <code>${escapeHtml(job.executor || 'local_render')}</code></span>${Number.isFinite(job.durationMs) ? `<span>المدة: <code>${escapeHtml(job.durationMs)} ms</code></span>` : ''}<span>الطالب: <code>${escapeHtml(job.requestedBy || 'nexora-control-center')}</code></span></div><div class="result-output">${stdout ? `<strong>stdout</strong><pre>${escapeHtml(stdout)}</pre>` : ''}${stderr ? `<strong class="stderr-label">stderr</strong><pre class="stderr">${escapeHtml(stderr)}</pre>` : ''}${!stdout && !stderr ? '<div class="result-no-output">لا توجد مخرجات نصية.</div>' : ''}</div></section>`;
}
function renderSignedJobsPage() {
  const config = state.bridgeJobConfig;
  const enabled = config?.enabled === true;
  const selected = state.jobCommands.find((command) => command.id === state.selectedJobCommandId) || state.jobCommands[0];
  const options = state.jobCommands.map((command) => `<option value="${escapeHtml(command.id)}" ${command.id === selected?.id ? 'selected' : ''}>${escapeHtml(command.title || command.id)}</option>`).join('');
  const statusText = bridgeJobStatusText();
  const rows = state.bridgeJobs.map(renderSignedJobRow).join('');
  return `${sectionTitle('NEXORA · جسر HMAC', 'مهام موقّعة', 'يرسل مركز التحكم مهمة محددة عبر HMAC إلى مشغّل محلي داخل خدمة NEXORA على Render.', `${button('تحديث البيانات', 'button secondary', 'refresh-data', 'refresh')}`)}
    <div class="ops-banner ${enabled ? 'ok' : 'warning'}"><span class="ops-banner-icon">${icon(enabled ? 'shield' : 'alert', 18)}</span><div class="ops-banner-copy"><strong>${escapeHtml(statusText)}</strong><p>المشغّل الحالي محلي داخل خدمة Render فقط؛ لا يوجد مضيف Linux خارجي متصل، ولن تُنفذ أوامر عليه. حماية nonce وjobId حاليًا داخل ذاكرة عملية واحدة وتُمسح عند إعادة التشغيل؛ يلزم Redis مشترك قبل التوسع أو الاعتماد على dedupe دائم.</p></div><div class="ops-banner-side"><span class="mini-status ${enabled ? 'online' : 'warning'}">${enabled ? 'مشغّل محلي' : 'غير مفعّل'}</span></div></div>
    <div class="ops-layout"><section class="panel ops-panel command-panel"><div class="panel-head"><div><h2>إرسال مهمة موقّعة</h2><p>يختار الخادم الأمر من القائمة المسموحة ويضيف هوية المرسل والتوقيع؛ لا يقبل endpoint أي shell أو args أو env من المتصفح.</p></div><span class="panel-icon">${icon('shield', 18)}</span></div>
      ${state.bridgeJobError ? `<div class="empty-state compact"><h3>تعذر قراءة قائمة المهام</h3><p>${escapeHtml(state.bridgeJobError)}</p></div>` : state.jobCommands.length ? `<div class="command-console"><label class="command-select-label" for="bridge-job-command-select">الأمر المسموح</label><select id="bridge-job-command-select" ${state.jobBusy ? 'disabled' : ''}>${options}</select><div class="command-description"><strong>${escapeHtml(selected?.title || 'فحص صحة الخدمة')}</strong><p>${escapeHtml(selected?.description || 'فحص محلي آمن لخدمة NEXORA الحالية.')}</p></div><button type="button" class="button primary run-button" data-action="submit-signed-job" ${!enabled || state.jobBusy || !selected ? 'disabled' : ''}>${icon(state.jobBusy ? 'activity' : 'play', 16)}<span>${state.jobBusy ? 'جارٍ إرسال المهمة…' : 'إرسال مهمة موقّعة'}</span></button><p class="command-safety-note">يولّد المتصفح jobId فقط؛ يوقّع الخادم بايتات JSON الخام ويعيد nonce جديدًا عند كل إرسال. احتفاظ idempotency محدود زمنيًا.</p></div>` : `<div class="empty-state compact"><h3>لا توجد أوامر مهام</h3><p>يتوفر فحص الخدمة المدمج فقط عند تفعيل وضع النسخة الواحدة؛ لا توجد أوامر خارجية موصولة.</p></div>`}
    </section><section class="panel ops-panel"><div class="panel-head"><div><h2>آخر المهام</h2><p>آخر 50 سجلًا محتفظًا بها في ذاكرة العملية الحالية.</p></div><span class="panel-icon">${icon('activity', 18)}</span></div><div class="execution-list">${rows || '<div class="empty-state compact"><h3>لا توجد مهام منفذة</h3><p>لا يُنشأ سجل حتى يرسل المدير مهمة موقّعة.</p></div>'}</div></section></div>${renderSignedJobResult()}
    <div class="ops-banner info"><span class="ops-banner-icon">${icon('layers', 18)}</span><div class="ops-banner-copy"><strong>نطاق التنفيذ الحالي</strong><p>المسار المحلي مفيد لفحص الخدمة وتجربة بروتوكول HMAC. ربط مضيف Linux فعلي يتطلب عنوانًا وعميلًا منفصلًا مع Redis مشترك وسياسة TLS/mTLS؛ لن يُفترض وجوده أو تُخمن وجهته.</p></div></div>`;
}
function renderDevices() {
  const filtered = state.stations.filter((device) => (state.deviceFilter === 'all' || device.status === state.deviceFilter) && `${device.id} ${device.name || ''} ${device.region || ''}`.toLowerCase().includes(state.search.toLowerCase()));
  return `${sectionTitle('العمليات / البوتات والطبقات', 'البوتات والطبقات', 'محطات حقيقية فقط: تُسجّل بعد نجاح توقيع HMAC، وتتحول إلى غير متصلة عند تجاوز مهلة النبض.', `${button('تحديث', 'button secondary', 'refresh-data', 'refresh')}`)}<div class="ops-banner ${state.overview?.telemetry?.heartbeatReceived ? 'ok' : 'warn'}"><div class="ops-banner-icon">${icon('activity', 19)}</div><div class="ops-banner-copy"><strong>${state.overview?.telemetry?.heartbeatReceived ? 'مصدر النبض مستلم' : 'لا يوجد مصدر heartbeat مسجل'}</strong><p>${state.overview?.telemetry?.configured ? `مهلة اعتبار المحطة متصلة: ${escapeHtml(state.overview.telemetry.staleAfterSeconds)} ثانية.` : 'يلزم مفتاح HMAC فعّال على الخادم لاستقبال النبضات.'}</p></div></div><div class="toolbar"><label class="search-field">${icon('search')}<input data-search="devices" value="${escapeHtml(state.search)}" placeholder="ابحث باسم المحطة أو المعرّف..." /></label><div class="filter-pills">${[['all','الكل'],['online','متصل'],['offline','غير متصل']].map(([key,label]) => `<button class="${state.deviceFilter === key ? 'active' : ''}" data-device-filter="${key}">${label}</button>`).join('')}</div></div><section class="panel table-panel full-panel">${filtered.length ? `<div class="table-scroll"><table><thead><tr><th>البوت / المحطة</th><th>المعرّف</th><th>الحالة</th><th>آخر نبض</th><th>الإصدار</th><th>المنطقة</th></tr></thead><tbody>${filtered.map((device) => `<tr data-device="${escapeHtml(device.id)}"><td><div class="entity-cell"><span class="device-glyph">${icon('cpu',17)}</span><div><strong>${escapeHtml(device.name || device.id)}</strong><small>${escapeHtml(device.type || 'Terminal')}</small></div></div></td><td><code>${escapeHtml(device.id)}</code></td><td>${statusPill(device.status, statusLabel[device.status] || device.status)}</td><td><span class="muted-text">${escapeHtml(relativeTime(device.lastSeen))}</span><small class="sub-value">${escapeHtml(device.lastSeen || '')}</small></td><td><code class="version">${escapeHtml(device.version || '—')}</code></td><td>${escapeHtml(device.region || 'غير محدد')}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-state">${icon('layers', 28)}<h3>${state.stations.length ? 'لا توجد نتائج' : 'لا توجد بوتات أو طبقات مسجلة'}</h3><p>${state.stations.length ? 'غيّر البحث أو الفلتر.' : 'ستظهر العقد هنا فقط بعد أول heartbeat HMAC صالح من الجسر.'}</p></div>`}</section>`;
}
function renderExecutionRow(entry) {
  const label = executionLabel[entry.status] || entry.status || 'غير معروف';
  const operation = entry.operation && entry.operation !== 'command' ? `${actionLabel[entry.operation] || entry.operation}${entry.service ? ` · ${entry.service}` : ''}` : 'أمر مسموح';
  const duration = Number.isFinite(entry.durationMs) ? ` · ${entry.durationMs} ms` : '';
  return `<div class="execution-row"><span class="execution-mark ${entry.status === 'success' ? 'ok' : entry.status === 'confirmation_required' ? 'wait' : 'bad'}">${icon(entry.status === 'success' ? 'check' : entry.status === 'confirmation_required' ? 'shield' : 'alert', 15)}</span><div class="execution-copy"><strong>${escapeHtml(entry.title || entry.commandId || 'أمر')}</strong><small><code>${escapeHtml(entry.commandId || '—')}</code> · ${escapeHtml(operation)}${duration}</small></div><span class="execution-status ${entry.status === 'success' ? 'ok' : ''}">${escapeHtml(label)}</span><time>${escapeHtml(fmtDate(entry.time))}</time></div>`;
}
function renderExecutions() {
  return `${sectionTitle('السجلات / تدقيق العمليات', 'سجل التنفيذ', 'سجل داخلي محدود لآخر 100 محاولة تشغيل. لا يسجل قيم المدخلات؛ السجل يمسح عند إعادة تشغيل العملية.', `${button('تحديث', 'button secondary', 'refresh-data', 'refresh')}`)}<section class="panel ops-panel full-panel">${state.executions.length ? `<div class="execution-list">${state.executions.map(renderExecutionRow).join('')}</div>` : `<div class="empty-state">${icon('terminal', 28)}<h3>لا يوجد سجل تنفيذ بعد</h3><p>سيتم تدوين الأمر المختار وحالته ومدة التنفيذ عند استدعائه.</p></div>`}</section>`;
}
function renderRequests() {
  const filtered = state.requests.filter((request) => (state.requestFilter === 'all' || request.status === state.requestFilter) && `${request.path} ${request.device} ${request.hash}`.toLowerCase().includes(state.search.toLowerCase()));
  const items = [['all','الكل'],['verified','موثّق'],['rejected','مرفوض']];
  return `${sectionTitle('السجلات / HMAC', 'طلبات الجسر الواردة', 'الطلبات التي استقبلها الخادم من مصدر الجسر وتم التحقق منها أو رفضها.', `${button('تحديث', 'button secondary', 'refresh-data', 'refresh')}`)}<div class="toolbar"><label class="search-field">${icon('search')}<input data-search="requests" value="${escapeHtml(state.search)}" placeholder="ابحث بالمسار أو المحطة أو البصمة..." /></label><div class="filter-pills">${items.map(([key,label]) => `<button class="${state.requestFilter === key ? 'active' : ''}" data-request-filter="${key}">${label}</button>`).join('')}</div></div><section class="panel table-panel full-panel">${filtered.length ? `<div class="table-scroll"><table><thead><tr><th>الوقت</th><th>المسار</th><th>المحطة</th><th>نتيجة التحقق</th><th>الزمن</th><th>بصمة التوقيع</th></tr></thead><tbody>${filtered.map((request) => `<tr><td><code>${escapeHtml(request.time || request.receivedAt || '—')}</code></td><td><code>${escapeHtml(request.path)}</code></td><td><code>${escapeHtml(request.device)}</code></td><td>${statusPill(request.status, statusLabel[request.status] || request.status)}</td><td>${escapeHtml(request.latency || '—')}</td><td><code>${escapeHtml(request.hash || '—')}</code></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-state">${icon('shield',28)}<h3>لا توجد طلبات HMAC مسجلة</h3><p>هذا السجل يبدأ فارغًا ويعرض ما يصل إلى الخادم منذ تشغيله الحالي.</p></div>`}</section>`;
}
function renderSecurityEvent(event) {
  const level = ['high','medium','low'].includes(event.level) ? event.level : 'low';
  return `<div class="event-row"><span class="event-icon ${level}">${icon(level === 'low' ? 'check' : 'alert', 16)}</span><div class="event-copy"><strong>${escapeHtml(event.title)}</strong><p>${escapeHtml(event.detail)}</p><code>${escapeHtml(event.code)}</code></div><div class="event-meta"><span class="severity ${level}">${level === 'high' ? 'عالٍ' : level === 'medium' ? 'متوسط' : 'منخفض'}</span><small>${escapeHtml(fmtDate(event.time))}</small></div></div>`;
}
function renderSecurity() {
  const filtered = state.securityEvents.filter((event) => state.securityFilter === 'all' || event.level === state.securityFilter);
  return `${sectionTitle('السجلات / الأمن', 'أحداث الأمان', 'الأحداث الواردة إلى مخزن الجسر فقط؛ لا تُعرض درجة أمن أو أرقام تقديرية.', `${button('تحديث', 'button secondary', 'refresh-data', 'refresh')}`)}<div class="toolbar compact-toolbar"><div class="filter-pills">${[['all','كل المستويات'],['high','عالٍ'],['medium','متوسط'],['low','منخفض']].map(([key,label]) => `<button class="${state.securityFilter === key ? 'active' : ''}" data-security-filter="${key}">${label}</button>`).join('')}</div></div><section class="panel ops-panel full-panel">${filtered.length ? `<div class="event-list large-events">${filtered.map(renderSecurityEvent).join('')}</div>` : `<div class="empty-state">${icon('shield',28)}<h3>لا توجد أحداث أمان مسجلة</h3><p>ستظهر هنا أحداث الطرفية الموقعة والتنبيهات التي يسجلها الخادم.</p></div>`}</section>`;
}
function renderRenderServices() {
  const cards = state.renderServices.map((service) => {
    const operations = Array.isArray(service.allowedOperations) ? service.allowedOperations : [];
    const actionButtons = operations.map((action) => `<button type="button" class="button secondary" data-action="render-action" data-render-action="${escapeHtml(action)}" data-render-service-id="${escapeHtml(service.id)}" ${state.renderActionBusy === `${service.id}:${action}` ? 'disabled' : ''}>${icon(action === 'restart' ? 'refresh' : action === 'deploy' ? 'play' : 'alert', 14)}<span>${state.renderActionBusy === `${service.id}:${action}` ? 'جارٍ…' : escapeHtml(renderActionLabel[action] || action)}</span></button>`).join('');
    return `<article class="render-service-card"><div><strong>${escapeHtml(service.name)}</strong><small>${escapeHtml(service.type)} · ${escapeHtml(service.region || 'المنطقة غير متاحة')}</small></div><span class="render-status ${service.suspended ? 'suspended' : 'active'}">${service.suspended ? 'معلّقة' : escapeHtml(service.latestDeploy?.status || 'حالة النشر غير معروفة')}</span><div class="render-service-meta"><code>${escapeHtml(service.id)}</code>${service.url ? `<a href="${escapeHtml(service.url)}" target="_blank" rel="noopener noreferrer">فتح الخدمة</a>` : ''}${service.dashboardUrl ? `<a href="${escapeHtml(service.dashboardUrl)}" target="_blank" rel="noopener noreferrer">لوحة Render</a>` : ''}</div>${actionButtons ? `<div class="render-service-actions">${actionButtons}</div>` : ''}</article>`;
  }).join('');
  const policyText = state.renderPolicy?.mutationsEnabled ? `العمليات المسموحة: ${state.renderPolicy.allowedOperations.map((item) => renderActionLabel[item] || item).join('، ')} · تتطلب تأكيدًا` : 'قراءة فقط؛ لا توجد عمليات مؤثرة مفعّلة.';
  return `${sectionTitle('الإدارة / المصدر الخارجي', 'خدمات Render', 'الجرد من Render للقراءة. عمليات التغيير تظهر فقط للخدمات المسموحة وتحتاج تأكيدًا صريحًا.', `${button('قراءة الآن', 'button secondary', 'refresh-render', 'refresh')}`)}<section class="panel ops-panel render-panel"><div class="panel-head"><div><h2>الخدمات المرتبطة</h2><p>${state.renderFetchedAt ? `آخر قراءة ${escapeHtml(fmtDate(state.renderFetchedAt))}` : 'لم تُقرأ بعد'}</p></div><span class="mini-status ${state.renderPolicy?.mutationsEnabled ? 'warning' : 'info'}">${state.renderPolicy?.mutationsEnabled ? 'تحكم مقيد' : 'قراءة فقط'}</span></div><div class="panel-footnote">${escapeHtml(policyText)}</div>${state.renderActionResult ? `<div class="ops-banner ${state.renderActionResult.ok ? 'ok' : 'warning'}"><div class="ops-banner-copy"><strong>${state.renderActionResult.ok ? 'تم قبول العملية' : 'تعذر تنفيذ العملية'}</strong><p>${escapeHtml(state.renderActionResult.error || `${renderActionLabel[state.renderActionResult.mutation] || state.renderActionResult.mutation || ''} · ${state.renderActionResult.serviceId || ''}`)}</p></div></div>` : ''}${state.renderError ? `<div class="empty-state compact"><h3>مصدر Render غير متاح</h3><p>${escapeHtml(state.renderError)}</p></div>` : cards || `<div class="empty-state compact"><h3>لم تُقرأ الخدمات بعد</h3><p>استخدم «قراءة الآن» لاستدعاء المصدر المتصل.</p></div>`}</section>`;
}
function renderManusProgress() {
  const progress = state.manusTaskProgress;
  if (!progress) return '';
  const statusLabels = { running: 'قيد التنفيذ', waiting: 'يتطلب إجراءً منك', stopped: 'توقف التشغيل الحالي', error: 'خطأ في المهمة', unknown: 'الحالة غير متاحة' };
  const stateClass = ['running', 'waiting', 'stopped', 'error'].includes(progress.agentStatus) ? progress.agentStatus : 'unknown';
  let completionNote = '';
  if (progress.agentStatus === 'stopped') {
    if (progress.completionState === 'current_run_stopped') completionNote = 'انتهى تشغيل الوكيل الحالي ولا توجد أعمال خلفية نشطة معروفة؛ النتائج أدناه تخص هذا التشغيل فقط.';
    else if (progress.completionState === 'background_jobs_running') completionNote = 'توقف الوكيل الرئيسي لكن توجد أعمال خلفية نشطة؛ لا تُعد المهمة مكتملة.';
    else completionNote = 'حالة الأعمال الخلفية غير معروفة؛ لا تُعد المهمة مكتملة. أعد الفحص لاحقًا.';
  }
  const waitingType = progress.waiting?.eventType;
  const waitingNote = progress.agentStatus === 'waiting'
    ? `<div class="manus-waiting-note"><strong>يتطلب تدخل المستخدم في Manus</strong><p>${['messageAskUser', 'cascadeAskUser'].includes(waitingType) ? 'تحتاج المهمة إلى رد منك. افتحها في Manus للمتابعة؛ لا يرسل المركز ردودًا نيابةً عنك.' : 'قد تكون هذه مصادقة إجراء أو نوع حدث غير مدعوم. افتح المهمة في Manus واتخذ الإجراء بنفسك؛ لا يؤكد المركز أي إجراء تلقائيًا.'}</p>${waitingType ? `<small>نوع الحدث: <code>${escapeHtml(waitingType)}</code></small>` : ''}${progress.waiting?.description ? `<p>${escapeHtml(progress.waiting.description)}</p>` : ''}</div>`
    : '';
  const messages = progress.messages?.length ? progress.messages.map((message) => `<article class="manus-message"><div><strong>${escapeHtml(({ user_message: 'رسالة المستخدم', assistant_message: 'رسالة Manus', error_message: 'تفاصيل الخطأ', status_update: 'تحديث الحالة', user_stop: 'إيقاف', structured_output_result: 'النتيجة' })[message.type] || 'رسالة')}</strong><time>${escapeHtml(fmtDate(message.timestamp))}</time></div><p>${escapeHtml(message.content)}</p></article>`).join('') : '<p class="manus-empty-messages">لا توجد رسائل متاحة لهذه المهمة حتى الآن.</p>';
  return `<section class="panel ops-panel manus-progress"><div class="panel-head"><div><h2>الحالة والرسائل</h2><p>مهمة NEXORA الأخيرة فقط · تحديثات فورية موقّعة.</p></div><span class="manus-status-pill ${stateClass}">${escapeHtml(statusLabels[progress.agentStatus] || statusLabels.unknown)}</span></div>${completionNote ? `<p class="manus-completion-note">${escapeHtml(completionNote)}</p>` : ''}${waitingNote}<div class="manus-message-list">${messages}</div></section>`;
}
function renderManus() {
  const result = state.manusTaskResult;
  const taskDetails = result ? `<section class="panel ops-panel manus-result"><div class="panel-head"><div><h2>مهمة NEXORA الأخيرة</h2><p>أُنشئت بعد ضغط زر الإرسال صراحةً.</p></div><span class="mini-status online">خاصة</span></div><div class="manus-result-details">${result.taskId ? `<div><small>معرّف المهمة</small><code>${escapeHtml(result.taskId)}</code></div>` : '<p>تم قبول الطلب، لكن لم يُرجع Manus معرّف مهمة.</p>'}${result.taskUrl ? `<a class="button secondary" href="${escapeHtml(result.taskUrl)}" target="_blank" rel="noopener noreferrer">فتح المهمة في Manus ${icon('arrow',15)}</a>` : ''}${result.taskId && result.taskReceipt ? `<button type="button" class="button secondary" data-action="refresh-manus-task" ${state.manusProgressBusy ? 'disabled' : ''}>${icon('refresh',15)}<span>${state.manusProgressBusy ? 'جارٍ التحقق…' : 'تحقق من الحالة والرسائل'}</span></button>` : ''}</div>${state.manusProgressError ? `<p class="manus-error" role="alert">${escapeHtml(state.manusProgressError)}</p>` : ''}</section>${renderManusProgress()}` : '';
  return `${sectionTitle('الإدارة / إنشاء مهمة يدويًا', 'إرسال مهمة إلى Manus', 'اكتب التعليمات ثم اضغط زر الإرسال صراحةً. لا تُنشأ أي مهمة عند فتح الصفحة أو أثناء تحميل المركز.')}
    <section class="panel ops-panel manus-panel"><div class="panel-head"><div><h2>تعليمات المهمة</h2><p>سيُرسل نص التعليمات فقط، عبر الخادم، إلى Manus API.</p></div><span class="mini-status info">خاصة</span></div>
      <div class="manus-form"><label for="manus-task-message">نص المهمة</label><textarea id="manus-task-message" maxlength="10000" rows="8" placeholder="اكتب ما تريد من Manus إنجازه…" ${state.manusTaskBusy ? 'disabled' : ''}>${escapeHtml(state.manusPrompt)}</textarea><div class="manus-form-meta"><span>حتى 10,000 حرف · لا مرفقات أو إعدادات إضافية</span><span>${state.manusPrompt.length.toLocaleString('ar-JO')} / 10,000</span></div>
        ${state.manusTaskError ? `<p class="manus-error" role="alert">${escapeHtml(state.manusTaskError)}</p>` : ''}
        <button type="button" id="submit-manus-task" class="button primary manus-submit" data-action="submit-manus-task" ${state.manusTaskBusy ? 'disabled' : ''}>${icon('play',16)}<span>${state.manusTaskBusy ? 'جارٍ إرسال المهمة…' : 'إرسال المهمة إلى Manus'}</span></button>
        <p class="manus-safety-note">لن يبدأ أي طلب قبل الضغط على هذا الزر. تُفرض الخصوصية على الخادم، ولا تُستخدم موصلات حساب Manus الافتراضية. أحداث webhook لا ترسل سوى نوع الحدث ومعرّف المهمة؛ ولا يؤكد المركز أي إجراء مطلوب.</p></div></section>${taskDetails}`;
}
function renderIntegration() {
  const telem = state.overview?.telemetry;
  return `${sectionTitle('الإدارة / اتصال الجسر', 'اتصال NEXORA بالجسر', 'واجهة الويب والـ Linux Bridge يتشاركان نفس الخادم والنطاق؛ لا يوجد رابط API وهمي.', `${button('فحص الجلسة والبيانات', 'button primary', 'refresh-data', 'activity')}`)}<div class="ops-layout"><section class="panel ops-panel"><div class="panel-head"><div><h2>مسارات الجسر الفعلية</h2><p>الخادم نفسه الذي يقدم واجهة الإدارة.</p></div><span class="mini-status ${telem?.configured ? 'online' : 'warning'}">${telem?.configured ? 'مهيأ لاستقبال HMAC' : 'HMAC غير مهيأ'}</span></div><div class="bridge-endpoints"><div><code>GET /api/control/overview</code><span>ملخص الحالة الفعلية · جلسة مدير</span></div><div><code>GET /api/commands</code><span>الكتالوج المسموح · جلسة مدير</span></div><div><code>POST /api/run</code><span>تنفيذ أمر whitelisted · جلسة مدير</span></div><div><code>POST /api/terminal/heartbeat</code><span>نبض الجسر · توقيع HMAC-SHA256</span></div><div><code>POST /api/terminal/event</code><span>حدث الجسر · توقيع HMAC-SHA256</span></div></div><div class="panel-footnote">الجلسة HttpOnly ومحدودة العمر. مفتاح CONTROL_API_KEY وأسرار HMAC لا تغادر الخادم.</div></section><section class="panel ops-panel"><div class="panel-head"><div><h2>حالة المصدر</h2><p>من بيانات الخادم الحالية فقط.</p></div></div><div class="bridge-status-list"><div><span>مفتاح HMAC فعّال</span>${statusPill(telem?.configured ? 'online' : 'offline', telem?.configured ? 'نعم' : 'غير مهيأ')}</div><div><span>وصل heartbeat</span>${statusPill(telem?.heartbeatReceived ? 'online' : 'offline', telem?.heartbeatReceived ? 'نعم' : 'لم يصل بعد')}</div><div><span>كتالوج الأوامر</span>${statusPill(state.commands.length ? 'online' : 'offline', state.commands.length ? `${state.commands.length} أمر` : 'غير مهيأ / فارغ')}</div><div><span>آخر نبض</span><code>${escapeHtml(fmtDate(telem?.latestHeartbeat))}</code></div></div></section></div><section class="panel ops-panel hmac-guide"><div class="panel-head"><div><h2>مصادقة الطرفية الواردة</h2><p>حافظ على توقيع الجسم الخام كما هو؛ لا تغيّر JSON بعد التوقيع.</p></div></div><div class="code-window"><div class="code-top"><span><i></i><i></i><i></i></span><small>HMAC-SHA256</small></div><pre>x-nexora-key: &lt;key-id&gt;
x-nexora-timestamp: &lt;unix-seconds&gt;
x-nexora-signature: sha256=&lt;hex-signature&gt;

HMAC(secret, timestamp + "." + rawRequestBody)</pre></div></section>`;
}
function renderSettings() {
  return `${sectionTitle('الإدارة / أسرار التشغيل', 'الإعدادات والمفاتيح', 'قيم الخادم الحساسة لا تُعرض. إدارة مفاتيح الطرفية تتم ضمن جلسة المدير الموثقة.', `${button('إنشاء مفتاح طرفية', 'button primary', 'create-key', 'plus')}`)}<div class="ops-banner info"><div class="ops-banner-icon">${icon('shield',19)}</div><div class="ops-banner-copy"><strong>الأسرار تبقى على الخادم</strong><p>CONTROL_API_KEY وRENDER_API_KEY وNEXORA_KEYS_JSON وCOMMANDS_FILE تُدار في بيئة تشغيل الخادم، وليس من المتصفح.</p></div></div><section class="panel ops-panel keys-panel"><div class="panel-head"><div><h2>مفاتيح HMAC للطرفيات</h2><p>السر لا يظهر في القائمة. عند إنشاء مفتاح جديد يُعرض مرة واحدة فقط.</p></div></div>${state.keys.length ? `<div class="keys-list">${state.keys.map((key) => `<div class="key-row"><span class="key-symbol">${icon('key',18)}</span><div class="key-details"><strong>${escapeHtml(key.name)}</strong><code>${escapeHtml(key.id)}</code></div><span class="key-date">أُنشئ ${escapeHtml(fmtDate(key.created))}<small>آخر استخدام ${escapeHtml(fmtDate(key.lastUsed))}</small></span>${statusPill(key.status, key.status === 'active' ? 'فعال' : 'معطل')}<button class="icon-button" data-disable-key="${escapeHtml(key.id)}" ${key.status !== 'active' ? 'disabled' : ''} aria-label="تعطيل المفتاح">${icon('close',16)}</button></div>`).join('')}</div>` : `<div class="empty-state compact"><h3>لا توجد مفاتيح HMAC مهيأة</h3><p>لن تُقبل نبضات الجسر قبل وجود مفتاح فعّال.</p></div>`}</section><section class="panel ops-panel"><div class="panel-head"><div><h2>قائمة الأوامر</h2><p>${state.commandsConfigured ? `${state.commands.length} أمرًا في ملف الخادم.` : 'لم يهيّأ commands.json على الخادم.'}</p></div><span class="mini-status ${state.commandsConfigured && state.commands.length ? 'online' : 'warning'}">${state.commandsConfigured && state.commands.length ? 'مهيأ' : 'غير مهيأ'}</span></div><div class="panel-footnote">ملف الأوامر server-side فقط، ويُحمّل عند الطلب. لا يوجد تحرير أو رفع أوامر من الواجهة.</div></section>`;
}
function renderModal() {
  if (state.modal.type === 'confirm-run') {
    const command = state.commands.find((item) => item.id === state.modal.commandId);
    if (!command) return '';
    const op = command.serviceAction;
    const phrase = actionLabel[op.operation] || op.operation;
    return `<div class="modal-backdrop" data-action="close-modal"><div class="modal small-modal" data-modal-content role="dialog" aria-modal="true"><div class="modal-head"><div><span class="eyebrow">تأكيد تنفيذ خدمة</span><h2>${escapeHtml(phrase)} · ${escapeHtml(op.service)}</h2></div><button class="icon-button" data-action="close-modal">${icon('close',18)}</button></div><div class="confirm-warning"><span>${icon('alert',20)}</span><p>سيُرسل الأمر <strong>${escapeHtml(command.title)}</strong> إلى خادم NEXORA. قد يؤدي الإجراء إلى توقف مؤقت أو انقطاع الخدمة. لن يبدأ التنفيذ إلا بعد تأكيدك.</p></div><div class="modal-actions">${button('إلغاء', 'button secondary', 'close-modal')}${button(`أؤكد ${phrase} الخدمة`, 'button danger', 'confirm-run', 'shield')}</div></div></div>`;
  }
  if (state.modal.type === 'device') {
    const device = state.stations.find((item) => item.id === state.modal.id);
    if (!device) return '';
    return `<div class="modal-backdrop" data-action="close-modal"><div class="modal" data-modal-content><div class="modal-head"><div><span class="eyebrow">نبض موثّق</span><h2>${escapeHtml(device.name || device.id)}</h2></div><button class="icon-button" data-action="close-modal">${icon('close',18)}</button></div><div class="modal-status">${statusPill(device.status, statusLabel[device.status])}<code>${escapeHtml(device.id)}</code></div><div class="detail-grid"><div><small>عنوان الشبكة</small><strong>${escapeHtml(device.ip || 'غير مبلّغ')}</strong></div><div><small>الإصدار</small><strong>${escapeHtml(device.version || 'غير مبلّغ')}</strong></div><div><small>المنطقة</small><strong>${escapeHtml(device.region || 'غير محدد')}</strong></div><div><small>آخر نبض</small><strong>${escapeHtml(fmtDate(device.lastSeen))}</strong></div></div><div class="modal-actions">${button('إغلاق', 'button secondary', 'close-modal')}</div></div></div>`;
  }
  if (state.modal.type === 'create-key') {
    return `<div class="modal-backdrop" data-action="close-modal"><div class="modal small-modal" data-modal-content><div class="modal-head"><div><span class="eyebrow">مفتاح جديد</span><h2>إنشاء مفتاح HMAC</h2></div><button class="icon-button" data-action="close-modal">${icon('close',18)}</button></div><label class="form-label">اسم المفتاح<input id="new-key-name" maxlength="80" placeholder="مثال: production-terminal" /></label><div class="modal-actions">${button('إلغاء', 'button secondary', 'close-modal')}${button('إنشاء', 'button primary', 'confirm-key', 'plus')}</div></div></div>`;
  }
  if (state.modal.type === 'created-key') {
    const key = state.modal.key;
    return `<div class="modal-backdrop"><div class="modal small-modal" data-modal-content role="dialog" aria-modal="true"><div class="modal-head"><div><span class="eyebrow">يُعرض مرة واحدة فقط</span><h2>احفظ سر المفتاح الآن</h2></div></div><p class="form-hint">لن يعاد عرض السر بعد إغلاق هذه النافذة. خزّنه في أسرار الطرفية؛ لا تضعه في GitHub أو السجلات.</p><code class="new-secret">${escapeHtml(key.secret)}</code><div class="modal-actions"><button class="button secondary" data-copy="${escapeHtml(key.secret)}">${icon('copy',16)}<span>نسخ السر</span></button>${button('تم الحفظ', 'button primary', 'close-modal')}</div></div></div>`;
  }
  return '';
}
function render() {
  let content = renderDashboard();
  if (state.section === 'commands') content = renderCommandCatalog();
  if (state.section === 'jobs') content = renderSignedJobsPage();
  if (state.section === 'devices') content = renderDevices();
  if (state.section === 'requests') content = renderRequests();
  if (state.section === 'security') content = renderSecurity();
  if (state.section === 'executions') content = renderExecutions();
  if (state.section === 'render') content = renderRenderServices();
  if (state.section === 'manus') content = renderManus();
  if (state.section === 'integration') content = `${renderIntegration()}${renderBridgeJobIntegration()}`;
  if (state.section === 'settings') content = renderSettings();
  app.innerHTML = renderShell(content);
  bindEvents();
}
function bindEvents() {
  syncManusTaskEventStream();
  document.querySelectorAll('[data-section]').forEach((element) => element.addEventListener('click', () => {
    state.section = element.dataset.section;
    state.search = '';
    state.menuOpen = false;
    render();
    if (state.section === 'render' && !state.renderFetchedAt && !state.renderError) loadRenderServices();
  }));
  document.querySelectorAll('[data-search]').forEach((element) => element.addEventListener('input', (event) => {
    state.search = event.target.value;
    const caret = event.target.selectionStart;
    render();
    const input = document.querySelector(`[data-search="${element.dataset.search}"]`);
    if (input) { input.focus(); input.setSelectionRange(caret, caret); }
  }));
  document.querySelectorAll('[data-device-filter]').forEach((element) => element.addEventListener('click', () => { state.deviceFilter = element.dataset.deviceFilter; render(); }));
  document.querySelectorAll('[data-request-filter]').forEach((element) => element.addEventListener('click', () => { state.requestFilter = element.dataset.requestFilter; render(); }));
  document.querySelectorAll('[data-security-filter]').forEach((element) => element.addEventListener('click', () => { state.securityFilter = element.dataset.securityFilter; render(); }));
  document.querySelectorAll('[data-device]').forEach((element) => element.addEventListener('click', () => { state.modal = { type: 'device', id: element.dataset.device }; render(); }));
  document.querySelectorAll('[data-select-command]').forEach((element) => element.addEventListener('click', () => { state.selectedCommandId = element.dataset.selectCommand; state.section = 'commands'; render(); }));
  document.querySelectorAll('[data-copy]').forEach((element) => element.addEventListener('click', async () => { try { await navigator.clipboard?.writeText(element.dataset.copy); showToast('تم النسخ'); } catch { showToast('تعذر الوصول إلى الحافظة'); } }));
  document.querySelectorAll('[data-disable-key]').forEach((element) => element.addEventListener('click', () => { if (window.confirm('هل تريد تعطيل هذا المفتاح؟ ستُرفض بعد ذلك نبضات هذا المصدر.')) disableKey(element.dataset.disableKey); }));
  document.querySelectorAll('[data-action]').forEach((element) => element.addEventListener('click', () => handleAction(element.dataset.action, element)));
  document.querySelectorAll('[data-modal-content]').forEach((element) => element.addEventListener('click', (event) => event.stopPropagation()));
  document.querySelector('#command-select')?.addEventListener('change', (event) => { state.selectedCommandId = event.target.value; render(); });
  document.querySelector('#bridge-job-command-select')?.addEventListener('change', (event) => { state.selectedJobCommandId = event.target.value; render(); });
  document.querySelector('#manus-task-message')?.addEventListener('input', (event) => {
    state.manusPrompt = event.target.value;
    const counter = document.querySelector('.manus-form-meta span:last-child');
    if (counter) counter.textContent = `${state.manusPrompt.length.toLocaleString('ar-JO')} / 10,000`;
  });
}
function syncManusTaskEventStream() {
  const task = state.manusTaskResult;
  if (state.section !== 'manus' || !task?.taskId || !task?.taskReceipt || typeof window.EventSource !== 'function') {
    manusEventSource?.close();
    manusEventSource = null;
    manusEventSourceTaskId = '';
    return;
  }
  if (manusEventSource && manusEventSourceTaskId === task.taskId) return;
  manusEventSource?.close();
  const source = new window.EventSource(`/api/control/manus/tasks/${encodeURIComponent(task.taskId)}/events`, { withCredentials: true });
  manusEventSource = source;
  manusEventSourceTaskId = task.taskId;
  source.addEventListener('manus-task-update', (event) => {
    let update;
    try { update = JSON.parse(event.data); } catch { return; }
    if (update?.taskId !== state.manusTaskResult?.taskId || !['task_created', 'task_stopped'].includes(update?.eventType)) return;
    refreshManusTask(true);
  });
  source.onerror = () => {
    if (source.readyState === window.EventSource.CLOSED) {
      source.close();
      if (manusEventSource === source) { manusEventSource = null; manusEventSourceTaskId = ''; }
    }
  };
}
function collectCommandArgs() {
  const args = {};
  document.querySelectorAll('[data-command-arg]').forEach((field) => { args[field.dataset.commandArg] = field.value; });
  return args;
}
async function executeCommand(commandId, args = {}, confirmed = false) {
  if (state.executing) return;
  const command = state.commands.find((item) => item.id === commandId);
  if (!command) return showToast('الأمر غير موجود في القائمة الحالية');
  if (command.serviceAction && !confirmed) {
    state.commandResult = null;
    state.executionStatus = 'review';
    state.modal = { type: 'confirm-run', commandId, args };
    render();
    return;
  }
  state.modal = null;
  state.commandResult = null;
  state.executionStatus = 'running';
  state.executing = true;
  render();
  try {
    const response = await apiRequest('/api/run', { method: 'POST', body: JSON.stringify({ commandId, args, ...(confirmed ? { confirmedCommandId: commandId } : {}) }) });
    state.commandResult = { ...response, executedAt: new Date().toISOString() };
    state.executionStatus = response.ok ? 'success' : 'failed';
    state.executing = false;
    await loadLiveData();
    showToast(response.ok ? 'اكتمل التنفيذ' : 'انتهى التنفيذ بحالة غير ناجحة؛ راجع النتيجة والسجل');
  } catch (error) {
    if (error.status === 428 && error.body?.confirmationRequired) {
      state.executing = false;
      state.executionStatus = 'review';
      state.modal = { type: 'confirm-run', commandId, args };
      await loadLiveData();
      render();
      return;
    }
    state.executing = false;
    state.executionStatus = 'failed';
    state.commandResult = { commandId, title: command.title, ok: false, error: error.message, code: `HTTP ${error.status || '?'}`, executedAt: new Date().toISOString() };
    await loadLiveData();
    showToast(error.message);
  }
}
function createBridgeJobId() {
  if (typeof window.crypto?.randomUUID === 'function') return window.crypto.randomUUID().replace(/-/g, '').toLowerCase();
  if (typeof window.crypto?.getRandomValues !== 'function') throw new Error('يتطلب إنشاء jobId عشوائي اتصالًا آمنًا بالمتصفح.');
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
async function submitSignedJob() {
  if (state.jobBusy) return;
  const command = state.jobCommands.find((item) => item.id === state.selectedJobCommandId);
  if (!command) return showToast('لا يوجد أمر مهيأ للمهام الموقعة');
  if (!state.bridgeJobConfig?.enabled) return showToast('التنفيذ متوقف حتى تأكيد نسخة واحدة وتهيئة التخزين المحدود');
  const storageKey = `nexora-pending-bridge-job:${command.id}`;
  let jobId = '';
  try { jobId = window.sessionStorage.getItem(storageKey) || ''; } catch {}
  if (!/^[a-f0-9]{32}$/i.test(jobId)) {
    try { jobId = createBridgeJobId(); } catch (error) { return showToast(error.message); }
    try { window.sessionStorage.setItem(storageKey, jobId); } catch {}
  }
  state.jobBusy = true;
  state.bridgeJobResult = null;
  render();
  try {
    const response = await apiRequest('/api/control/jobs', {
      method: 'POST',
      body: JSON.stringify({ jobId, commandId: command.id }),
    });
    state.bridgeJobResult = response.job || null;
    if (response.job?.status !== 'running') {
      try { window.sessionStorage.removeItem(storageKey); } catch {}
    }
    await loadLiveData();
    showToast(response.job?.status === 'success' ? 'اكتمل الفحص المحلي الموقّع' : 'وصلت استجابة المهمة؛ راجع الحالة والمخرجات');
  } catch (error) {
    state.bridgeJobResult = error.body?.job || null;
    if (error.body?.job && error.body.job.status !== 'running') {
      try { window.sessionStorage.removeItem(storageKey); } catch {}
    } else if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500 && error.status !== 429) {
      try { window.sessionStorage.removeItem(storageKey); } catch {}
    }
    await loadLiveData();
    showToast(error.message || 'تعذر إرسال المهمة؛ إعادة المحاولة ستستخدم jobId نفسه.');
  } finally {
    state.jobBusy = false;
    render();
  }
}
async function createKey() {
  const name = document.querySelector('#new-key-name')?.value.trim();
  if (!name) return showToast('أدخل اسم المفتاح أولًا');
  try {
    const result = await apiRequest('/api/control/keys', { method: 'POST', body: JSON.stringify({ name }) });
    state.modal = { type: 'created-key', key: result.key };
    await loadLiveData();
    state.modal = { type: 'created-key', key: result.key };
    render();
  } catch (error) { showToast(error.message); }
}
async function submitManusTask() {
  if (state.manusTaskBusy) return;
  const message = String(document.querySelector('#manus-task-message')?.value ?? state.manusPrompt).trim();
  state.manusPrompt = message;
  state.manusTaskError = '';
  state.manusTaskResult = null;
  if (!message) {
    state.manusTaskError = 'اكتب تعليمات المهمة أولًا.';
    render();
    return;
  }
  if (message.length > 10_000) {
    state.manusTaskError = 'يجب ألا تتجاوز التعليمات 10,000 حرف.';
    render();
    return;
  }
  state.manusTaskBusy = true;
  render();
  try {
    state.manusTaskResult = await apiRequest('/api/control/manus/tasks', { method: 'POST', body: JSON.stringify({ message }) });
    try { sessionStorage.setItem('nexora-last-manus-task', JSON.stringify(state.manusTaskResult)); } catch {}
    state.manusTaskProgress = null;
    state.manusProgressError = '';
    state.manusPrompt = '';
  } catch (error) {
    state.manusTaskError = error.message || 'تعذر إرسال المهمة. أعد المحاولة لاحقًا.';
  } finally {
    state.manusTaskBusy = false;
    render();
  }
}
async function refreshManusTask(fromWebhook = false) {
  const result = state.manusTaskResult;
  if (state.manusProgressBusy) { if (fromWebhook) manusAutoRefreshPending = true; return; }
  if (!result?.taskId || !result?.taskReceipt) return;
  state.manusProgressBusy = true;
  state.manusProgressError = '';
  render();
  try {
    state.manusTaskProgress = await apiRequest('/api/control/manus/tasks/progress', { method: 'POST', body: JSON.stringify({ taskId: result.taskId, taskReceipt: result.taskReceipt }) });
  } catch (error) {
    state.manusProgressError = error.message || 'تعذر التحقق من الحالة. أعد المحاولة لاحقًا.';
  } finally {
    state.manusProgressBusy = false;
    const refreshPending = manusAutoRefreshPending;
    manusAutoRefreshPending = false;
    render();
    if (refreshPending && state.section === 'manus') refreshManusTask(true);
  }
}
async function disableKey(id) {
  try { await apiRequest(`/api/control/keys/${encodeURIComponent(id)}/disable`, { method: 'POST', body: '{}' }); await loadLiveData(); showToast('تم تعطيل المفتاح'); }
  catch (error) { showToast(error.message); }
}
function renderOperationId() {
  if (typeof window.crypto?.randomUUID === 'function') return window.crypto.randomUUID();
  if (typeof window.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('يتطلب تنفيذ عملية Render اتصالًا آمنًا بالمتصفح.');
}
async function performRenderAction(serviceId, action) {
  if (state.renderActionBusy) return;
  const service = state.renderServices.find((item) => item.id === serviceId);
  if (!service || !Array.isArray(service.allowedOperations) || !service.allowedOperations.includes(action)) return showToast('العملية غير مسموحة لهذه الخدمة');
  const label = renderActionLabel[action] || action;
  if (!window.confirm(`سيتم تنفيذ «${label}» على خدمة Render: ${service.name}. قد تسبب العملية توقفًا أو نشرًا جديدًا. هل تؤكد؟`)) return;
  state.renderActionBusy = `${serviceId}:${action}`;
  state.renderActionResult = null;
  render();
  try {
    state.renderActionResult = await apiRequest('/api/control/render/actions', {
      method: 'POST',
      body: JSON.stringify({ operationId: renderOperationId(), serviceId, action, confirmed: true }),
    });
    await loadRenderServices();
    showToast('تم قبول عملية Render وتسجيلها');
  } catch (error) {
    state.renderActionResult = error.body || { ok: false, error: error.message };
    showToast(error.message || 'تعذر تنفيذ عملية Render');
  } finally {
    state.renderActionBusy = '';
    render();
  }
}
function showToast(message) {
  state.toast = message;
  render();
  clearTimeout(window.__nexoraToastTimer);
  window.__nexoraToastTimer = setTimeout(() => { state.toast = ''; render(); }, 2800);
}
function handleAction(action, element) {
  if (action === 'toggle-menu') { state.menuOpen = !state.menuOpen; render(); }
  else if (action === 'close-menu') { state.menuOpen = false; render(); }
  else if (action === 'close-modal') { if (state.modal?.type === 'confirm-run') state.executionStatus = 'cancelled'; state.modal = null; render(); }
  else if (action === 'refresh-data') loadLiveData();
  else if (action === 'refresh-render') loadRenderServices();
  else if (action === 'render-action') performRenderAction(element?.dataset.renderServiceId, element?.dataset.renderAction);
  else if (action === 'go-jobs') { state.section = 'jobs'; render(); }
  else if (action === 'go-devices') { state.section = 'devices'; render(); }
  else if (action === 'go-executions') { state.section = 'executions'; render(); }
  else if (action === 'clear-result') { state.commandResult = null; state.executionStatus = 'idle'; render(); }
  else if (action === 'clear-job-result') { state.bridgeJobResult = null; render(); }
  else if (action === 'copy-output') {
    const text = [state.commandResult?.stdout, state.commandResult?.stderr].filter(Boolean).join('\n\n');
    if (!text) return showToast('لا توجد مخرجات لنسخها');
    if (!navigator.clipboard?.writeText) return showToast('الحافظة غير متاحة في هذا السياق');
    navigator.clipboard.writeText(text).then(() => showToast('نُسخت المخرجات')).catch(() => showToast('تعذر نسخ المخرجات'));
  }
  else if (action === 'run-selected') executeCommand(state.selectedCommandId, collectCommandArgs(), false);
  else if (action === 'submit-signed-job') submitSignedJob();
  else if (action === 'submit-manus-task') submitManusTask();
  else if (action === 'refresh-manus-task') refreshManusTask();
  else if (action === 'confirm-run') { const modal = state.modal; if (modal?.commandId) executeCommand(modal.commandId, modal.args || {}, true); }
  else if (action === 'create-key') { state.modal = { type: 'create-key' }; render(); }
  else if (action === 'confirm-key') createKey();
}
bootstrap();

function renderBridgeJobIntegration() {
  const config = state.bridgeJobConfig;
  const enabled = config?.enabled === true;
  const remoteConnected = config?.remoteLinuxAgentConnected === true;
  return `<section class="panel ops-panel hmac-guide"><div class="panel-head"><div><h2>وظائف HMAC · المشغّل المحلي</h2><p>تفاصيل الطرفين داخل خدمة NEXORA الحالية، من دون إنشاء صفحة أو خدمة منفصلة.</p></div><span class="mini-status ${enabled ? 'online' : 'warning'}">${enabled ? 'التوقيع مفعّل' : 'التنفيذ موقوف'}</span></div><div class="bridge-status-list"><div><span>المشغّل</span><code>${escapeHtml(config?.executor || 'local_render')}</code></div><div><span>مضيف Linux خارجي</span>${statusPill(remoteConnected ? 'online' : 'offline', remoteConnected ? 'متصل' : 'لا يوجد اتصال مؤكد')}</div><div><span>التخزين</span><code>${escapeHtml(config?.storage || 'bounded_process_memory')}</code></div><div><span>الاحتفاظ بالنتائج</span><code>${Number(config?.retentionSeconds || 86400)} ثانية</code></div></div><div class="bridge-endpoints"><div><code>POST /api/control/jobs</code><span>جلسة مدير · body يحتوي jobId وcommandId فقط</span></div><div><code>POST /internal/jobs</code><span>nonce جديد وتوقيع HMAC · بايتات الجسم الخام</span></div></div><div class="code-window"><div class="code-top"><span><i></i><i></i><i></i></span><small>HMAC-SHA256 · /internal/jobs</small></div><pre>POST
/internal/jobs
&lt;timestamp&gt;
&lt;nonce&gt;
&lt;raw JSON body&gt;
HMAC(secret, method + "\\n" + path + "\\n" + timestamp + "\\n" + nonce + "\\n" + rawBody)</pre></div><div class="panel-footnote">لا تُعرض قيمة السر ولا تُرسل للمتصفح. nonce والـ jobId محدودان بذاكرة العملية وتُمسح حالتهما بعد إعادة التشغيل؛ لا يوجد مضيف Linux خارجي مؤكد الاتصال.</div></section>`;
}
