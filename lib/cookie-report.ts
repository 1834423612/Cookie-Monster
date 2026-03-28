export const COOKIE_MONSTER_EXTENSION_ID =
  process.env.NEXT_PUBLIC_EXTENSION_ID || "fkgahfgnfpnmnkbamedpjkeciljakheb";

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

function isNumberRecord(value: unknown, keys: string[]): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  return keys.every((key) => typeof (value as Record<string, unknown>)[key] === "number");
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

    return topDomainsValid ? (data as unknown as CookieSummaryReport) : null;
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
  };
}
