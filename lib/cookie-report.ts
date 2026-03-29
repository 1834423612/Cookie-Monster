export const COOKIE_MONSTER_EXTENSION_ID =
  process.env.NEXT_PUBLIC_EXTENSION_ID || "fkgahfgnfpnmnkbamedpjkeciljakheb";

export type CookieRiskLevel = "high" | "medium" | "low";
export type CookieCategory =
  | "essential"
  | "functional"
  | "analytics"
  | "advertising"
  | "unknown";
export type CleanupPresetId =
  | "balanced"
  | "expired"
  | "highRisk"
  | "trackers"
  | "longLived";

export interface CleanupPresetSummary {
  id: CleanupPresetId;
  label: string;
  description: string;
  cookieCount: number;
  domainCount: number;
  sampleDomains: string[];
}

export interface CleanupRecommendation {
  id: string;
  title: string;
  description: string;
  presetId: CleanupPresetId;
  cookieCount: number;
  tone: CookieRiskLevel;
}

export interface CleanupDomainSummary {
  domain: string;
  cookieCount: number;
  highRiskCount: number;
  analyticsCount: number;
  advertisingCount: number;
  samplePresetIds: CleanupPresetId[];
}

export interface CleanupInsights {
  totalCandidates: number;
  presets: CleanupPresetSummary[];
  recommendations: CleanupRecommendation[];
  topFeedDomains: CleanupDomainSummary[];
}

export interface PendingFeedRequestSummary {
  requestId: string;
  createdAt: string;
  presetId: CleanupPresetId;
  label: string;
  description: string;
  cookieCount: number;
  domainCount: number;
  sampleDomains: string[];
  source: "website";
}

export interface CookieDomainCookie {
  key: string;
  name: string;
  value: string;
  domain: string;
  path: string;
  storeId: string;
  size: number;
  category: CookieCategory;
  risk: CookieRiskLevel;
  reasons: string[];
  presetIds: CleanupPresetId[];
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  session: boolean;
  expirationDate: number | null;
}

export interface CookieDomainInventory {
  domain: string;
  cookieCount: number;
  protected: boolean;
  feedableCount: number;
  highRiskCount: number;
  categories: {
    essential: number;
    functional: number;
    analytics: number;
    advertising: number;
    unknown: number;
  };
  sampleCookieNames: string[];
  samplePresetIds: CleanupPresetId[];
}

export interface RecycleBinBatchSummary {
  id: string;
  label: string;
  presetId?: CleanupPresetId;
  createdAt: string;
  cookieCount: number;
  domainCount: number;
  sampleDomains: string[];
  source: "extension" | "website";
}

export interface CookieManagementState {
  generatedAt: string;
  protectedDomains: string[];
  domains: CookieDomainInventory[];
  recycleBin: RecycleBinBatchSummary[];
  pendingFeedRequest: PendingFeedRequestSummary | null;
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
  cleanup?: CleanupInsights;
}

function isNumberRecord(value: unknown, keys: string[]): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  return keys.every((key) => typeof (value as Record<string, unknown>)[key] === "number");
}

function isCleanupPresetId(value: unknown): value is CleanupPresetId {
  return (
    value === "balanced" ||
    value === "expired" ||
    value === "highRisk" ||
    value === "trackers" ||
    value === "longLived"
  );
}

function isRiskLevel(value: unknown): value is CookieRiskLevel {
  return value === "high" || value === "medium" || value === "low";
}

function isCleanupInsights(value: unknown): value is CleanupInsights {
  if (!value || typeof value !== "object") {
    return false;
  }

  const cleanup = value as Record<string, unknown>;

  if (
    typeof cleanup.totalCandidates !== "number" ||
    !Array.isArray(cleanup.presets) ||
    !Array.isArray(cleanup.recommendations) ||
    !Array.isArray(cleanup.topFeedDomains)
  ) {
    return false;
  }

  return (
    cleanup.presets.every((preset) => {
      if (!preset || typeof preset !== "object") {
        return false;
      }

      const candidate = preset as Record<string, unknown>;
      return (
        isCleanupPresetId(candidate.id) &&
        typeof candidate.label === "string" &&
        typeof candidate.description === "string" &&
        typeof candidate.cookieCount === "number" &&
        typeof candidate.domainCount === "number" &&
        Array.isArray(candidate.sampleDomains) &&
        candidate.sampleDomains.every((domain) => typeof domain === "string")
      );
    }) &&
    cleanup.recommendations.every((recommendation) => {
      if (!recommendation || typeof recommendation !== "object") {
        return false;
      }

      const candidate = recommendation as Record<string, unknown>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.title === "string" &&
        typeof candidate.description === "string" &&
        isCleanupPresetId(candidate.presetId) &&
        typeof candidate.cookieCount === "number" &&
        isRiskLevel(candidate.tone)
      );
    }) &&
    cleanup.topFeedDomains.every((domainSummary) => {
      if (!domainSummary || typeof domainSummary !== "object") {
        return false;
      }

      const candidate = domainSummary as Record<string, unknown>;
      return (
        typeof candidate.domain === "string" &&
        typeof candidate.cookieCount === "number" &&
        typeof candidate.highRiskCount === "number" &&
        typeof candidate.analyticsCount === "number" &&
        typeof candidate.advertisingCount === "number" &&
        Array.isArray(candidate.samplePresetIds) &&
        candidate.samplePresetIds.every((id) => isCleanupPresetId(id))
      );
    })
  );
}

