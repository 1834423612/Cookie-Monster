const STORAGE_KEYS = {
  latestReport: "cm.latestReport",
  cleanupBatches: "cm.cleanupBatches",
  pendingFeedRequest: "cm.pendingFeedRequest",
  protectedDomains: "cm.protectedDomains",
};

const EXTERNAL_ALLOWED_HOSTS = new Set([
  "cookie-monster.app",
  "www.cookie-monster.app",
  "cookie-monster.vercel.app",
]);

const SYNC_BROADCAST_MATCHES = [
  "http://localhost/*",
  "http://127.0.0.1/*",
  "https://127.0.0.1/*",
  "https://localhost/*",
  "https://cookie-monster.app/*",
  "https://www.cookie-monster.app/*",
  "https://cookie-monster.vercel.app/*",
];

const KEYWORDS = {
  essential: ["session", "auth", "csrf", "xsrf", "sid", "token", "login", "__host-", "__secure-"],
  functional: ["lang", "locale", "theme", "prefs", "cart", "remember", "currency", "recent"],
  analytics: ["_ga", "_gid", "_gat", "analytics", "segment", "mixpanel", "amplitude", "plausible"],
  advertising: ["ad", "ads", "doubleclick", "fbp", "fr", "ttclid", "gcl", "campaign", "pixel"],
};

const PRESET_DEFINITIONS = {
  balanced: {
    id: "balanced",
    label: "Balanced Feed",
    description:
      "A low-regret starter bundle of expired, tracker, and long-lived non-essential cookies.",
  },
  expired: {
    id: "expired",
    label: "Expired Crumbs",
    description: "Already-expired cookies that can be removed with almost no downside.",
  },
  highRisk: {
    id: "highRisk",
    label: "High-Risk Bite",
    description: "Cookies with the strongest tracking or unsafe flag signals.",
  },
  trackers: {
    id: "trackers",
    label: "Tracker Feast",
    description: "Analytics and advertising cookies that make up the largest monster snack.",
  },
  longLived: {
    id: "longLived",
    label: "Long-Lived Leftovers",
    description: "Persistent non-essential cookies that have been hanging around for over 30 days.",
  },
};

function success(type, data = null) {
  return { success: true, type, data };
}

function failure(type, error) {
  return { success: false, type, error };
}

function getStorageValue(result, key, fallback) {
  return result && Object.prototype.hasOwnProperty.call(result, key)
    ? result[key]
    : fallback;
}

async function readLocal(key, fallback) {
  const result = await chrome.storage.local.get(key);
  return getStorageValue(result, key, fallback);
}

async function writeLocal(values) {
  await chrome.storage.local.set(values);
}

function getOriginFromSender(sender) {
  if (sender.origin) {
    return sender.origin;
  }

  if (!sender.url) {
    return null;
  }

  try {
    return new URL(sender.url).origin;
  } catch {
    return null;
  }
}

function isAllowedExternalSender(sender) {
  const origin = getOriginFromSender(sender);
  if (!origin) {
    return false;
  }

  try {
    const parsed = new URL(origin);
    const isLocalHost =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "[::1]" ||
      parsed.hostname === "::1";

    if (isLocalHost) {
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    }

    return parsed.protocol === "https:" && EXTERNAL_ALLOWED_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function isCleanupPresetId(value) {
  return Object.prototype.hasOwnProperty.call(PRESET_DEFINITIONS, value);
}

function cookieHost(domain = "") {
  return domain.startsWith(".") ? domain.slice(1) : domain;
}

function getCookieUrl(cookie) {
  const host = cookieHost(cookie.domain || "localhost");
  const path = cookie.path && cookie.path.startsWith("/") ? cookie.path : `/${cookie.path || ""}`;
  return `${cookie.secure ? "https" : "http"}://${host}${path}`;
}

function getKeywordBucket(cookie) {
  const text = `${cookie.name} ${cookie.domain}`.toLowerCase();

  for (const [category, keywords] of Object.entries(KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return category;
    }
  }

  return "unknown";
}

function getCategory(cookie) {
  const bucket = getKeywordBucket(cookie);

  if (
    bucket === "essential" ||
    bucket === "functional" ||
    bucket === "analytics" ||
    bucket === "advertising"
  ) {
    return bucket;
  }

  return "unknown";
}

function isExpired(cookie) {
  return typeof cookie.expirationDate === "number" && cookie.expirationDate <= Date.now() / 1000;
}

function isLongLived(cookie) {
  if (typeof cookie.expirationDate !== "number") {
    return false;
  }

  return cookie.expirationDate - Date.now() / 1000 > 60 * 60 * 24 * 30;
}

function createEmptyReport() {
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      cookies: 0,
      domains: 0,
      stores: 0,
    },
    risk: {
      high: 0,
      medium: 0,
      low: 0,
    },
    flags: {
      secure: 0,
      httpOnly: 0,
      sameSiteStrict: 0,
      sameSiteLax: 0,
      sameSiteNone: 0,
      session: 0,
      persistent: 0,
    },
    expiry: {
      expired: 0,
      expiringWithin24h: 0,
      expiringWithinWeek: 0,
      expiringWithinMonth: 0,
      longLived: 0,
    },
    topDomains: [],
    categories: {
      essential: 0,
      functional: 0,
      analytics: 0,
      advertising: 0,
      unknown: 0,
    },
    cleanup: {
      totalCandidates: 0,
      presets: [],
      recommendations: [],
      topFeedDomains: [],
    },
  };
}

async function getProtectedDomains() {
  const domains = await readLocal(STORAGE_KEYS.protectedDomains, []);
  return [...new Set((domains || []).map((domain) => cookieHost(domain)).filter(Boolean))].sort();
}

function createCookieKey(cookie) {
  return [cookie.storeId || "default", cookie.domain, cookie.path, cookie.name].join("::");
}

