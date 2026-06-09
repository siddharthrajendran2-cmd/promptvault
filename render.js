// render.js — all DOM reads and writes; zero event listeners

const $  = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

// ── Cached DOM refs ───────────────────────────────────────────────────────
const cardListEl       = $('.card-list');
const emptyStateEl     = $('.empty-state');
const listTitleEl      = $('.list-title');
const listBadgeEl      = $('.list-badge');
const detailContentEl  = $('.detail-content');
const detailEmptyEl    = $('.detail-empty');
const detailActionsEl  = $('.detail-actions');
const crumbCatEl       = $('.crumb-cat');
const crumbDotEl       = $('.crumb-dot');
const crumbDateEl      = $('.crumb-date');
const detailTitleEl    = $('.detail-title');
const detailTextareaEl = $('.detail-textarea');
const tagsFieldEl      = $('.tags-field');
const [categorySelectEl, modelSelectEl] = $$('.meta-select');
const metaValueEl      = $('.meta-value');

// Status indicator — created once and appended to the detail header
let statusTimer;
const saveStatusEl = document.createElement('span');
saveStatusEl.className = 'save-status';
$('.detail-header').appendChild(saveStatusEl);

// ── Private helpers ───────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function modelClass(model = '') {
  if (model === 'claude')      return 'claude';
  if (model.startsWith('gpt')) return 'gpt';
  if (model === 'gemini')      return 'gemini';
  return 'claude';
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function cap(str = '') {
  return str ? str[0].toUpperCase() + str.slice(1) : '';
}

function renderTags(tags) {
  tagsFieldEl.querySelectorAll('.pill-accent').forEach(el => el.remove());
  const tagInput = tagsFieldEl.querySelector('.tag-type');
  for (const tag of tags) {
    const span = document.createElement('span');
    span.className = 'pill pill-accent';
    span.dataset.tag = tag;
    span.innerHTML = `${esc(tag)} <span class="pill-del" data-tag="${esc(tag)}">×</span>`;
    tagsFieldEl.insertBefore(span, tagInput);
  }
}

function renderDetailActions(prompt) {
  detailActionsEl.innerHTML = `
    <button class="action-btn" data-action="copy">Copy</button>
    <button class="action-btn use" data-action="use">Use ↗</button>
    <button class="action-btn fav${prompt.isFavorite ? ' active' : ''}" data-action="fav">
      ${prompt.isFavorite ? '★ Favorited' : '☆ Favorite'}
    </button>
    <button class="action-btn del" data-action="delete">Delete</button>
  `;
}

function renderNewPromptActions() {
  detailActionsEl.innerHTML = `
    <button class="action-btn use" data-action="save-new">Save Prompt</button>
    <button class="action-btn" data-action="cancel-new">Cancel</button>
  `;
}

// ── Card list ─────────────────────────────────────────────────────────────

export function renderCardList(prompts, selectedId) {
  cardListEl.innerHTML = '';

  if (!prompts.length) {
    emptyStateEl.classList.remove('hidden');
    return;
  }
  emptyStateEl.classList.add('hidden');

  for (const p of prompts) {
    const el = document.createElement('article');
    el.className = `card${p.id === selectedId ? ' active' : ''}`;
    el.dataset.id = p.id;
    el.innerHTML = `
      <div class="card-row">
        <h3 class="card-title">${esc(p.title)}</h3>
        <button class="star${p.isFavorite ? ' on' : ''}" data-id="${esc(p.id)}"
                title="${p.isFavorite ? 'Unfavorite' : 'Favorite'}">
          ${p.isFavorite ? '★' : '☆'}
        </button>
      </div>
      <p class="card-preview">${esc(truncate(p.content, 80))}</p>
      <footer class="card-foot">
        <div class="pill-row">
          ${(p.tags || []).map(t => `<span class="pill">${esc(t)}</span>`).join('')}
        </div>
        <span class="model-badge ${modelClass(p.model)}">${esc(p.model)}</span>
      </footer>
    `;
    cardListEl.appendChild(el);
  }
}

