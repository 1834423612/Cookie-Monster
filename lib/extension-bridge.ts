/**
 * Cookie Monster Extension Bridge
 * 
 * This module handles communication between the website and the browser extension.
 * Summary data stays sanitized by default, while domain-detail views can request
 * raw cookie fields locally from the installed extension for on-device management.
 */

import {
  getMockDomainCookies,
  COOKIE_MONSTER_EXTENSION_ID,
  generateMockManagementState,
  type CleanupInsights,
  type CleanupPresetId,
  type CookieDomainCookie,
  type CookieDomainInventory,
  type CookieManagementState,
  type RecycleBinBatchSummary,
  generateMockReport as createMockReport,
  parseReportFile as parseCookieReportFile,
  type PendingFeedRequestSummary,
  type CookieSummaryReport,
} from "@/lib/cookie-report";

export type {
  CleanupInsights,
  CleanupPresetId,
  CookieDomainCookie,
  CookieDomainInventory,
  CookieManagementState,
  CookieSummaryReport,
  PendingFeedRequestSummary,
  RecycleBinBatchSummary,
} from "@/lib/cookie-report";

// Message types for extension communication
export type MessageType = 
  | "PING"
  | "GET_SUMMARY_REPORT"
  | "GET_FEED_PREVIEW"
  | "REQUEST_COOKIE_FEED"
  | "GET_COOKIE_MANAGEMENT_STATE"
  | "GET_DOMAIN_COOKIES"
  | "SET_DOMAIN_PROTECTION"
  | "DELETE_DOMAIN_COOKIES"
  | "DELETE_COOKIE_KEYS"
  | "RESTORE_CLEANUP_BATCH"
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
  data?:
    | CookieSummaryReport
    | CleanupInsights
    | PendingFeedRequestSummary
    | CookieManagementState
    | CookieDomainCookie[]
    | { version: string }
    | { extensionId: string }
    | null;
  error?: string;
}

export interface CookieFeedRequest {
  presetId: CleanupPresetId;
}

export interface DomainProtectionRequest {
  domain: string;
  protected: boolean;
}

export interface DomainDeleteRequest {
  domain: string;
}

export interface CookieDeleteRequest {
  keys: string[];
}

export interface CleanupBatchRestoreRequest {
  batchId: string;
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

export async function getCleanupPreview(): Promise<CleanupInsights | null> {
  const response = await sendMessageToExtension({ type: "GET_FEED_PREVIEW" });
  if (response.success && response.data && "presets" in response.data) {
    return response.data as CleanupInsights;
  }

  return null;
}

export async function requestCookieFeed(
  request: CookieFeedRequest
): Promise<PendingFeedRequestSummary | null> {
  const response = await sendMessageToExtension({
    type: "REQUEST_COOKIE_FEED",
    payload: request as unknown as Record<string, unknown>,
  });

  if (response.success && response.data && "requestId" in response.data) {
    return response.data as PendingFeedRequestSummary;
  }

  return null;
}

export async function getCookieManagementState(): Promise<CookieManagementState | null> {
  const response = await sendMessageToExtension({ type: "GET_COOKIE_MANAGEMENT_STATE" });
  if (response.success && response.data && "domains" in response.data) {
    return response.data as CookieManagementState;
  }

  return null;
}

export async function getDomainCookies(domain: string): Promise<CookieDomainCookie[]> {
  const response = await sendMessageToExtension({
    type: "GET_DOMAIN_COOKIES",
    payload: { domain },
  });

  if (response.success && Array.isArray(response.data)) {
    return response.data as CookieDomainCookie[];
  }

  return [];
}

export async function setDomainProtection(
  request: DomainProtectionRequest
): Promise<CookieManagementState | null> {
  const response = await sendMessageToExtension({
    type: "SET_DOMAIN_PROTECTION",
    payload: request as unknown as Record<string, unknown>,
  });

  if (response.success && response.data && "domains" in response.data) {
    return response.data as CookieManagementState;
  }

  return null;
}

export async function deleteDomainCookies(
  request: DomainDeleteRequest
): Promise<CookieManagementState | null> {
  const response = await sendMessageToExtension({
    type: "DELETE_DOMAIN_COOKIES",
    payload: request as unknown as Record<string, unknown>,
  });

  if (response.success && response.data && "domains" in response.data) {
    return response.data as CookieManagementState;
  }

  return null;
}

export async function deleteCookieKeys(
  request: CookieDeleteRequest
): Promise<CookieManagementState | null> {
  const response = await sendMessageToExtension({
    type: "DELETE_COOKIE_KEYS",
    payload: request as unknown as Record<string, unknown>,
  });

  if (response.success && response.data && "domains" in response.data) {
    return response.data as CookieManagementState;
  }

  return null;
}

export async function restoreCleanupBatch(
  request: CleanupBatchRestoreRequest
): Promise<CookieManagementState | null> {
  const response = await sendMessageToExtension({
    type: "RESTORE_CLEANUP_BATCH",
    payload: request as unknown as Record<string, unknown>,
  });

  if (response.success && response.data && "domains" in response.data) {
    return response.data as CookieManagementState;
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

export function generateMockCookieManagementState(): CookieManagementState {
  return generateMockManagementState();
}

export function getMockCookieDomainCookies(domain: string): CookieDomainCookie[] {
  return getMockDomainCookies(domain);
}