function analyzeCookie(cookie, protectedDomainSet) {
  const category = getCategory(cookie);
  const domain = cookieHost(cookie.domain || "unknown");
  const reasons = [];
  const presetIds = new Set();
  const protectedDomain = protectedDomainSet.has(domain);
  let score = 0;

  if (protectedDomain) {
    reasons.push("Domain is protected");
  }

  if (isExpired(cookie)) {
    score += 5;
    reasons.push("Already expired");
    if (!protectedDomain) {
      presetIds.add("expired");
      presetIds.add("balanced");
    }
  }

  if (category === "advertising") {
    score += 4;
    reasons.push("Matches advertising or tracker signature");
    if (!protectedDomain) {
      presetIds.add("trackers");
      presetIds.add("balanced");
    }
  }

  if (category === "analytics") {
    score += 2;
    reasons.push("Matches analytics signature");
    if (!protectedDomain) {
      presetIds.add("trackers");
      presetIds.add("balanced");
    }
  }

  if (!cookie.secure) {
    score += 1;
    reasons.push("Not marked Secure");
  }

  if (!cookie.httpOnly) {
    score += 1;
    reasons.push("Readable by client-side scripts");
  }

  if (cookie.sameSite === "no_restriction") {
    score += 2;
    reasons.push("SameSite=None allows cross-site usage");
  }

  if (isLongLived(cookie)) {
    score += 1;
    reasons.push("Persists for longer than 30 days");
    if (!protectedDomain && category !== "essential" && !cookie.session) {
      presetIds.add("longLived");
      presetIds.add("balanced");
    }
  }

  if (category === "essential" && cookie.session && cookie.secure) {
    score -= 3;
    reasons.push("Looks like an essential secure session cookie");
    presetIds.clear();
  }

  const risk = score >= 5 ? "high" : score >= 2 ? "medium" : "low";

  if (!protectedDomain && risk === "high" && category !== "essential") {
    presetIds.add("highRisk");
    presetIds.add("balanced");
  }

  return {
    key: createCookieKey(cookie),
    cookie,
    domain,
    category,
    protectedDomain,
    presetIds: [...presetIds],
    reasons: reasons.slice(0, 5),
    risk,
  };
}

function buildCleanupInsights(analyzedCookies) {
  const candidates = analyzedCookies.filter((item) => item.presetIds.length > 0);
  const presetStats = new Map();
  const domainStats = new Map();

  for (const presetId of Object.keys(PRESET_DEFINITIONS)) {
    presetStats.set(presetId, {
      id: presetId,
      label: PRESET_DEFINITIONS[presetId].label,
      description: PRESET_DEFINITIONS[presetId].description,
      cookieCount: 0,
      domains: new Set(),
      sampleDomains: new Set(),
    });
  }

  for (const item of candidates) {
    for (const presetId of item.presetIds) {
      const preset = presetStats.get(presetId);
      preset.cookieCount += 1;
      preset.domains.add(item.domain);
      if (preset.sampleDomains.size < 4) {
        preset.sampleDomains.add(item.domain);
      }
    }

    const currentDomain = domainStats.get(item.domain) || {
      domain: item.domain,
      cookieCount: 0,
      highRiskCount: 0,
      analyticsCount: 0,
      advertisingCount: 0,
      samplePresetIds: new Set(),
    };

    currentDomain.cookieCount += 1;
    if (item.risk === "high") {
      currentDomain.highRiskCount += 1;
    }
    if (item.category === "analytics") {
      currentDomain.analyticsCount += 1;
    }
    if (item.category === "advertising") {
      currentDomain.advertisingCount += 1;
    }
    for (const presetId of item.presetIds) {
      if (currentDomain.samplePresetIds.size < 3) {
        currentDomain.samplePresetIds.add(presetId);
      }
    }

    domainStats.set(item.domain, currentDomain);
  }

  const presets = [...presetStats.values()]
    .map((preset) => ({
      id: preset.id,
      label: preset.label,
      description: preset.description,
      cookieCount: preset.cookieCount,
      domainCount: preset.domains.size,
      sampleDomains: [...preset.sampleDomains],
    }))
    .filter((preset) => preset.cookieCount > 0)
    .sort((left, right) => right.cookieCount - left.cookieCount);

  const recommendations = [];
  const balanced = presets.find((preset) => preset.id === "balanced");
  if (balanced) {
    recommendations.push({
      id: "recommended-balanced",
      title: "Start with a balanced cleanup",
      description:
        "This removes the biggest low-regret bundle while leaving likely essential cookies alone.",
      presetId: "balanced",
      cookieCount: balanced.cookieCount,
      tone: "medium",
    });
  }

  const trackers = presets.find((preset) => preset.id === "trackers");
  if (trackers) {
    recommendations.push({
      id: "recommended-trackers",
      title: "Feed the obvious trackers",
      description:
        "Analytics and advertising cookies are the clearest monster snacks in this scan.",
      presetId: "trackers",
      cookieCount: trackers.cookieCount,
      tone: "high",
    });
  }

  const expired = presets.find((preset) => preset.id === "expired");
  if (expired) {
    recommendations.push({
      id: "recommended-expired",
      title: "Sweep expired crumbs",
      description: "Expired cookies are safe to remove and make a simple first cleanup.",
      presetId: "expired",
      cookieCount: expired.cookieCount,
      tone: "low",
    });
  }

  return {
    totalCandidates: candidates.length,
    presets,
    recommendations: recommendations.slice(0, 3),
    topFeedDomains: [...domainStats.values()]
      .map((domain) => ({
        domain: domain.domain,
        cookieCount: domain.cookieCount,
        highRiskCount: domain.highRiskCount,
        analyticsCount: domain.analyticsCount,
        advertisingCount: domain.advertisingCount,
        samplePresetIds: [...domain.samplePresetIds],
      }))
      .sort((left, right) => right.cookieCount - left.cookieCount)
      .slice(0, 8),
  };
}

