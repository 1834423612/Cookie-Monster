/**
 * Cookie Monster Extension Bridge
 * 
 * This module handles communication between the website and the browser extension.
 * All data transferred is sanitized and contains NO raw cookie values.
 * Only summary/report data is exchanged for visualization purposes.
 */

// Extension ID - will be set after extension is published
const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID || "development";

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

export interface CookieSummaryReport {
  generatedAt: string;
  totals: {
    cookies: number;
    domains: number;
    stores: number;
  };
  risk: {
    high: number;
    medium: number;
    low: number;
  };
  flags: {
    secure: number;
    httpOnly: number;
    sameSiteStrict: number;
    sameSiteLax: number;
    sameSiteNone: number;
    session: number;
    persistent: number;
  };
  expiry: {
    expired: number;
    expiringWithin24h: number;
    expiringWithinWeek: number;
    expiringWithinMonth: number;
    longLived: number;
  };
  topDomains: Array<{
    domain: string;
    count: number;
    riskLevel: "high" | "medium" | "low";
  }>;
  categories: {
    essential: number;
    functional: number;
    analytics: number;
    advertising: number;
    unknown: number;
  };
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

    try {
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        message,
        (response: ExtensionResponse | undefined) => {
          if (chrome.runtime.lastError) {
            resolve({ 
              success: false, 
              type: message.type, 
              error: chrome.runtime.lastError.message 
            });
          } else if (response) {
            resolve(response);
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
  try {
    const data = JSON.parse(jsonString);
    
    // Validate required fields
    if (
      !data.generatedAt ||
      !data.totals ||
      typeof data.totals.cookies !== "number" ||
      typeof data.totals.domains !== "number"
    ) {
      return null;
    }
    
    // Ensure no raw cookie values are present (security check)
    if (data.rawCookies || data.cookieValues || data.values) {
      console.warn("Report file contains raw cookie data - rejecting for security");
      return null;
    }
    
    return data as CookieSummaryReport;
  } catch {
    return null;
  }
}

/**
 * Generate mock data for development/demo purposes
 */
export function generateMockReport(): CookieSummaryReport {
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      cookies: 2847,
      domains: 183,
      stores: 2,
    },
    risk: {
      high: 156,
      medium: 842,
      low: 1849,
    },
    flags: {
      secure: 1892,
      httpOnly: 1245,
      sameSiteStrict: 423,
      sameSiteLax: 1156,
      sameSiteNone: 1268,
      session: 634,
      persistent: 2213,
    },
    expiry: {
      expired: 23,
      expiringWithin24h: 87,
      expiringWithinWeek: 234,
      expiringWithinMonth: 567,
      longLived: 1936,
    },
    topDomains: [
      { domain: "google.com", count: 78, riskLevel: "medium" },
      { domain: "facebook.com", count: 65, riskLevel: "high" },
      { domain: "youtube.com", count: 54, riskLevel: "medium" },
      { domain: "twitter.com", count: 43, riskLevel: "medium" },
      { domain: "amazon.com", count: 38, riskLevel: "medium" },
      { domain: "linkedin.com", count: 32, riskLevel: "low" },
      { domain: "github.com", count: 28, riskLevel: "low" },
      { domain: "reddit.com", count: 25, riskLevel: "medium" },
    ],
    categories: {
      essential: 423,
      functional: 567,
      analytics: 892,
      advertising: 743,
      unknown: 222,
    },
  };
}
