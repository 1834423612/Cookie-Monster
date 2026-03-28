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