function buildCookieInventoryGroups(analyzedCookies) {
  const groups = new Map();

  for (const item of analyzedCookies) {
    const current = groups.get(item.domain) || {
      domain: item.domain,
      total: 0,
      highRiskCount: 0,
      recommendedKeepCount: 0,
      items: [],
    };

    const recommendedKeep =
      item.category === "essential" && item.cookie.session && item.cookie.secure;

    current.total += 1;
    if (item.risk === "high") {
      current.highRiskCount += 1;
    }
    if (recommendedKeep) {
      current.recommendedKeepCount += 1;
    }

    current.items.push({
      key: item.key,
      name: item.cookie.name,
      domain: item.domain,
      path: item.cookie.path || "/",
      storeId: item.cookie.storeId || "default",
      session: Boolean(item.cookie.session),
      secure: Boolean(item.cookie.secure),
      httpOnly: Boolean(item.cookie.httpOnly),
      sameSite: item.cookie.sameSite || "unspecified",
      category: item.category,
      risk: item.risk,
      expirationDate:
        typeof item.cookie.expirationDate === "number" ? item.cookie.expirationDate : null,
      reasons: item.reasons,
      recommendedKeep,
      presetIds: item.presetIds,
    });

    groups.set(item.domain, current);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: group.items.sort((left, right) => {
        const riskScore = { high: 3, medium: 2, low: 1 };
        const riskDelta = riskScore[right.risk] - riskScore[left.risk];
        if (riskDelta !== 0) {
          return riskDelta;
        }

        if (left.recommendedKeep !== right.recommendedKeep) {
          return left.recommendedKeep ? 1 : -1;
        }

        return left.name.localeCompare(right.name);
      }),
    }))
    .sort((left, right) => right.total - left.total);
}

function buildSummaryReportFromAnalyzed(analyzedCookies) {
  const report = createEmptyReport();
  const domainStats = new Map();
  const stores = new Set();
  const now = Date.now() / 1000;

  report.generatedAt = new Date().toISOString();
  report.totals.cookies = analyzedCookies.length;

  for (const item of analyzedCookies) {
    const { cookie, category, risk, domain } = item;

    stores.add(cookie.storeId || "default");
    report.risk[risk] += 1;
    report.categories[category] += 1;

    if (cookie.secure) {
      report.flags.secure += 1;
    }
    if (cookie.httpOnly) {
      report.flags.httpOnly += 1;
    }
    if (cookie.session) {
      report.flags.session += 1;
    } else {
      report.flags.persistent += 1;
    }

    if (cookie.sameSite === "strict") {
      report.flags.sameSiteStrict += 1;
    } else if (cookie.sameSite === "lax") {
      report.flags.sameSiteLax += 1;
    } else if (cookie.sameSite === "no_restriction") {
      report.flags.sameSiteNone += 1;
    }

    if (typeof cookie.expirationDate === "number") {
      const delta = cookie.expirationDate - now;
      if (delta <= 0) {
        report.expiry.expired += 1;
      } else if (delta <= 60 * 60 * 24) {
        report.expiry.expiringWithin24h += 1;
      } else if (delta <= 60 * 60 * 24 * 7) {
        report.expiry.expiringWithinWeek += 1;
      } else if (delta <= 60 * 60 * 24 * 30) {
        report.expiry.expiringWithinMonth += 1;
      } else {
        report.expiry.longLived += 1;
      }
    }

    const currentDomain = domainStats.get(domain) || {
      domain,
      count: 0,
      riskLevel: "low",
    };

    currentDomain.count += 1;
    if (
      (risk === "high" && currentDomain.riskLevel !== "high") ||
      (risk === "medium" && currentDomain.riskLevel === "low")
    ) {
      currentDomain.riskLevel = risk;
    }

    domainStats.set(domain, currentDomain);
  }

  report.totals.domains = domainStats.size;
  report.totals.stores = stores.size;
  report.topDomains = [...domainStats.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);
  report.cleanup = buildCleanupInsights(analyzedCookies);

  return report;
}

function buildManagementState(analyzedCookies, cleanupBatches, protectedDomains, pendingFeedRequest) {
  const domainStats = new Map();

  for (const item of analyzedCookies) {
    const currentDomain = domainStats.get(item.domain) || {
      domain: item.domain,
      cookieCount: 0,
      protected: protectedDomains.includes(item.domain),
      feedableCount: 0,
      highRiskCount: 0,
      categories: {
        essential: 0,
        functional: 0,
        analytics: 0,
        advertising: 0,
        unknown: 0,
      },
      sampleCookieNames: [],
      samplePresetIds: new Set(),
    };

    currentDomain.cookieCount += 1;
    currentDomain.categories[item.category] += 1;

    if (!item.protectedDomain && item.presetIds.length > 0) {
      currentDomain.feedableCount += 1;
    }

    if (item.risk === "high") {
      currentDomain.highRiskCount += 1;
    }

    if (currentDomain.sampleCookieNames.length < 4) {
      currentDomain.sampleCookieNames.push(item.cookie.name);
    }

    for (const presetId of item.presetIds) {
      if (currentDomain.samplePresetIds.size < 4) {
        currentDomain.samplePresetIds.add(presetId);
      }
    }

    domainStats.set(item.domain, currentDomain);
  }

  return {
    generatedAt: new Date().toISOString(),
    protectedDomains,
    domains: [...domainStats.values()]
      .map((domain) => ({
        ...domain,
        samplePresetIds: [...domain.samplePresetIds],
      }))
      .sort((left, right) => right.cookieCount - left.cookieCount),
    recycleBin: cleanupBatches.map((batch) => ({
      id: batch.id,
      label: batch.label,
      presetId: batch.presetId,
      createdAt: batch.createdAt,
      cookieCount: batch.cookieCount,
      domainCount: batch.domainCount,
      sampleDomains: batch.sampleDomains || [],
      source: batch.source || "extension",
    })),
    pendingFeedRequest,
  };
}