export function parseReportFile(jsonString: string): CookieSummaryReport | null {
  try {
    const data = JSON.parse(jsonString) as Record<string, unknown>;

    if (
      typeof data.generatedAt !== "string" ||
      !isNumberRecord(data.totals, ["cookies", "domains", "stores"]) ||
      !isNumberRecord(data.risk, ["high", "medium", "low"]) ||
      !isNumberRecord(data.flags, [
        "secure",
        "httpOnly",
        "sameSiteStrict",
        "sameSiteLax",
        "sameSiteNone",
        "session",
        "persistent",
      ]) ||
      !isNumberRecord(data.expiry, [
        "expired",
        "expiringWithin24h",
        "expiringWithinWeek",
        "expiringWithinMonth",
        "longLived",
      ]) ||
      !isNumberRecord(data.categories, [
        "essential",
        "functional",
        "analytics",
        "advertising",
        "unknown",
      ]) ||
      !Array.isArray(data.topDomains)
    ) {
      return null;
    }

    if (data.rawCookies || data.cookieValues || data.values) {
      console.warn("Report file contains raw cookie data and was rejected.");
      return null;
    }

    const topDomainsValid = data.topDomains.every((entry) => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      const candidate = entry as Record<string, unknown>;
      return (
        typeof candidate.domain === "string" &&
        typeof candidate.count === "number" &&
        (candidate.riskLevel === "high" ||
          candidate.riskLevel === "medium" ||
          candidate.riskLevel === "low")
      );
    });

    if (!topDomainsValid) {
      return null;
    }

    if (typeof data.cleanup !== "undefined" && !isCleanupInsights(data.cleanup)) {
      return null;
    }

    return data as unknown as CookieSummaryReport;
  } catch {
    return null;
  }
}

export function downloadReportJson(
  report: CookieSummaryReport,
  prefix = "cookie-monster-report"
) {
  if (typeof window === "undefined") {
    return;
  }

  const safeStamp = report.generatedAt.replace(/[:.]/g, "-");
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");

  anchor.href = url;
  anchor.download = `${prefix}-${safeStamp}.json`;
  anchor.click();

  window.URL.revokeObjectURL(url);
}

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
    cleanup: {
      totalCandidates: 1310,
      presets: [
        {
          id: "balanced",
          label: "Balanced Feed",
          description: "A safe starter bundle of expired, tracker, and long-lived non-essential cookies.",
          cookieCount: 742,
          domainCount: 61,
          sampleDomains: ["facebook.com", "doubleclick.net", "reddit.com"],
        },
        {
          id: "trackers",
          label: "Tracker Feast",
          description: "Advertising and analytics cookies that are the easiest monster snacks.",
          cookieCount: 534,
          domainCount: 44,
          sampleDomains: ["facebook.com", "google.com", "tiktok.com"],
        },
        {
          id: "expired",
          label: "Expired Crumbs",
          description: "Already-expired cookies that can be swept out immediately.",
          cookieCount: 23,
          domainCount: 9,
          sampleDomains: ["oldsite.com", "legacy.app"],
        },
      ],
      recommendations: [
        {
          id: "mock-balanced",
          title: "Start with a balanced cleanup",
          description: "This removes the largest low-regret batch while keeping likely essential cookies alone.",
          presetId: "balanced",
          cookieCount: 742,
          tone: "medium",
        },
        {
          id: "mock-trackers",
          title: "Feed the obvious trackers next",
          description: "Advertising and analytics cookies make up the biggest monster meal in this snapshot.",
          presetId: "trackers",
          cookieCount: 534,
          tone: "high",
        },
      ],
      topFeedDomains: [
        {
          domain: "facebook.com",
          cookieCount: 65,
          highRiskCount: 41,
          analyticsCount: 6,
          advertisingCount: 33,
          samplePresetIds: ["trackers", "balanced", "highRisk"],
        },
        {
          domain: "google.com",
          cookieCount: 78,
          highRiskCount: 19,
          analyticsCount: 24,
          advertisingCount: 4,
          samplePresetIds: ["trackers", "balanced"],
        },
      ],
    },
  };
}

