// popup.js

// Update this to wherever you serve the PromptVault web app.
const WEB_APP_URL = 'http://localhost:8000/index.html';

// Domains where content.js is registered. Using endsWith on the hostname
// means subdomains (e.g. new.chatgpt.com) are accepted without extra entries.
const SUPPORTED_HOSTS = ['claude.ai', 'chatgpt.com', 'chat.openai.com'];

function isSupportedTab(tab) {
  try {
    const { hostname } = new URL(tab.url ?? '');
    return SUPPORTED_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

const searchEl = document.getElementById('search');
const listEl   = document.getElementById('list');
const statusEl = document.getElementById('status');
const countEl  = document.getElementById('count');

let allPrompts      = [];
let filteredPrompts = [];
let statusTimer;

// ── Helpers ───────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function modelClass(model = '') {
  if (model === 'claude')        return 'badge-claude';
  if (model.startsWith('gpt'))   return 'badge-gpt';
  if (model === 'gemini')        return 'badge-gemini';
  return 'badge-claude';
}

function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className   = `status-bar${type ? ' ' + type : ''}`;
  clearTimeout(statusTimer);
  if (msg) statusTimer = setTimeout(() => setStatus(''), 3500);
}

// ── Render ────────────────────────────────────────────────────────────────

function render(prompts) {
  filteredPrompts = prompts;
  countEl.textContent = `${allPrompts.length} prompt${allPrompts.length !== 1 ? 's' : ''}`;

  if (!prompts.length) {
    listEl.innerHTML = allPrompts.length === 0
      ? `<div class="empty">No prompts yet.<br>
           <a id="empty-open" href="#">Open PromptVault</a> to add some,
           then use Sync to push them here.</div>`
      : `<div class="empty">No results for that search.</div>`;

    document.getElementById('empty-open')
      ?.addEventListener('click', openApp);
    return;
  }

  listEl.innerHTML = prompts.map(p => `
    <div class="item" data-id="${esc(p.id)}">
      <div class="item-row">
        <span class="item-title">${esc(p.title)}</span>
        <span class="item-badge ${modelClass(p.model)}">${esc(p.model)}</span>
      </div>
      <div class="item-preview">${esc(truncate(p.content, 60))}</div>
      <div class="item-flash">✓ Injected</div>
    </div>
  `).join('');
}

// ── Inject ────────────────────────────────────────────────────────────────

async function injectPrompt(itemEl, prompt) {
  itemEl.classList.add('loading');
  setStatus('');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) throw new Error('No active tab found.');

    if (!isSupportedTab(tab)) {
      throw new Error('Navigate to Claude or ChatGPT first.');
    }

    const res = await chrome.tabs.sendMessage(tab.id, {
      type:    'INJECT_PROMPT',
      content: prompt.content,
    });

    if (!res?.success) throw new Error(res?.error ?? 'Injection failed.');

    itemEl.classList.add('success');
    setStatus('Injected!', 'ok');
    setTimeout(() => itemEl.classList.remove('success'), 1800);

  } catch (err) {
    // Chrome throws "Could not establish connection" when the content script
    // is not present — translate that into a friendlier message.
    const friendly = err.message.includes('Could not establish connection')
      || err.message.includes('Receiving end does not exist')
        ? 'Navigate to Claude or ChatGPT first.'
        : err.message;
    setStatus(friendly, 'err');
  } finally {
    itemEl.classList.remove('loading');
  }
}

// ── Events ────────────────────────────────────────────────────────────────

searchEl.addEventListener('input', () => {
  const q = searchEl.value.trim().toLowerCase();
  render(q
    ? allPrompts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q))
      )
    : allPrompts
  );
});

listEl.addEventListener('click', e => {
  const item = e.target.closest('.item');
  if (!item || item.classList.contains('loading')) return;
  const prompt = filteredPrompts.find(p => p.id === item.dataset.id);
  if (prompt) injectPrompt(item, prompt);
});

function openApp(e) {
  e?.preventDefault();
  chrome.tabs.create({ url: WEB_APP_URL });
}

document.getElementById('open-app').addEventListener('click', openApp);

// ── Init ──────────────────────────────────────────────────────────────────

chrome.runtime.sendMessage({ type: 'GET_PROMPTS' }, ({ prompts = [] } = {}) => {
  allPrompts = prompts;
  render(allPrompts);
});