async function getRawAndAnalyzedCookies() {
  const [rawCookies, protectedDomains] = await Promise.all([
    chrome.cookies.getAll({}),
    getProtectedDomains(),
  ]);
  const protectedDomainSet = new Set(protectedDomains);
  const analyzedCookies = rawCookies.map((cookie) => analyzeCookie(cookie, protectedDomainSet));

  return {
    rawCookies,
    analyzedCookies,
    protectedDomains,
  };
}

async function scanCookies() {
  const { analyzedCookies } = await getRawAndAnalyzedCookies();
  const report = buildSummaryReportFromAnalyzed(analyzedCookies);
  await writeLocal({ [STORAGE_KEYS.latestReport]: report });
  return report;
}

async function getLatestReport(options = {}) {
  const { forceRefresh = false, refreshIfMissing = false } = options;

  if (forceRefresh) {
    return scanCookies();
  }

  const report = await readLocal(STORAGE_KEYS.latestReport, null);
  if (report) {
    return report;
  }

  if (refreshIfMissing) {
    return scanCookies();
  }

  return null;
}

function createBackupCookie(cookie) {
  return {
    key: createCookieKey(cookie),
    domain: cookie.domain,
    expirationDate: cookie.expirationDate,
    hostOnly: cookie.hostOnly,
    httpOnly: cookie.httpOnly,
    name: cookie.name,
    path: cookie.path,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    session: cookie.session,
    storeId: cookie.storeId,
    value: cookie.value,
  };
}

function getStoredCookieKey(cookie) {
  if (typeof cookie?.key === "string" && cookie.key) {
    return cookie.key;
  }

  return createCookieKey(cookie);
}

function buildCleanupBatchSummary(batch) {
  return {
    id: batch.id,
    label: batch.label,
    presetId: batch.presetId,
    createdAt: batch.createdAt,
    cookieCount: batch.cookieCount,
    domainCount: batch.domainCount,
    sampleDomains: batch.sampleDomains || [],
    source: batch.source || "extension",
  };
}

function buildStoredCookiePreview(cookie) {
  const domain = cookieHost(cookie.domain || "unknown");

  return {
    key: getStoredCookieKey(cookie),
    name: cookie.name,
    domain,
    path: cookie.path || "/",
    storeId: cookie.storeId || "default",
    secure: Boolean(cookie.secure),
    httpOnly: Boolean(cookie.httpOnly),
    sameSite: cookie.sameSite || "unspecified",
    session: Boolean(cookie.session),
    expirationDate:
      typeof cookie.expirationDate === "number" ? cookie.expirationDate : null,
    valueSize: cookie.value?.length || 0,
  };
}

function buildPlanFromMode(analyzedCookies, mode) {
  let candidates = [];
  let label = "Custom Cleanup";
  let description = "A custom cookie cleanup request.";
  let presetId;

  if (mode.type === "preset") {
    const definition = PRESET_DEFINITIONS[mode.presetId];
    candidates = analyzedCookies.filter((item) => item.presetIds.includes(mode.presetId));
    label = definition.label;
    description = definition.description;
    presetId = mode.presetId;
  }

  if (mode.type === "domain") {
    candidates = analyzedCookies.filter((item) => item.domain === mode.domain);
    label = `Domain Feed: ${mode.domain}`;
    description = `All removable cookies currently stored for ${mode.domain}.`;
  }

  if (mode.type === "keys") {
    const keySet = new Set(mode.keys);
    candidates = analyzedCookies.filter((item) => keySet.has(item.key));
    label = `Selected Cookie Feed`;
    description = "Only the specific cookies selected from the website control surface.";
  }

  if (!candidates.length) {
    return {
      candidates: [],
      cookieCount: 0,
      description,
      domainCount: 0,
      label,
      presetId,
      sampleDomains: [],
    };
  }

  const protectedMatches = candidates.filter((item) => item.protectedDomain);
  if (protectedMatches.length) {
    const protectedDomainNames = [...new Set(protectedMatches.map((item) => item.domain))];
    throw new Error(
      `Protected domain blocked cleanup: ${protectedDomainNames.slice(0, 3).join(", ")}`
    );
  }

  const sampleDomains = [...new Set(candidates.map((item) => item.domain))];

  return {
    candidates,
    cookieCount: candidates.length,
    description,
    domainCount: sampleDomains.length,
    label,
    presetId,
    sampleDomains: sampleDomains.slice(0, 6),
  };
}

async function removeCookie(cookie) {
  try {
    const result = await chrome.cookies.remove({
      name: cookie.name,
      storeId: cookie.storeId,
      url: getCookieUrl(cookie),
    });

    return Boolean(result);
  } catch {
    return false;
  }
}

async function restoreCookie(cookie) {
  const details = {
    httpOnly: cookie.httpOnly,
    name: cookie.name,
    path: cookie.path,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    storeId: cookie.storeId,
    url: getCookieUrl(cookie),
    value: cookie.value,
  };

  if (!cookie.hostOnly && cookie.domain) {
    details.domain = cookie.domain;
  }

  if (!cookie.session && typeof cookie.expirationDate === "number") {
    details.expirationDate = cookie.expirationDate;
  }

  try {
    await chrome.cookies.set(details);
    return true;
  } catch {
    return false;
  }
}

async function storeCleanupBatch(successfulCookies, plan, source) {
  if (!successfulCookies.length) {
    return null;
  }

  const batch = {
    createdAt: new Date().toISOString(),
    cookieCount: successfulCookies.length,
    cookies: successfulCookies.map(createBackupCookie),
    domainCount: new Set(successfulCookies.map((cookie) => cookieHost(cookie.domain || ""))).size,
    id: `cleanup-${Date.now()}`,
    label: plan.label,
    presetId: plan.presetId,
    reason: plan.description,
    sampleDomains: plan.sampleDomains,
    source,
  };

  const existingBatches = await readLocal(STORAGE_KEYS.cleanupBatches, []);
  await writeLocal({
    [STORAGE_KEYS.cleanupBatches]: [batch, ...existingBatches].slice(0, 25),
  });

  return batch;
}

