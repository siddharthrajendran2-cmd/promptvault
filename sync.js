// sync.js — Bridge between the PromptVault web app (localStorage) and
// the PromptVault Chrome extension (chrome.storage.local).
//
// When to call these functions:
//   exportPromptsForExtension() — call from the web app to push prompts into
//     the extension. Requires chrome.storage.local to be accessible, which
//     happens when the extension's content script on the PromptVault page
//     exposes it, or when this code runs inside an extension page directly.
//
//   importPromptsFromExtension() — call to pull prompts created in the
//     extension back into the web app's localStorage.
//
// Quick integration: add a "Sync to Extension" button in index.html that calls
//   import { exportPromptsForExtension } from './sync.js';
//   exportPromptsForExtension().then(n => console.log(`Synced ${n} prompts`));

function assertChromeStorage() {
  if (typeof chrome === 'undefined' || !chrome?.storage?.local) {
    throw new Error(
      'chrome.storage.local is not available. ' +
      'The PromptVault extension must be installed and active on this page.'
    );
  }
}

/**
 * Reads the prompts array from the web app's localStorage and writes it to
 * chrome.storage.local so the extension popup can access them.
 *
 * @returns {Promise<number>} Resolves with the number of prompts exported.
 */
export async function exportPromptsForExtension() {
  assertChromeStorage();

  let prompts;
  try {
    const raw = localStorage.getItem('promptvault');
    prompts   = JSON.parse(raw)?.prompts ?? [];
  } catch {
    throw new Error('Could not read prompts from localStorage.');
  }

  await chrome.storage.local.set({ prompts });
  return prompts.length;
}

/**
 * Reads the prompts array from chrome.storage.local and writes it back into
 * the web app's localStorage, preserving the rest of the schema (categories,
 * settings). Useful for pulling prompts created or edited in the extension.
 *
 * @returns {Promise<number>} Resolves with the number of prompts imported.
 */
export async function importPromptsFromExtension() {
  assertChromeStorage();

  const { prompts = [] } = await chrome.storage.local.get('prompts');

  try {
    const raw  = localStorage.getItem('promptvault');
    const data = raw
      ? JSON.parse(raw)
      : {
          prompts:    [],
          categories: ['work', 'coding', 'writing', 'personal'],
          settings:   { defaultModel: 'claude', theme: 'dark' },
        };

    data.prompts = prompts;
    localStorage.setItem('promptvault', JSON.stringify(data));
  } catch {
    throw new Error('Could not write prompts to localStorage.');
  }

  return prompts.length;
}
