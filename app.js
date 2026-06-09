// app.js — event wiring; all DOM writes go through render.js
import {
  initStorage, getAllPrompts, getPromptById,
  savePrompt, deletePrompt, searchPrompts,
} from './storage.js';

import {
  renderCardList, renderDetailFilled, renderDetailNew, renderDetailEmpty,
  setActiveNav, updateListHeader, updateNavBadges, flashStatus,
  readDetailFields, addTag, removeTag, clearTagInput,
} from './render.js';

// ── App state ─────────────────────────────────────────────────────────────
let selectedId     = null;
let activeCategory = 'all';
let isNewPrompt    = false;

// ── Boot ──────────────────────────────────────────────────────────────────
initStorage();
refreshList();
renderDetailEmpty();

// ── Helpers ───────────────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function getFiltered() {
  const q = document.querySelector('.search-input').value.trim();
  let prompts = q ? searchPrompts(q) : getAllPrompts();
  if (activeCategory === 'favorites') return prompts.filter(p => p.isFavorite);
  if (activeCategory !== 'all')       return prompts.filter(p => p.category === activeCategory);
  return prompts;
}

function refreshList() {
  const prompts = getFiltered();
  renderCardList(prompts, selectedId);
  updateListHeader(activeCategory, prompts.length);
  setActiveNav(activeCategory);
  updateNavBadges(getAllPrompts());
}

// ── Search ────────────────────────────────────────────────────────────────
document.querySelector('.search-input')
  .addEventListener('input', debounce(() => refreshList(), 200));

// ── Sidebar category nav ──────────────────────────────────────────────────
document.querySelector('.sidebar-nav').addEventListener('click', e => {
  const item = e.target.closest('.nav-item[data-category]');
  if (!item) return;
  activeCategory = item.dataset.category;
  refreshList();
});

// ── New Prompt ────────────────────────────────────────────────────────────
document.querySelector('.btn-new').addEventListener('click', () => {
  isNewPrompt = true;
  selectedId  = null;
  refreshList();
  renderDetailNew();
});

// ── Card list — delegated clicks ──────────────────────────────────────────
document.querySelector('.card-list').addEventListener('click', e => {
  // Star must be checked before card so it doesn't also trigger card selection
  const starBtn = e.target.closest('.star');
  if (starBtn) {
    e.stopPropagation();
    const id = starBtn.dataset.id;
    const p  = getPromptById(id);
    if (!p) return;
    savePrompt({ ...p, isFavorite: !p.isFavorite });
    refreshList();
    if (id === selectedId) renderDetailFilled(getPromptById(id));
    return;
  }

  const card = e.target.closest('.card');
  if (!card) return;
  isNewPrompt = false;
  selectedId  = card.dataset.id;
  refreshList();
  const p = getPromptById(selectedId);
  if (p) renderDetailFilled(p);
});

// ── Detail actions — delegated clicks ────────────────────────────────────
document.querySelector('.detail-actions').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  switch (btn.dataset.action) {

    case 'copy': {
      const p = getPromptById(selectedId);
      if (!p) break;
      await navigator.clipboard.writeText(p.content);
      btn.textContent = 'Copied!';
      setTimeout(() => (btn.textContent = 'Copy'), 1800);
      break;
    }

    case 'use': {
      const p = getPromptById(selectedId);
      if (!p) break;
      await navigator.clipboard.writeText(p.content);
      savePrompt({ ...p, usageCount: (p.usageCount || 0) + 1 });
      refreshList();
      renderDetailFilled(getPromptById(selectedId));
      flashStatus('Copied — ready to paste!');
      break;
    }

    case 'fav': {
      const p = getPromptById(selectedId);
      if (!p) break;
      savePrompt({ ...p, isFavorite: !p.isFavorite });
      refreshList();
      renderDetailFilled(getPromptById(selectedId));
      break;
    }

    case 'delete': {
      const p = getPromptById(selectedId);
      if (!p || !confirm(`Delete "${p.title}"?`)) break;
      deletePrompt(selectedId);
      selectedId  = null;
      isNewPrompt = false;
      refreshList();
      renderDetailEmpty();
      break;
    }

    case 'save-new': {
      const fields = readDetailFields();
      if (!fields.title) { document.querySelector('.detail-title').focus(); break; }
      const saved = savePrompt({ ...fields, isFavorite: false, usageCount: 0 });
      isNewPrompt    = false;
      selectedId     = saved.id;
      activeCategory = 'all';
      refreshList();
      renderDetailFilled(saved);
      flashStatus('Saved');
      break;
    }

    case 'cancel-new': {
      isNewPrompt = false;
      selectedId  = null;
      refreshList();
      renderDetailEmpty();
      break;
    }
  }
});

// ── Auto-save for existing prompts ────────────────────────────────────────
const autoSave = debounce(() => {
  if (isNewPrompt || !selectedId) return;
  const p = getPromptById(selectedId);
  if (!p) return;
  const fields = readDetailFields();
  if (!fields.title) return;
  savePrompt({ ...p, ...fields });
  refreshList();
  flashStatus('Saved');
}, 600);

document.querySelector('.detail-title').addEventListener('input', autoSave);
document.querySelector('.detail-textarea').addEventListener('input', autoSave);
document.querySelectorAll('.meta-select').forEach(el => el.addEventListener('change', autoSave));

// ── Tags — add on Enter ───────────────────────────────────────────────────
document.querySelector('.tags-field').addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.classList.contains('tag-type')) return;
  e.preventDefault();
  if (addTag(e.target.value)) {
    clearTagInput();
    autoSave();
  }
});

// ── Tags — remove on × ───────────────────────────────────────────────────
document.querySelector('.tags-field').addEventListener('click', e => {
  const del = e.target.closest('.pill-del');
  if (!del) return;
  removeTag(del.dataset.tag);
  autoSave();
});
