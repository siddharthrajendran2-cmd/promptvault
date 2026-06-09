// content.js — Injects prompts into claude.ai and chatgpt.com.

// Returns the active input element using a site-specific selector.
function findInput() {
  if (location.hostname.includes('claude.ai')) {
    return document.querySelector('div[contenteditable="true"]');
  }
  // ChatGPT: prefer the native textarea; fall back to a contenteditable div.
  return document.querySelector('textarea')
      || document.querySelector('div[contenteditable="true"]');
}

// Inject into a <textarea> using the native setter so React's synthetic
// event system picks up the change (plain el.value = ... is silently ignored).
function injectIntoTextarea(el, text) {
  el.focus();
  const proto  = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter ? setter.call(el, text) : (el.value = text);
  el.dispatchEvent(new InputEvent('input',  { bubbles: true, cancelable: true }));
  el.dispatchEvent(new Event('change',      { bubbles: true }));
}

// Inject into a contenteditable div (Claude uses this).
// execCommand('selectAll') clears existing text; execCommand('insertText')
// fires through the editor's own input pipeline so the framework registers it.
function injectIntoContentEditable(el, text) {
  el.focus();
  document.execCommand('selectAll', false, null);
  const ok = document.execCommand('insertText', false, text);
  if (!ok) {
    el.textContent = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'INJECT_PROMPT') return false;

  const el = findInput();

  if (!el) {
    sendResponse({ success: false, error: 'Input area not found on this page.' });
    return true;
  }

  try {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      injectIntoTextarea(el, message.content);
    } else {
      injectIntoContentEditable(el, message.content);
    }
    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }

  return true;
});