async function executeDeletionPlan(mode, source) {
  const { analyzedCookies } = await getRawAndAnalyzedCookies();
  const plan = buildPlanFromMode(analyzedCookies, mode);

  if (!plan.cookieCount) {
    return {
      batch: null,
      deletedCount: 0,
      failedCount: 0,
      plan: {
        cookieCount: 0,
        description: plan.description,
        domainCount: plan.domainCount,
        label: plan.label,
        presetId: plan.presetId,
        sampleDomains: plan.sampleDomains,
      },
      report: await scanCookies(),
    };
  }

  const results = await Promise.allSettled(
    plan.candidates.map((candidate) => removeCookie(candidate.cookie))
  );

  const successfulCookies = plan.candidates
    .filter((candidate, index) => results[index].status === "fulfilled" && results[index].value)
    .map((candidate) => candidate.cookie);

  const deletedCount = successfulCookies.length;
  const failedCount = plan.candidates.length - deletedCount;
  const batch = await storeCleanupBatch(successfulCookies, plan, source);

  return {
    batch: batch
      ? {
          createdAt: batch.createdAt,
          id: batch.id,
          presetId: batch.presetId,
        }
      : null,
    deletedCount,
    failedCount,
    plan: {
      cookieCount: plan.cookieCount,
      description: plan.description,
      domainCount: plan.domainCount,
      label: plan.label,
      presetId: plan.presetId,
      sampleDomains: plan.sampleDomains,
    },
    report: await scanCookies(),
  };
}

async function restoreCleanupBatchById(batchId, selectedKeys = null) {
  const batches = await readLocal(STORAGE_KEYS.cleanupBatches, []);
  const batch = batches.find((entry) => entry.id === batchId);

  if (!batch) {
    throw new Error("That recycle-bin batch could not be found.");
  }

  const selectedKeySet = selectedKeys?.length ? new Set(selectedKeys) : null;
  const targetCookies = selectedKeySet
    ? batch.cookies.filter((cookie) => selectedKeySet.has(getStoredCookieKey(cookie)))
    : batch.cookies;

  if (!targetCookies.length) {
    throw new Error("No matching cookies were found in that recycle-bin batch.");
  }

  const results = await Promise.allSettled(targetCookies.map(restoreCookie));
  const restoredCookies = targetCookies.filter(
    (_cookie, index) => results[index].status === "fulfilled" && results[index].value
  );
  const restoredKeySet = new Set(restoredCookies.map(getStoredCookieKey));
  const restoredCount = restoredCookies.length;
  const failedCount = targetCookies.length - restoredCount;
  const remainingCookies = batch.cookies.filter(
    (cookie) => !restoredKeySet.has(getStoredCookieKey(cookie))
  );

  const nextBatches = batches.flatMap((entry) => {
    if (entry.id !== batchId) {
      return [entry];
    }

    if (!remainingCookies.length) {
      return [];
    }

    return [
      {
        ...entry,
        cookieCount: remainingCookies.length,
        cookies: remainingCookies,
        domainCount: new Set(
          remainingCookies.map((cookie) => cookieHost(cookie.domain || ""))
        ).size,
        sampleDomains: [...new Set(remainingCookies.map((cookie) => cookieHost(cookie.domain || "")))]
          .filter(Boolean)
          .slice(0, 6),
      },
    ];
  });

  await writeLocal({
    [STORAGE_KEYS.cleanupBatches]: nextBatches,
  });

  return {
    failedCount,
    remainingCount: remainingCookies.length,
    restoredCount,
    restoredPresetId: batch.presetId,
    report: await scanCookies(),
  };
}

async function restoreLastCleanup() {
  const batches = await readLocal(STORAGE_KEYS.cleanupBatches, []);
  const latestBatch = batches[0];

  if (!latestBatch) {
    return {
      restoredCount: 0,
      failedCount: 0,
      report: await getLatestReport({ refreshIfMissing: true }),
    };
  }

  return restoreCleanupBatchById(latestBatch.id);
}

async function getPendingFeedRequestDetails() {
  const pendingFeedRequest = await readLocal(STORAGE_KEYS.pendingFeedRequest, null);

  if (!pendingFeedRequest) {
    return null;
  }

  const { analyzedCookies } = await getRawAndAnalyzedCookies();
  const keys = getKeysFromPayload(pendingFeedRequest);
  const presetId = getPresetIdFromPayload(pendingFeedRequest);

  if (!keys && !presetId) {
    return {
      cookies: [],
      request: pendingFeedRequest,
    };
  }

  const plan = buildPlanFromMode(
    analyzedCookies,
    keys ? { type: "keys", keys } : { type: "preset", presetId }
  );

  return {
    cookies: plan.candidates.map((candidate) => ({
      category: candidate.category,
      domain: candidate.domain,
      expirationDate:
        typeof candidate.cookie.expirationDate === "number"
          ? candidate.cookie.expirationDate
          : null,
      httpOnly: Boolean(candidate.cookie.httpOnly),
      key: candidate.key,
      name: candidate.cookie.name,
      path: candidate.cookie.path || "/",
      presetIds: candidate.presetIds,
      reasons: candidate.reasons,
      recommendedKeep:
        candidate.category === "essential" &&
        candidate.cookie.session &&
        candidate.cookie.secure,
      risk: candidate.risk,
      sameSite: candidate.cookie.sameSite || "unspecified",
      secure: Boolean(candidate.cookie.secure),
      session: Boolean(candidate.cookie.session),
      storeId: candidate.cookie.storeId || "default",
    })),
    request: pendingFeedRequest,
  };
}

async function getRecycleBinBatchDetails(batchId) {
  const batches = await readLocal(STORAGE_KEYS.cleanupBatches, []);
  const batch = batches.find((entry) => entry.id === batchId);

  if (!batch) {
    throw new Error("That recycle-bin batch could not be found.");
  }

  return {
    batch: buildCleanupBatchSummary(batch),
    cookies: batch.cookies.map(buildStoredCookiePreview),
  };
}

