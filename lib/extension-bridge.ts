/**
 * Cookie Monster Extension Bridge
 *
 * This module handles communication between the website and the browser extension.
 * All data transferred is sanitized and contains NO raw cookie values.
 * Only summary/report data is exchanged for visualization purposes.
 */

import {
  COOKIE_MONSTER_EXTENSION_ID,
  type CleanupInsights,
  type CleanupPresetId,
  generateMockReport as createMockReport,
  parseReportFile as parseCookieReportFile,
  type PendingFeedRequestSummary,
  type CookieSummaryReport,
} from "@/lib/cookie-report";

export type {
  CleanupInsights,
  CleanupPresetId,
  CookieSummaryReport,
  PendingFeedRequestSummary,
} from "@/lib/cookie-report";

export type MessageType =
  | "PING"
  | "GET_SUMMARY_REPORT"
  | "GET_FEED_PREVIEW"
  | "GET_COOKIE_INVENTORY"
  | "REQUEST_COOKIE_FEED"
  | "OPEN_EXTENSION_DASHBOARD"
  | "EXPORT_REPORT"
  | "GET_EXTENSION_VERSION";

export interface ExtensionMessage {
  type: MessageType;
  payload?: Record<string, unknown>;
}

export interface CookieInventoryItem {
  key: string;
  name: string;
  domain: string;
  path: string;
  storeId: string;
  session: boolean;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  category: "essential" | "functional" | "analytics" | "advertising" | "unknown";
  risk: "high" | "medium" | "low";
  expirationDate: number | null;
  reasons: string[];
  recommendedKeep: boolean;
  presetIds: CleanupPresetId[];
}

export interface CookieDomainGroup {
  domain: string;
  total: number;
  highRiskCount: number;
  recommendedKeepCount: number;
  items: CookieInventoryItem[];
}

export interface ExtensionResponse {
  success: boolean;
  type: string;
  data?:
    | CookieSummaryReport
    | CleanupInsights
    | PendingFeedRequestSummary
    | CookieDomainGroup[]
    | { version: string }
    | { extensionId: string }
    | null;
  error?: string;
}

export interface CookieFeedRequest {
  presetId: CleanupPresetId;
}

const EXTENSION_ID_STORAGE_KEY = "cm_extension_id_override";

function getCandidateExtensionIds(): string[] {
  const ids = new Set<string>([COOKIE_MONSTER_EXTENSION_ID]);

  if (typeof window !== "undefined") {
    const override = window.localStorage.getItem(EXTENSION_ID_STORAGE_KEY);
    if (override && override.trim()) {
      ids.add(override.trim());
    }
  }

  return [...ids];
}

async function sendMessageWithId(
  extensionId: string,
  message: ExtensionMessage
): Promise<ExtensionResponse> {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.runtime) {
      resolve({ success: false, type: message.type, error: "Extension runtime unavailable" });
      return;
    }

    const runtime = chrome.runtime;

    try {
      runtime.sendMessage(extensionId, message, (response) => {
        const extensionResponse = response as ExtensionResponse | undefined;

        if (runtime.lastError) {
          resolve({
            success: false,
            type: message.type,
            error: runtime.lastError.message,
          });
          return;
        }

        if (!extensionResponse) {
          resolve({ success: false, type: message.type, error: "No response" });
          return;
        }

        resolve(extensionResponse);
      });
    } catch (error) {
      resolve({
        success: false,
        type: message.type,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}

export async function isExtensionInstalled(): Promise<boolean> {
  if (process.env.NODE_ENV === "development") {
    const skipCheck = typeof window !== "undefined" && window.localStorage.getItem("cm_dev_skip_extension") === "true";
    if (skipCheck) {
      return true;
    }
  }

  const response = await sendMessageToExtension({ type: "PING" });
  return response.success;
}

export async function sendMessageToExtension(message: ExtensionMessage): Promise<ExtensionResponse> {
  const candidates = getCandidateExtensionIds();
  let lastError = "Could not reach extension.";

  for (const extensionId of candidates) {
    const response = await sendMessageWithId(extensionId, message);
    if (response.success) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(EXTENSION_ID_STORAGE_KEY, extensionId);
      }
      return response;
    }

    if (response.error) {
      lastError = response.error;
    }
  }

  return { success: false, type: message.type, error: lastError };
}

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

export async function getCookieInventory(): Promise<CookieDomainGroup[] | null> {
  const response = await sendMessageToExtension({ type: "GET_COOKIE_INVENTORY" });

  if (response.success && Array.isArray(response.data)) {
    return response.data as CookieDomainGroup[];
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

export async function openExtensionDashboard(): Promise<boolean> {
  const response = await sendMessageToExtension({ type: "OPEN_EXTENSION_DASHBOARD" });
  return response.success;
}

export async function requestExportReport(): Promise<boolean> {
  const response = await sendMessageToExtension({ type: "EXPORT_REPORT" });
  return response.success;
}

export async function getExtensionVersion(): Promise<string | null> {
  const response = await sendMessageToExtension({ type: "GET_EXTENSION_VERSION" });
  if (response.success && response.data && "version" in response.data) {
    return response.data.version;
  }
  return null;
}

export function parseReportFile(jsonString: string): CookieSummaryReport | null {
  return parseCookieReportFile(jsonString);
}

export function generateMockReport(): CookieSummaryReport {
  return createMockReport();
}
