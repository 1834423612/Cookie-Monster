// Chrome Extension API type declarations for external messaging

interface ChromeRuntime {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (response: unknown) => void
  ) => void;
  lastError?: {
    message: string;
  };
}

interface Chrome {
  runtime?: ChromeRuntime;
}

declare const chrome: Chrome | undefined;