function buildExportFilename(prefix, timestamp) {
  return `${prefix}-${timestamp.replace(/[:.]/g, "-")}.json`;
}

async function exportJsonFile(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  try {
    await chrome.downloads.download({
      filename,
      saveAs: true,
      url,
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function exportLatestReport() {
  const report = await getLatestReport({ refreshIfMissing: true });
  await exportJsonFile(
    buildExportFilename("cookie-monster-report", report.generatedAt),
    report
  );
  return report;
}

async function exportLatestBackup() {
  const batches = await readLocal(STORAGE_KEYS.cleanupBatches, []);
  const latestBatch = batches[0];

  if (!latestBatch) {
    return null;
  }

  await exportJsonFile(
    buildExportFilename("cookie-monster-backup", latestBatch.createdAt),
    {
      batch: latestBatch,
      exportedAt: new Date().toISOString(),
      warning:
        "This backup contains raw cookie values and should remain on a trusted device.",
    }
  );

  return latestBatch;
}

async function openDashboardPage() {
  await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
}

async function syncActionClickBehavior() {
  if (!chrome.sidePanel?.setPanelBehavior) {
    return;
  }

  await chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: false,
  });
}

async function openSidePanelForCurrentWindow() {
  if (!chrome.sidePanel?.open) {
    throw new Error("Side panel is not supported in this browser.");
  }

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTab || typeof activeTab.windowId !== "number") {
    throw new Error("Could not determine the current browser window.");
  }

  await chrome.sidePanel.open({ windowId: activeTab.windowId });
}

async function updateActionBadge() {
  if (!chrome.action?.setBadgeText) {
    return;
  }

  const pendingFeedRequest = await readLocal(STORAGE_KEYS.pendingFeedRequest, null);
  const pendingCount = Number(pendingFeedRequest?.cookieCount || 0);

  await chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
  await chrome.action.setBadgeText({
    text: pendingCount > 99 ? "99+" : pendingCount > 0 ? String(pendingCount) : "",
  });
}

async function broadcastWebsiteUpdate(detail = {}) {
  const tabs = await chrome.tabs.query({
    url: SYNC_BROADCAST_MATCHES,
  });

  await Promise.allSettled(
    tabs
      .filter((tab) => typeof tab.id === "number")
      .map((tab) =>
        chrome.tabs.sendMessage(tab.id, {
          detail: {
            ...detail,
            timestamp: Date.now(),
          },
          type: "CM_EXTENSION_SYNC",
        })
      )
  );
}

async function clearPendingFeedRequest() {
  await writeLocal({ [STORAGE_KEYS.pendingFeedRequest]: null });
}

function getTextValueFromPayload(payload, key) {
  if (payload && typeof payload[key] === "string" && payload[key].trim()) {
    return payload[key].trim();
  }

  return null;
}

async function createPendingFeedRequest(mode, options = {}) {
  const { analyzedCookies } = await getRawAndAnalyzedCookies();
  const plan = buildPlanFromMode(analyzedCookies, mode);

  if (!plan.cookieCount) {
    return null;
  }

  const request = {
    cookieCount: plan.cookieCount,
    createdAt: new Date().toISOString(),
    description: options.description || plan.description,
    domainCount: plan.domainCount,
    label: options.label || plan.label,
    presetId: mode.type === "preset" ? mode.presetId : options.presetId,
    requestId: `feed-request-${Date.now()}`,
    sampleDomains: plan.sampleDomains,
    selectionType: mode.type,
    source: "website",
  };

  if (mode.type === "keys") {
    request.keys = [...new Set(mode.keys)];
  }

  await writeLocal({ [STORAGE_KEYS.pendingFeedRequest]: request });
  return request;
}

async function getCookieManagementState() {
  const [{ analyzedCookies, protectedDomains }, cleanupBatches, pendingFeedRequest] =
    await Promise.all([
      getRawAndAnalyzedCookies(),
      readLocal(STORAGE_KEYS.cleanupBatches, []),
      readLocal(STORAGE_KEYS.pendingFeedRequest, null),
    ]);

  return buildManagementState(
    analyzedCookies,
    cleanupBatches,
    protectedDomains,
    pendingFeedRequest
  );
}

async function getDomainCookies(domain) {
  const { analyzedCookies } = await getRawAndAnalyzedCookies();

  return analyzedCookies
    .filter((item) => item.domain === domain)
    .map((item) => ({
      key: item.key,
      name: item.cookie.name,
      value: item.cookie.value,
      domain: item.domain,
      path: item.cookie.path,
      storeId: item.cookie.storeId || "default",
      size: item.cookie.value?.length || 0,
      category: item.category,
      risk: item.risk,
      reasons: item.reasons,
      presetIds: item.presetIds,
      secure: item.cookie.secure,
      httpOnly: item.cookie.httpOnly,
      sameSite: item.cookie.sameSite || "unspecified",
      session: item.cookie.session,
      expirationDate:
        typeof item.cookie.expirationDate === "number" ? item.cookie.expirationDate : null,
    }))
    .sort((left, right) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      return riskOrder[left.risk] - riskOrder[right.risk];
    });
}

function getPresetIdFromPayload(payload, fallback) {
  if (payload && isCleanupPresetId(payload.presetId)) {
    return payload.presetId;
  }

  return fallback;
}

function getDomainFromPayload(payload) {
  if (payload && typeof payload.domain === "string" && payload.domain.trim()) {
    return cookieHost(payload.domain.trim());
  }

  return null;
}

function getKeysFromPayload(payload) {
  if (!payload || !Array.isArray(payload.keys)) {
    return null;
  }

  const keys = payload.keys.filter((key) => typeof key === "string" && key.length > 0);
  return keys.length ? [...new Set(keys)] : null;
}

async function handleManagementMutation(action) {
  await action();
  return getCookieManagementState();
}

