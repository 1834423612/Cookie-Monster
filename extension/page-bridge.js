const PAGE_BRIDGE_SOURCE = "cookie-monster-page";
const EXTENSION_BRIDGE_SOURCE = "cookie-monster-extension";
const PAGE_BRIDGE_REQUEST_TYPE = "CM_EXTENSION_BRIDGE_REQUEST";
const PAGE_BRIDGE_RESPONSE_TYPE = "CM_EXTENSION_BRIDGE_RESPONSE";
const PAGE_BRIDGE_READY_TYPE = "CM_EXTENSION_BRIDGE_READY";
const EXTENSION_SYNC_TYPE = "CM_EXTENSION_SYNC";
const PAGE_BRIDGE_READY_ATTRIBUTE = "cookieMonsterBridgeReady";
const PAGE_BRIDGE_INSTALL_FLAG = "__cookieMonsterPageBridgeInstalled";
const PAGE_BRIDGE_READY_FLAG = "__cookieMonsterPageBridgeReadyPosted";

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

function notifyReadyIfNeeded() {
  if (!isCookieMonsterApp()) {
    return;
  }

  document.documentElement.dataset[PAGE_BRIDGE_READY_ATTRIBUTE] = "true";

  if (window[PAGE_BRIDGE_READY_FLAG]) {
    return;
  }

  window[PAGE_BRIDGE_READY_FLAG] = true;
  postToPage({
    detail: {
      ready: true,
    },
    type: PAGE_BRIDGE_READY_TYPE,
  });
}

if (!window[PAGE_BRIDGE_INSTALL_FLAG]) {
  window[PAGE_BRIDGE_INSTALL_FLAG] = true;

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

  if (typeof MutationObserver === "function" && document.documentElement) {
    const observer = new MutationObserver(() => {
      notifyReadyIfNeeded();
    });

    observer.observe(document.documentElement, {
      attributeFilter: ["data-cookie-monster-app"],
      attributes: true,
    });
  }
}

notifyReadyIfNeeded();