// ── Detail panel ──────────────────────────────────────────────────────────

export function renderDetailFilled(prompt) {
  detailContentEl.classList.remove('hidden');
  detailEmptyEl.classList.add('hidden');

  crumbCatEl.textContent   = cap(prompt.category);
  crumbDotEl.style.display = '';
  crumbDateEl.textContent  = `Updated ${fmtDate(prompt.updatedAt)}`;

  renderDetailActions(prompt);

  detailTitleEl.value      = prompt.title;
  detailTextareaEl.value   = prompt.content;
  renderTags(prompt.tags || []);
  categorySelectEl.value   = cap(prompt.category);
  modelSelectEl.value      = prompt.model;
  metaValueEl.textContent  = `${prompt.usageCount ?? 0} uses`;
}

export function renderDetailNew() {
  detailContentEl.classList.remove('hidden');
  detailEmptyEl.classList.add('hidden');

  crumbCatEl.textContent   = 'New';
  crumbDotEl.style.display = 'none';
  crumbDateEl.textContent  = '';

  renderNewPromptActions();

  detailTitleEl.value      = '';
  detailTextareaEl.value   = '';
  renderTags([]);
  categorySelectEl.value   = 'Work';
  modelSelectEl.value      = 'claude';
  metaValueEl.textContent  = '0 uses';

  detailTitleEl.focus();
}

export function renderDetailEmpty() {
  detailContentEl.classList.add('hidden');
  detailEmptyEl.classList.remove('hidden');
}

// ── Sidebar ───────────────────────────────────────────────────────────────

export function setActiveNav(category) {
  $$('.nav-item').forEach(item =>
    item.classList.toggle('active', item.dataset.category === category)
  );
}

export function updateListHeader(category, count) {
  const LABELS = {
    all: 'All Prompts', work: 'Work', coding: 'Coding',
    writing: 'Writing', personal: 'Personal', favorites: 'Favorites',
  };
  listTitleEl.textContent = LABELS[category] ?? 'Prompts';
  listBadgeEl.textContent = count;
}

export function updateNavBadges(allPrompts) {
  const counts = {
    all:       allPrompts.length,
    favorites: allPrompts.filter(p => p.isFavorite).length,
    work:      allPrompts.filter(p => p.category === 'work').length,
    coding:    allPrompts.filter(p => p.category === 'coding').length,
    writing:   allPrompts.filter(p => p.category === 'writing').length,
    personal:  allPrompts.filter(p => p.category === 'personal').length,
  };
  $$('.nav-item[data-category]').forEach(item => {
    const badge = item.querySelector('.nav-badge');
    if (badge) badge.textContent = counts[item.dataset.category] ?? 0;
  });
}

// ── Status flash ──────────────────────────────────────────────────────────

export function flashStatus(msg = 'Saved') {
  saveStatusEl.textContent = msg;
  saveStatusEl.classList.add('visible');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => saveStatusEl.classList.remove('visible'), 2000);
}

// ── Form state ────────────────────────────────────────────────────────────

export function readDetailFields() {
  return {
    title:    detailTitleEl.value.trim(),
    content:  detailTextareaEl.value,
    tags:     $$('.tags-field .pill-accent').map(el => el.dataset.tag),
    category: (categorySelectEl.value || 'Work').toLowerCase(),
    model:    modelSelectEl.value || 'claude',
  };
}

// ── Tag helpers ───────────────────────────────────────────────────────────

export function addTag(rawTag) {
  const tag = rawTag.trim().toLowerCase();
  if (!tag) return false;
  const existing = $$('.tags-field .pill-accent').map(el => el.dataset.tag);
  if (existing.includes(tag)) return false;
  renderTags([...existing, tag]);
  return true;
}

export function removeTag(tag) {
  const current = $$('.tags-field .pill-accent').map(el => el.dataset.tag);
  renderTags(current.filter(t => t !== tag));
}

export function clearTagInput() {
  const input = tagsFieldEl.querySelector('.tag-type');
  if (input) input.value = '';
}