async function getUiState() {
  const [report, cleanupBatches, pendingFeedRequest] = await Promise.all([
    getLatestReport({ refreshIfMissing: false }),
    readLocal(STORAGE_KEYS.cleanupBatches, []),
    readLocal(STORAGE_KEYS.pendingFeedRequest, null),
  ]);

  const lastCleanup = cleanupBatches[0]
    ? {
        createdAt: cleanupBatches[0].createdAt,
        cookieCount: cleanupBatches[0].cookieCount,
        id: cleanupBatches[0].id,
        label: cleanupBatches[0].label,
        presetId: cleanupBatches[0].presetId,
      }
    : null;

  return {
    cleanupCount: cleanupBatches.length,
    extensionId: chrome.runtime.id,
    lastCleanup,
    pendingFeedRequest,
    recycleBin: cleanupBatches.map(buildCleanupBatchSummary),
    report,
    version: chrome.runtime.getManifest().version,
  };
}

async function handleInternalMessage(message) {
  switch (message?.type) {
    case "GET_STATE":
      return success(message.type, await getUiState());
    case "GET_PENDING_FEED_REQUEST_DETAILS": {
      const details = await getPendingFeedRequestDetails();
      if (!details) {
        return failure(message.type, "There is no pending website request to inspect.");
      }

      return success(message.type, details);
    }
    case "GET_RECYCLE_BIN_BATCH_DETAILS": {
      const batchId =
        message?.payload && typeof message.payload.batchId === "string"
          ? message.payload.batchId
          : null;
      if (!batchId) {
        return failure(message.type, "A cleanup batch id is required.");
      }

      return success(message.type, await getRecycleBinBatchDetails(batchId));
    }
    case "RUN_SCAN":
      return success(message.type, {
        report: await scanCookies(),
      });
    case "GET_COOKIE_INVENTORY": {
      const { analyzedCookies } = await getRawAndAnalyzedCookies();
      return success(message.type, buildCookieInventoryGroups(analyzedCookies));
    }
    case "GET_COOKIE_MANAGEMENT_STATE":
      return success(message.type, await getCookieManagementState());
    case "GET_DOMAIN_COOKIES": {
      const domain = getDomainFromPayload(message.payload);
      if (!domain) {
        return failure(message.type, "A domain is required.");
      }

      return success(message.type, await getDomainCookies(domain));
    }
    case "SET_DOMAIN_PROTECTION": {
      const domain = getDomainFromPayload(message.payload);
      const nextValue = Boolean(message?.payload?.protected);
      if (!domain) {
        return failure(message.type, "A domain is required.");
      }

      const protectedDomains = await getProtectedDomains();
      const nextDomains = nextValue
        ? [...new Set([...protectedDomains, domain])].sort()
        : protectedDomains.filter((entry) => entry !== domain);

      return success(
        message.type,
        await handleManagementMutation(async () => {
          await writeLocal({ [STORAGE_KEYS.protectedDomains]: nextDomains });
          await scanCookies();
        })
      );
    }
    case "DELETE_DOMAIN_COOKIES": {
      const domain = getDomainFromPayload(message.payload);
      if (!domain) {
        return failure(message.type, "A domain is required.");
      }

      await executeDeletionPlan({ type: "domain", domain }, "website");
      return success(message.type, await getCookieManagementState());
    }
    case "DELETE_COOKIE_KEYS": {
      const keys = getKeysFromPayload(message.payload);
      if (!keys) {
        return failure(message.type, "At least one cookie key is required.");
      }

      await executeDeletionPlan({ type: "keys", keys }, "website");
      return success(message.type, await getCookieManagementState());
    }
    case "RESTORE_CLEANUP_BATCH": {
      const batchId =
        message?.payload && typeof message.payload.batchId === "string"
          ? message.payload.batchId
          : null;
      if (!batchId) {
        return failure(message.type, "A cleanup batch id is required.");
      }

      await restoreCleanupBatchById(batchId);
      return success(message.type, await getCookieManagementState());
    }
    case "RESTORE_BATCH_COOKIES": {
      const batchId =
        message?.payload && typeof message.payload.batchId === "string"
          ? message.payload.batchId
          : null;
      const keys = getKeysFromPayload(message.payload);
      if (!batchId || !keys) {
        return failure(message.type, "A cleanup batch id and at least one cookie key are required.");
      }

      return success(message.type, await restoreCleanupBatchById(batchId, keys));
    }
    case "APPLY_CLEANUP_PRESET": {
      const presetId = getPresetIdFromPayload(message.payload);
      if (!presetId) {
        return failure(message.type, "A valid cleanup preset is required.");
      }

      return success(
        message.type,
        await executeDeletionPlan({ type: "preset", presetId }, "extension")
      );
    }
    case "CLEAN_HIGH_RISK":
      return success(
        message.type,
        await executeDeletionPlan({ type: "preset", presetId: "highRisk" }, "extension")
      );
    case "CONFIRM_PENDING_FEED_REQUEST": {
      const pendingFeedRequest = await readLocal(STORAGE_KEYS.pendingFeedRequest, null);
      if (!pendingFeedRequest) {
        return failure(message.type, "There is no pending website feed request to confirm.");
      }

      const keys = getKeysFromPayload(pendingFeedRequest);
      const presetId = getPresetIdFromPayload(pendingFeedRequest);

      if (!keys && !presetId) {
        return failure(message.type, "The pending website request is missing its cookie target.");
      }

      const result = await executeDeletionPlan(
        keys ? { type: "keys", keys } : { type: "preset", presetId },
        "website"
      );
      await clearPendingFeedRequest();
      return success(message.type, {
        ...result,
        confirmedRequestId: pendingFeedRequest.requestId,
      });
    }
    case "DISMISS_PENDING_FEED_REQUEST":
      await clearPendingFeedRequest();
      return success(message.type, null);
    case "RESTORE_LAST_CLEANUP":
      return success(message.type, await restoreLastCleanup());
    case "EXPORT_REPORT":
      return success(message.type, {
        report: await exportLatestReport(),
      });
    case "EXPORT_BACKUP": {
      const batch = await exportLatestBackup();
      if (!batch) {
        return failure(message.type, "No cleanup backup is available yet.");
      }

      return success(message.type, { batch });
    }
    case "OPEN_DASHBOARD":
      await openDashboardPage();
      return success(message.type, null);
    case "OPEN_SIDE_PANEL":
      await openSidePanelForCurrentWindow();
      return success(message.type, null);
    default:
      return failure(message?.type || "UNKNOWN", "Unsupported message type.");
  }
}

