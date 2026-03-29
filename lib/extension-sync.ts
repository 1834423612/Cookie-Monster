export const EXTENSION_SYNC_MESSAGE_TYPE = "CM_EXTENSION_SYNC";
export const EXTENSION_SYNC_MESSAGE_SOURCE = "cookie-monster-extension";
export const EXTENSION_BRIDGE_READY_MESSAGE_TYPE = "CM_EXTENSION_BRIDGE_READY";

export interface ExtensionSyncMessageDetail {
  changedKeys?: string[];
  timestamp?: number;
}

export function subscribeToExtensionSync(
  callback: (detail: ExtensionSyncMessageDetail) => void
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleMessage = (event: MessageEvent) => {
    if (event.source !== window) {
      return;
    }

    const data = event.data as
      | {
          source?: string;
          type?: string;
          detail?: ExtensionSyncMessageDetail;
        }
      | undefined;

    if (
      !data ||
      data.source !== EXTENSION_SYNC_MESSAGE_SOURCE ||
      data.type !== EXTENSION_SYNC_MESSAGE_TYPE
    ) {
      return;
    }

    callback(data.detail || {});
  };

  window.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("message", handleMessage);
  };
}

export function subscribeToExtensionBridgeReady(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleMessage = (event: MessageEvent) => {
    if (event.source !== window) {
      return;
    }

    const data = event.data as
      | {
          source?: string;
          type?: string;
        }
      | undefined;

    if (
      !data ||
      data.source !== EXTENSION_SYNC_MESSAGE_SOURCE ||
      data.type !== EXTENSION_BRIDGE_READY_MESSAGE_TYPE
    ) {
      return;
    }

    callback();
  };

  window.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("message", handleMessage);
  };
}
