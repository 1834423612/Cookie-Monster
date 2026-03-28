const STORAGE_KEYS = {
  latestReport: "cm.latestReport",
  cleanupBatches: "cm.cleanupBatches",
  pendingFeedRequest: "cm.pendingFeedRequest",
};

const EXTERNAL_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "https://cookie-monster.app",
  "https://www.cookie-monster.app",
  "https://cookie-monster.vercel.app",
]);

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

function isCleanupPresetId(value) {
  return Object.prototype.hasOwnProperty.call(PRESET_DEFINITIONS, value);
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
  return origin ? EXTERNAL_ORIGINS.has(origin) : false;
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

function analyzeCookie(cookie) {
  const category = getCategory(cookie);
  const reasons = [];
  const presetIds = new Set();
  let score = 0;

  if (isExpired(cookie)) {
    score += 5;
    reasons.push("Already expired");
    presetIds.add("expired");
    presetIds.add("balanced");
  }

  if (category === "advertising") {
    score += 4;
    reasons.push("Matches advertising or tracker signature");
    presetIds.add("trackers");
    presetIds.add("balanced");
  }

  if (category === "analytics") {
    score += 2;
    reasons.push("Matches analytics signature");
    presetIds.add("trackers");
    presetIds.add("balanced");
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
    if (category !== "essential" && !cookie.session) {
      presetIds.add("longLived");
      presetIds.add("balanced");
    }
  }

  if (category === "essential" && cookie.session && cookie.secure) {
    score -= 3;
    reasons.push("Looks like an essential secure session cookie");
    presetIds.delete("balanced");
    presetIds.delete("trackers");
    presetIds.delete("highRisk");
    presetIds.delete("longLived");
  }

  const risk = score >= 5 ? "high" : score >= 2 ? "medium" : "low";

  if (risk === "high" && category !== "essential") {
    presetIds.add("highRisk");
    presetIds.add("balanced");
  }

  return {
    category,
    cookie,
    domain: cookieHost(cookie.domain || "unknown"),
    key: [cookie.storeId, cookie.domain, cookie.path, cookie.name].join("::"),
    presetIds: [...presetIds],
    reasons: reasons.slice(0, 4),
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
      domainCount: 0,
      sampleDomains: new Set(),
      domains: new Set(),
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
      description: "This removes the biggest low-regret bundle while leaving likely essential cookies alone.",
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
      description: "Analytics and advertising cookies are the clearest monster snacks in this scan.",
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

async function scanCookies() {
  const cookies = await chrome.cookies.getAll({});
  const analyzedCookies = cookies.map(analyzeCookie);
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

function buildCleanupPlan(rawCookies, presetId) {
  const definition = PRESET_DEFINITIONS[presetId];
  const analyzedCookies = rawCookies.map(analyzeCookie);
  const candidates = analyzedCookies.filter((item) => item.presetIds.includes(presetId));
  const sampleDomains = [...new Set(candidates.map((item) => item.domain))];

  return {
    candidates,
    cookieCount: candidates.length,
    description: definition.description,
    domainCount: sampleDomains.length,
    label: definition.label,
    presetId,
    sampleDomains: sampleDomains.slice(0, 4),
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
    cookies: successfulCookies.map(createBackupCookie),
    id: `cleanup-${Date.now()}`,
    label: plan.label,
    presetId: plan.presetId,
    reason: plan.description,
    sampleDomains: plan.sampleDomains,
    source,
  };

  const existingBatches = await readLocal(STORAGE_KEYS.cleanupBatches, []);
  await writeLocal({
    [STORAGE_KEYS.cleanupBatches]: [batch, ...existingBatches].slice(0, 10),
  });

  return batch;
}

async function executeCleanupPreset(presetId, source) {
  const rawCookies = await chrome.cookies.getAll({});
  const plan = buildCleanupPlan(rawCookies, presetId);

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
        presetId,
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
      presetId,
      sampleDomains: plan.sampleDomains,
    },
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

  const results = await Promise.allSettled(latestBatch.cookies.map(restoreCookie));
  const restoredCount = results.filter(
    (result) => result.status === "fulfilled" && result.value
  ).length;
  const failedCount = latestBatch.cookies.length - restoredCount;

  await writeLocal({
    [STORAGE_KEYS.cleanupBatches]: batches.slice(1),
  });

  return {
    failedCount,
    restoredCount,
    restoredPresetId: latestBatch.presetId,
    report: await scanCookies(),
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

async function clearPendingFeedRequest() {
  await writeLocal({ [STORAGE_KEYS.pendingFeedRequest]: null });
}

async function createPendingFeedRequest(presetId) {
  const rawCookies = await chrome.cookies.getAll({});
  const plan = buildCleanupPlan(rawCookies, presetId);

  if (!plan.cookieCount) {
    return null;
  }

  const request = {
    cookieCount: plan.cookieCount,
    createdAt: new Date().toISOString(),
    description: plan.description,
    domainCount: plan.domainCount,
    label: plan.label,
    presetId,
    requestId: `feed-request-${Date.now()}`,
    sampleDomains: plan.sampleDomains,
    source: "website",
  };

  await writeLocal({ [STORAGE_KEYS.pendingFeedRequest]: request });
  return request;
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
        cookieCount: cleanupBatches[0].cookies.length,
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
    report,
    version: chrome.runtime.getManifest().version,
  };
}

function getCookieLabel(item) {
  const labels = [];
  const { cookie, category, risk } = item;

  if (category === "essential") {
    labels.push("critical");
  }
  if (cookie.session) {
    labels.push("session");
  }
  if (cookie.httpOnly) {
    labels.push("httpOnly");
  }
  if (cookie.secure) {
    labels.push("secure");
  }
  if (risk === "high" && category !== "essential") {
    labels.push("recommended");
  }

  return labels;
}

async function getCookieJarView() {
  const rawCookies = await chrome.cookies.getAll({});
  const analyzedCookies = rawCookies.map(analyzeCookie);
  const domainMap = new Map();

  for (const item of analyzedCookies) {
    const domain = item.domain || "unknown";
    const current = domainMap.get(domain) || {
      domain,
      cookies: [],
      counts: { high: 0, medium: 0, low: 0 },
      recommendedCount: 0,
      protectedCount: 0,
    };

    if (item.risk === "high") {
      current.counts.high += 1;
    } else if (item.risk === "medium") {
      current.counts.medium += 1;
    } else {
      current.counts.low += 1;
    }

    const labels = getCookieLabel(item);
    if (labels.includes("recommended")) {
      current.recommendedCount += 1;
    }
    if (labels.includes("critical")) {
      current.protectedCount += 1;
    }

    current.cookies.push({
      key: item.key,
      name: item.cookie.name,
      path: item.cookie.path,
      valuePreview: item.cookie.value ? `${item.cookie.value.slice(0, 14)}…` : "(empty)",
      category: item.category,
      risk: item.risk,
      labels,
      reasons: item.reasons,
      sameSite: item.cookie.sameSite || "unspecified",
      expiresAt:
        typeof item.cookie.expirationDate === "number"
          ? new Date(item.cookie.expirationDate * 1000).toISOString()
          : null,
      session: Boolean(item.cookie.session),
    });

    domainMap.set(domain, current);
  }

  const domains = [...domainMap.values()]
    .map((entry) => ({
      ...entry,
      cookieCount: entry.cookies.length,
      cookies: entry.cookies.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => b.cookieCount - a.cookieCount);

  return {
    generatedAt: new Date().toISOString(),
    totalCookies: rawCookies.length,
    totalDomains: domains.length,
    domains,
  };
}

async function deleteSelectedCookies(keys = []) {
  if (!Array.isArray(keys) || !keys.length) {
    return {
      deletedCount: 0,
      failedCount: 0,
      report: await scanCookies(),
    };
  }

  const rawCookies = await chrome.cookies.getAll({});
  const analyzedCookies = rawCookies.map(analyzeCookie);
  const selectedSet = new Set(keys);
  const selectedCandidates = analyzedCookies.filter((item) => selectedSet.has(item.key));

  if (!selectedCandidates.length) {
    return {
      deletedCount: 0,
      failedCount: keys.length,
      report: await scanCookies(),
    };
  }

  const results = await Promise.allSettled(
    selectedCandidates.map((candidate) => removeCookie(candidate.cookie))
  );

  const successfulCookies = selectedCandidates
    .filter((candidate, index) => results[index].status === "fulfilled" && results[index].value)
    .map((candidate) => candidate.cookie);

  const deletedCount = successfulCookies.length;
  const failedCount = selectedCandidates.length - deletedCount;

  await storeCleanupBatch(
    successfulCookies,
    {
      label: "Custom Selected Cleanup",
      description: "Manual cookie selection deleted from the jar workspace.",
      presetId: "balanced",
      sampleDomains: [...new Set(selectedCandidates.map((item) => item.domain))].slice(0, 4),
    },
    "extension"
  );

  return {
    deletedCount,
    failedCount,
    report: await scanCookies(),
  };
}

function getPresetIdFromPayload(payload, fallback) {
  if (payload && isCleanupPresetId(payload.presetId)) {
    return payload.presetId;
  }

  return fallback;
}

async function handleInternalMessage(message) {
  switch (message?.type) {
    case "GET_STATE":
      return success(message.type, await getUiState());
    case "RUN_SCAN":
      return success(message.type, {
        report: await scanCookies(),
      });
    case "APPLY_CLEANUP_PRESET": {
      const presetId = getPresetIdFromPayload(message.payload);
      if (!presetId) {
        return failure(message.type, "A valid cleanup preset is required.");
      }

      return success(message.type, await executeCleanupPreset(presetId, "extension"));
    }
    case "GET_COOKIE_JAR_VIEW":
      return success(message.type, await getCookieJarView());
    case "DELETE_SELECTED_COOKIES":
      return success(
        message.type,
        await deleteSelectedCookies(Array.isArray(message.payload?.keys) ? message.payload.keys : [])
      );
    case "CLEAN_HIGH_RISK":
      return success(message.type, await executeCleanupPreset("highRisk", "extension"));
    case "CONFIRM_PENDING_FEED_REQUEST": {
      const pendingFeedRequest = await readLocal(STORAGE_KEYS.pendingFeedRequest, null);
      if (!pendingFeedRequest || !isCleanupPresetId(pendingFeedRequest.presetId)) {
        return failure(message.type, "There is no pending website feed request to confirm.");
      }

      const result = await executeCleanupPreset(pendingFeedRequest.presetId, "website");
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
    case "REQUEST_COOKIE_FEED": {
      const presetId = getPresetIdFromPayload(message.payload);
      if (!presetId) {
        return failure(message.type, "A valid cleanup preset is required.");
      }

      const pendingFeedRequest = await createPendingFeedRequest(presetId);
      if (!pendingFeedRequest) {
        return failure(message.type, "No cookies match that cleanup preset right now.");
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

chrome.runtime.onInstalled.addListener(async () => {
  if (chrome.sidePanel?.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => undefined);
}

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
