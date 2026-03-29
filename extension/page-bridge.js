chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "CM_EXTENSION_SYNC") {
    return;
  }

  window.postMessage(
    {
      detail: message.detail || {},
      source: "cookie-monster-extension",
      type: "CM_EXTENSION_SYNC",
    },
    window.location.origin
  );
});
