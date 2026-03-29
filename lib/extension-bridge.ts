/**
 * Cookie Monster Extension Bridge
 *
 * This module handles communication between the website and the browser extension.
 * All transferred data is sanitized and contains no raw cookie values.
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

export type MessageType =
  | "PING"
  | "GET_SUMMARY_REPORT"
  | "GET_FEED_PREVIEW"
  | "GET_COOKIE_INVENTORY"
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
    | CookieDomainGroup[]
    | CookieDomainCookie[]
    | CookieManagementState
    | { version: string }
    | { extensionId: string }
    | null;
  error?: string;
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

export interface CookieFeedRequest {
  presetId?: CleanupPresetId;
  keys?: string[];
  label?: string;
  description?: string;
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

const EXTENSION_ID_STORAGE_KEY = "cm_extension_id";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCookieSummaryReportData(value: unknown): value is CookieSummaryReport {
  return isRecord(value) && isRecord(value.totals) && typeof value.generatedAt === "string";
}

function isCleanupInsightsData(value: unknown): value is CleanupInsights {
  return isRecord(value) && Array.isArray(value.presets) && Array.isArray(value.recommendations);
}

function isPendingFeedRequestData(value: unknown): value is PendingFeedRequestSummary {
  return (
    isRecord(value) &&
    typeof value.requestId === "string" &&
    typeof value.label === "string" &&
    typeof value.cookieCount === "number"
  );
}

function isCookieDomainGroupData(value: unknown): value is CookieDomainGroup {
  return (
    isRecord(value) &&
    typeof value.domain === "string" &&
    typeof value.total === "number" &&
    typeof value.highRiskCount === "number" &&
    typeof value.recommendedKeepCount === "number" &&
    Array.isArray(value.items)
  );
}

function isCookieDomainCookieData(value: unknown): value is CookieDomainCookie {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.name === "string" &&
    typeof value.domain === "string" &&
    typeof value.path === "string" &&
    Array.isArray(value.reasons) &&
    Array.isArray(value.presetIds)
  );
}

function isCookieManagementStateData(value: unknown): value is CookieManagementState {
  return (
    isRecord(value) &&
    typeof value.generatedAt === "string" &&
    Array.isArray(value.protectedDomains) &&
    Array.isArray(value.domains) &&
    Array.isArray(value.recycleBin) &&
    (value.pendingFeedRequest === null || isPendingFeedRequestData(value.pendingFeedRequest))
  );
}

function isVersionData(value: unknown): value is { version: string } {
  return isRecord(value) && typeof value.version === "string";
}

function getCandidateExtensionIds(): string[] {
  const ids = new Set<string>();
  ids.add(COOKIE_MONSTER_EXTENSION_ID);

  if (typeof window !== "undefined") {
    const remembered = window.localStorage.getItem(EXTENSION_ID_STORAGE_KEY);
    if (remembered) {
      ids.add(remembered);
    }
  }

  return [...ids].filter(Boolean);
}

function rememberExtensionId(extensionId: string) {
  if (typeof window !== "undefined" && extensionId) {
    window.localStorage.setItem(EXTENSION_ID_STORAGE_KEY, extensionId);
  }
}

async function sendMessageToId(
  extensionId: string,
  message: ExtensionMessage
): Promise<ExtensionResponse> {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.runtime) {
      resolve({ success: false, type: message.type, error: "Extension API unavailable" });
      return;
    }

    const runtime = chrome.runtime;

    try {
      runtime.sendMessage(extensionId, message, (response) => {
        const extensionResponse = response as ExtensionResponse | undefined;

        if (runtime.lastError) {
          resolve({ success: false, type: message.type, error: runtime.lastError.message });
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

export async function sendMessageToExtension(
  message: ExtensionMessage
): Promise<ExtensionResponse> {
  if (typeof chrome === "undefined" || !chrome.runtime) {
    return { success: false, type: message.type, error: "Extension not available" };
  }

  const candidates = getCandidateExtensionIds();
  let lastKnownError: string | null = null;

  for (const extensionId of candidates) {
    const response = await sendMessageToId(extensionId, message);
    if (response.error) {
      lastKnownError = response.error;
    }

    if (response.success) {
      if (response.data && typeof response.data === "object" && "extensionId" in response.data) {
        const id = (response.data as { extensionId: string }).extensionId;
        if (id) {
          rememberExtensionId(id);
        }
      } else {
        rememberExtensionId(extensionId);
      }
      return response;
    }
  }

  return {
    success: false,
    type: message.type,
    error:
      lastKnownError ||
      "Unable to connect to Cookie Monster extension. Verify the extension ID and allowed website origin.",
  };
}

export async function isExtensionInstalled(): Promise<boolean> {
  if (process.env.NODE_ENV === "development") {
    const skipCheck =
      typeof window !== "undefined" && window.localStorage.getItem("cm_dev_skip_extension") === "true";
    if (skipCheck) return true;
  }

  try {
    const response = await sendMessageToExtension({ type: "PING" });
    return response.success;
  } catch {
    return false;
  }
}

export async function getSummaryReport(): Promise<CookieSummaryReport | null> {
  const response = await sendMessageToExtension({ type: "GET_SUMMARY_REPORT" });
  if (response.success && isCookieSummaryReportData(response.data)) {
    return response.data as CookieSummaryReport;
  }
  return null;
}

export async function getCleanupPreview(): Promise<CleanupInsights | null> {
  const response = await sendMessageToExtension({ type: "GET_FEED_PREVIEW" });
  if (response.success && isCleanupInsightsData(response.data)) {
    return response.data as CleanupInsights;
  }
  return null;
}

export async function getCookieInventory(): Promise<CookieDomainGroup[] | null> {
  const response = await sendMessageToExtension({ type: "GET_COOKIE_INVENTORY" });
  if (response.success && Array.isArray(response.data) && response.data.every(isCookieDomainGroupData)) {
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

  if (response.success && isPendingFeedRequestData(response.data)) {
    return response.data as PendingFeedRequestSummary;
  }

  return null;
}

export async function getCookieManagementState(): Promise<CookieManagementState | null> {
  const response = await sendMessageToExtension({ type: "GET_COOKIE_MANAGEMENT_STATE" });
  if (response.success && isCookieManagementStateData(response.data)) {
    return response.data as CookieManagementState;
  }

  return null;
}

export async function getDomainCookies(domain: string): Promise<CookieDomainCookie[]> {
  const response = await sendMessageToExtension({
    type: "GET_DOMAIN_COOKIES",
    payload: { domain },
  });

  if (response.success && Array.isArray(response.data) && response.data.every(isCookieDomainCookieData)) {
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

  if (response.success && isCookieManagementStateData(response.data)) {
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

  if (response.success && isCookieManagementStateData(response.data)) {
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

  if (response.success && isCookieManagementStateData(response.data)) {
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

  if (response.success && isCookieManagementStateData(response.data)) {
    return response.data as CookieManagementState;
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
  if (response.success && isVersionData(response.data)) {
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

export function generateMockCookieManagementState(): CookieManagementState {
  return generateMockManagementState();
}

export function getMockCookieDomainCookies(domain: string): CookieDomainCookie[] {
  return getMockDomainCookies(domain);
}
