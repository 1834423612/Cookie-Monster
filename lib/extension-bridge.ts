/**
 * Cookie Monster Extension Bridge
 * 
 * This module handles communication between the website and the browser extension.
 * All data transferred is sanitized and contains NO raw cookie values.
 * Only summary/report data is exchanged for visualization purposes.
 */

import {
  COOKIE_MONSTER_EXTENSION_ID,
  generateMockReport as createMockReport,
  parseReportFile as parseCookieReportFile,
  type CookieSummaryReport,
} from "@/lib/cookie-report";

export type { CookieSummaryReport } from "@/lib/cookie-report";

// Message types for extension communication
export type MessageType = 
  | "PING"
  | "GET_SUMMARY_REPORT"
  | "OPEN_EXTENSION_DASHBOARD"
  | "EXPORT_REPORT"
  | "GET_EXTENSION_VERSION";

export interface ExtensionMessage {
  type: MessageType;
  payload?: Record<string, unknown>;
}

export interface ExtensionResponse {
  success: boolean;
  type: string;
  data?: CookieSummaryReport | { version: string } | null;
  error?: string;
}

/**
 * Check if the Cookie Monster extension is installed
 */
export async function isExtensionInstalled(): Promise<boolean> {
  // In development mode, allow skipping extension check
  if (process.env.NODE_ENV === "development") {
    const skipCheck = typeof window !== "undefined" && 
      window.localStorage.getItem("cm_dev_skip_extension") === "true";
    if (skipCheck) return true;
  }

  if (typeof chrome === "undefined" || !chrome.runtime) {
    return false;
  }

  try {
    const response = await sendMessageToExtension({ type: "PING" });
    return response.success;
  } catch {
    return false;
  }
}

/**
 * Send a message to the extension
 */
export async function sendMessageToExtension(
  message: ExtensionMessage
): Promise<ExtensionResponse> {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.runtime) {
      resolve({ success: false, type: message.type, error: "Extension not available" });
      return;
    }

    const runtime = chrome.runtime;

    try {
      runtime.sendMessage(
        COOKIE_MONSTER_EXTENSION_ID,
        message,
        (response) => {
          const extensionResponse = response as ExtensionResponse | undefined;

          if (runtime.lastError) {
            resolve({ 
              success: false, 
              type: message.type, 
              error: runtime.lastError.message 
            });
          } else if (extensionResponse) {
            resolve(extensionResponse);
          } else {
            resolve({ success: false, type: message.type, error: "No response" });
          }
        }
      );
    } catch (error) {
      resolve({ 
        success: false, 
        type: message.type, 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
}

/**
 * Get the summary report from the extension (sanitized, no raw cookie values)
 */
export async function getSummaryReport(): Promise<CookieSummaryReport | null> {
  const response = await sendMessageToExtension({ type: "GET_SUMMARY_REPORT" });
  if (response.success && response.data && "totals" in response.data) {
    return response.data as CookieSummaryReport;
  }
  return null;
}

/**
 * Request the extension to open its dashboard
 */
export async function openExtensionDashboard(): Promise<boolean> {
  const response = await sendMessageToExtension({ type: "OPEN_EXTENSION_DASHBOARD" });
  return response.success;
}

/**
 * Request the extension to export a report file
 */
export async function requestExportReport(): Promise<boolean> {
  const response = await sendMessageToExtension({ type: "EXPORT_REPORT" });
  return response.success;
}

/**
 * Get extension version
 */
export async function getExtensionVersion(): Promise<string | null> {
  const response = await sendMessageToExtension({ type: "GET_EXTENSION_VERSION" });
  if (response.success && response.data && "version" in response.data) {
    return response.data.version;
  }
  return null;
}

/**
 * Parse a report JSON file (for manual import)
 * This validates the structure before accepting
 */
export function parseReportFile(jsonString: string): CookieSummaryReport | null {
  return parseCookieReportFile(jsonString);
}

/**
 * Generate mock data for development/demo purposes
 */
export function generateMockReport(): CookieSummaryReport {
  return createMockReport();
}