const MOCK_DOMAIN_COOKIES: Record<string, CookieDomainCookie[]> = {
  "google.com": [
    {
      key: "0::.google.com::/::SID",
      name: "SID",
      value: "google-session-token-demo",
      domain: "google.com",
      path: "/",
      storeId: "0",
      size: 26,
      category: "essential",
      risk: "low",
      reasons: ["Looks like an essential secure session cookie"],
      presetIds: [],
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      session: false,
      expirationDate: Date.now() / 1000 + 60 * 60 * 24 * 30,
    },
    {
      key: "0::.google.com::/::NID",
      name: "NID",
      value: "ad-personalization-demo",
      domain: "google.com",
      path: "/",
      storeId: "0",
      size: 22,
      category: "advertising",
      risk: "high",
      reasons: ["Matches advertising or tracker signature", "Persists for longer than 30 days"],
      presetIds: ["trackers", "balanced", "highRisk", "longLived"],
      secure: true,
      httpOnly: false,
      sameSite: "no_restriction",
      session: false,
      expirationDate: Date.now() / 1000 + 60 * 60 * 24 * 90,
    },
  ],
  "facebook.com": [
    {
      key: "0::.facebook.com::/::fr",
      name: "fr",
      value: "facebook-ad-cookie-demo",
      domain: "facebook.com",
      path: "/",
      storeId: "0",
      size: 23,
      category: "advertising",
      risk: "high",
      reasons: ["Matches advertising or tracker signature", "SameSite=None allows cross-site usage"],
      presetIds: ["trackers", "balanced", "highRisk"],
      secure: true,
      httpOnly: false,
      sameSite: "no_restriction",
      session: false,
      expirationDate: Date.now() / 1000 + 60 * 60 * 24 * 60,
    },
    {
      key: "0::.facebook.com::/::presence",
      name: "presence",
      value: "chat-state-demo",
      domain: "facebook.com",
      path: "/",
      storeId: "0",
      size: 15,
      category: "functional",
      risk: "medium",
      reasons: ["Readable by client-side scripts"],
      presetIds: [],
      secure: true,
      httpOnly: false,
      sameSite: "lax",
      session: true,
      expirationDate: null,
    },
  ],
  "reddit.com": [
    {
      key: "0::.reddit.com::/::loid",
      name: "loid",
      value: "reddit-analytics-demo",
      domain: "reddit.com",
      path: "/",
      storeId: "0",
      size: 20,
      category: "analytics",
      risk: "medium",
      reasons: ["Matches analytics signature", "Readable by client-side scripts"],
      presetIds: ["trackers", "balanced"],
      secure: true,
      httpOnly: false,
      sameSite: "lax",
      session: false,
      expirationDate: Date.now() / 1000 + 60 * 60 * 24 * 40,
    },
  ],
};

export function generateMockManagementState(): CookieManagementState {
  return {
    generatedAt: new Date().toISOString(),
    protectedDomains: ["google.com"],
    domains: [
      {
        domain: "google.com",
        cookieCount: 78,
        protected: true,
        feedableCount: 14,
        highRiskCount: 9,
        categories: {
          essential: 30,
          functional: 12,
          analytics: 20,
          advertising: 10,
          unknown: 6,
        },
        sampleCookieNames: ["SID", "NID", "_ga"],
        samplePresetIds: ["trackers", "balanced"],
      },
      {
        domain: "facebook.com",
        cookieCount: 65,
        protected: false,
        feedableCount: 41,
        highRiskCount: 33,
        categories: {
          essential: 8,
          functional: 7,
          analytics: 10,
          advertising: 34,
          unknown: 6,
        },
        sampleCookieNames: ["fr", "presence", "datr"],
        samplePresetIds: ["trackers", "balanced", "highRisk"],
      },
      {
        domain: "reddit.com",
        cookieCount: 25,
        protected: false,
        feedableCount: 11,
        highRiskCount: 4,
        categories: {
          essential: 4,
          functional: 6,
          analytics: 9,
          advertising: 2,
          unknown: 4,
        },
        sampleCookieNames: ["loid", "token_v2"],
        samplePresetIds: ["trackers", "balanced"],
      },
    ],
    recycleBin: [
      {
        id: "cleanup-demo-1",
        label: "Tracker Feast",
        presetId: "trackers",
        createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        cookieCount: 182,
        domainCount: 17,
        sampleDomains: ["facebook.com", "doubleclick.net", "reddit.com"],
        source: "website",
      },
      {
        id: "cleanup-demo-2",
        label: "Expired Crumbs",
        presetId: "expired",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
        cookieCount: 19,
        domainCount: 8,
        sampleDomains: ["oldsite.com", "legacy.app"],
        source: "extension",
      },
    ],
    pendingFeedRequest: {
      requestId: "feed-request-demo",
      createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      presetId: "balanced",
      label: "Balanced Feed",
      description: "A safe starter bundle of expired, tracker, and long-lived non-essential cookies.",
      cookieCount: 742,
      domainCount: 61,
      sampleDomains: ["facebook.com", "google.com", "reddit.com"],
      source: "website",
    },
  };
}

export function getMockDomainCookies(domain: string): CookieDomainCookie[] {
  return MOCK_DOMAIN_COOKIES[domain] || [];
}