async function handleExternalMessage(message) {
  switch (message?.type) {
    case "PING":
      return success(message.type, {
        extensionId: chrome.runtime.id,
      });
    case "GET_SUMMARY_REPORT":
      return success(message.type, await getLatestReport({ refreshIfMissing: true }));
    case "GET_FEED_PREVIEW": {
      const report = await getLatestReport({ refreshIfMissing: true });
      return success(message.type, report?.cleanup || null);
    }
    case "GET_COOKIE_INVENTORY": {
      const { analyzedCookies } = await getRawAndAnalyzedCookies();
      return success(message.type, buildCookieInventoryGroups(analyzedCookies));
    }
    case "GET_COOKIE_MANAGEMENT_STATE":
      return success(message.type, await getCookieManagementState());
    case "GET_DOMAIN_COOKIES": {
      const domain = getDomainFromPayload(message.payload);
      if (!domain) {
        return failure(message.type, "A domain is required.");
      }

      return success(message.type, await getDomainCookies(domain));
    }
    case "SET_DOMAIN_PROTECTION": {
      const domain = getDomainFromPayload(message.payload);
      const nextValue = Boolean(message?.payload?.protected);
      if (!domain) {
        return failure(message.type, "A domain is required.");
      }

      const protectedDomains = await getProtectedDomains();
      const nextDomains = nextValue
        ? [...new Set([...protectedDomains, domain])].sort()
        : protectedDomains.filter((entry) => entry !== domain);

      await writeLocal({ [STORAGE_KEYS.protectedDomains]: nextDomains });
      await scanCookies();
      return success(message.type, await getCookieManagementState());
    }
    case "DELETE_DOMAIN_COOKIES": {
      const domain = getDomainFromPayload(message.payload);
      if (!domain) {
        return failure(message.type, "A domain is required.");
      }

      await executeDeletionPlan({ type: "domain", domain }, "website");
      return success(message.type, await getCookieManagementState());
    }
    case "DELETE_COOKIE_KEYS": {
      const keys = getKeysFromPayload(message.payload);
      if (!keys) {
        return failure(message.type, "At least one cookie key is required.");
      }

      await executeDeletionPlan({ type: "keys", keys }, "website");
      return success(message.type, await getCookieManagementState());
    }
    case "RESTORE_CLEANUP_BATCH": {
      const batchId =
        message?.payload && typeof message.payload.batchId === "string"
          ? message.payload.batchId
          : null;
      if (!batchId) {
        return failure(message.type, "A cleanup batch id is required.");
      }

      await restoreCleanupBatchById(batchId);
      return success(message.type, await getCookieManagementState());
    }
    case "REQUEST_COOKIE_FEED": {
      const keys = getKeysFromPayload(message.payload);
      const presetId = getPresetIdFromPayload(message.payload);
      if (!keys && !presetId) {
        return failure(message.type, "A cleanup preset or cookie selection is required.");
      }

      const pendingFeedRequest = await createPendingFeedRequest(
        keys ? { type: "keys", keys } : { type: "preset", presetId },
        {
          description: getTextValueFromPayload(message.payload, "description") || undefined,
          label: getTextValueFromPayload(message.payload, "label") || undefined,
          presetId,
        }
      );
      if (!pendingFeedRequest) {
        return failure(
          message.type,
          keys
            ? "No cookies from the current website selection can be cleaned right now."
            : "No cookies match that cleanup preset right now."
        );
      }

      await openDashboardPage();
      return success(message.type, pendingFeedRequest);
    }
    case "OPEN_EXTENSION_DASHBOARD":
      await openDashboardPage();
      return success(message.type, null);
    case "EXPORT_REPORT":
      await exportLatestReport();
      return success(message.type, null);
    case "GET_EXTENSION_VERSION":
      return success(message.type, {
        version: chrome.runtime.getManifest().version,
      });
    default:
      return failure(message?.type || "UNKNOWN", "Unsupported external message type.");
  }
}

chrome.runtime.onInstalled.addListener(() => {
  syncActionClickBehavior().catch(() => undefined);
  updateActionBadge().catch(() => undefined);
});

chrome.runtime.onStartup?.addListener(() => {
  syncActionClickBehavior().catch(() => undefined);
  updateActionBadge().catch(() => undefined);
});

syncActionClickBehavior().catch(() => undefined);
updateActionBadge().catch(() => undefined);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  const changedKeys = Object.keys(changes).filter((key) =>
    Object.values(STORAGE_KEYS).includes(key)
  );

  if (!changedKeys.length) {
    return;
  }

  updateActionBadge().catch(() => undefined);
  broadcastWebsiteUpdate({ changedKeys }).catch(() => undefined);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleInternalMessage(message)
    .then(sendResponse)
    .catch((error) => {
      sendResponse(
        failure(message?.type || "UNKNOWN", error instanceof Error ? error.message : "Unknown error")
      );
    });

  return true;
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!isAllowedExternalSender(sender)) {
    sendResponse(
      failure(message?.type || "UNKNOWN", "Origin is not allowed to contact Cookie Monster.")
    );
    return;
  }

  handleExternalMessage(message)
    .then(sendResponse)
    .catch((error) => {
      sendResponse(
        failure(message?.type || "UNKNOWN", error instanceof Error ? error.message : "Unknown error")
      );
    });

  return true;
});
