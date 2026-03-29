const PAGE_BRIDGE_SOURCE = "cookie-monster-page";
const EXTENSION_BRIDGE_SOURCE = "cookie-monster-extension";
const PAGE_BRIDGE_REQUEST_TYPE = "CM_EXTENSION_BRIDGE_REQUEST";
const PAGE_BRIDGE_RESPONSE_TYPE = "CM_EXTENSION_BRIDGE_RESPONSE";
const PAGE_BRIDGE_READY_TYPE = "CM_EXTENSION_BRIDGE_READY";
const EXTENSION_SYNC_TYPE = "CM_EXTENSION_SYNC";

function isCookieMonsterApp() {
  return (
    window === window.top &&
    document.documentElement?.dataset?.cookieMonsterApp === "true"
  );
}

function postToPage(payload) {
  window.postMessage(
    {
      ...payload,
      source: EXTENSION_BRIDGE_SOURCE,
    },
    window.location.origin
  );
}

function sendRuntimeMessage(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            error: chrome.runtime.lastError.message,
            success: false,
            type: message?.type || "UNKNOWN",
          });
          return;
        }

        resolve(
          response || {
            error: "No response from extension background worker.",
            success: false,
            type: message?.type || "UNKNOWN",
          }
        );
      });
    } catch (error) {
      resolve({
        error: error instanceof Error ? error.message : "Unknown bridge error",
        success: false,
        type: message?.type || "UNKNOWN",
      });
    }
  });
}

window.addEventListener("message", (event) => {
  if (!isCookieMonsterApp() || event.source !== window) {
    return;
  }

  const data = event.data;
  if (
    !data ||
    data.source !== PAGE_BRIDGE_SOURCE ||
    data.type !== PAGE_BRIDGE_REQUEST_TYPE ||
    typeof data.requestId !== "string" ||
    !data.message
  ) {
    return;
  }

  sendRuntimeMessage(data.message).then((response) => {
    postToPage({
      requestId: data.requestId,
      response,
      type: PAGE_BRIDGE_RESPONSE_TYPE,
    });
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (!isCookieMonsterApp() || message?.type !== EXTENSION_SYNC_TYPE) {
    return;
  }

  postToPage({
    detail: message.detail || {},
    type: EXTENSION_SYNC_TYPE,
  });
});

if (isCookieMonsterApp()) {
  postToPage({
    detail: {
      ready: true,
    },
    type: PAGE_BRIDGE_READY_TYPE,
  });
}
