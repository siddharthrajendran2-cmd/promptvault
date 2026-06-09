// background.js — MV3 service worker for PromptVault.

// On first install, seed chrome.storage.local with an empty prompts array
// so popup.js always gets a defined value from storage.
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.storage.local.get('prompts', ({ prompts }) => {
      if (!Array.isArray(prompts)) {
        chrome.storage.local.set({ prompts: [] });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  // Popup requests the current prompts array from storage.
  if (message.type === 'GET_PROMPTS') {
    chrome.storage.local.get('prompts', ({ prompts = [] }) => {
      sendResponse({ prompts });
    });
    return true;
  }

  // Message relay — forwards an inject request from the popup to the active
  // tab's content script. Used as a fallback if a direct sendMessage is blocked.
  if (message.type === 'RELAY_TO_CONTENT') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) {
        sendResponse({ success: false, error: 'No active tab found.' });
        return;
      }

      chrome.tabs.sendMessage(
        tab.id,
        { type: 'INJECT_PROMPT', content: message.content },
        res => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse(res ?? { success: false, error: 'No response from content script.' });
          }
        }
      );
    });
    return true;
  }

  return false;
});
