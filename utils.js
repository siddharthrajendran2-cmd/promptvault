const Utils = (() => {
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function parseTags(str) {
    return str.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  }

  function formatTags(tags) {
    return (tags || []).join(', ');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  return { uid, parseTags, formatTags, escapeHtml, copyToClipboard, debounce };
})();
