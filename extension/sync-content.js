// sync-content.js — runs at document_idle on http://localhost:8000/*
// Silently copies the web app's prompts from localStorage into
// chrome.storage.local so the extension popup always has fresh data.

(function syncToExtension() {
  try {
    const raw     = localStorage.getItem('promptvault');
    const prompts = raw ? (JSON.parse(raw)?.prompts ?? []) : [];
    chrome.storage.local.set({ prompts });
  } catch {
    // Fail silently — the extension will show the last successfully synced data.
  }
})();
