const STORAGE_KEYS = {
  latestReport: "cm.latestReport",
  cleanupBatches: "cm.cleanupBatches",
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

const RISK_SCORE = {
  low: 1,
  medium: 2,
  high: 3,
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

function getRisk(cookie, category) {
  if (isExpired(cookie)) {
    return "high";
  }

  if (!cookie.secure && cookie.sameSite === "no_restriction") {
    return "high";
  }

  if (category === "advertising") {
    return "high";
  }

  if (category === "analytics" && (!cookie.secure || !cookie.httpOnly)) {
    return "high";
  }

  if (category === "analytics" || isLongLived(cookie) || !cookie.httpOnly) {
    return "medium";
  }

  return "low";
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
  };
}

function buildSummaryReport(cookies) {
  const report = createEmptyReport();
  const domainStats = new Map();
  const stores = new Set();
  const now = Date.now() / 1000;

  report.generatedAt = new Date().toISOString();
  report.totals.cookies = cookies.length;

  for (const cookie of cookies) {
    const category = getCategory(cookie);
    const risk = getRisk(cookie, category);
    const domain = cookieHost(cookie.domain || "unknown");

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

    const previous = domainStats.get(domain) || {
      domain,
      count: 0,
      riskLevel: "low",
    };

    previous.count += 1;
    if (RISK_SCORE[risk] > RISK_SCORE[previous.riskLevel]) {
      previous.riskLevel = risk;
    }

    domainStats.set(domain, previous);
  }

  report.totals.domains = domainStats.size;
  report.totals.stores = stores.size;
  report.topDomains = [...domainStats.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);

  return report;
}

async function scanCookies() {
  const cookies = await chrome.cookies.getAll({});
  const report = buildSummaryReport(cookies);
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

function shouldDeleteCookie(cookie) {
  const category = getCategory(cookie);
  const risk = getRisk(cookie, category);

  return risk === "high" || isExpired(cookie);
}

async function cleanupHighRiskCookies() {
  const cookies = await chrome.cookies.getAll({});
  const candidates = cookies.filter(shouldDeleteCookie);

  if (!candidates.length) {
    return {
      deletedCount: 0,
      failedCount: 0,
      report: await getLatestReport({ refreshIfMissing: true }),
    };
  }

  const batch = {
    id: `cleanup-${Date.now()}`,
    createdAt: new Date().toISOString(),
    cookies: candidates.map(createBackupCookie),
    reason: "high-risk-or-expired",
  };

  const existingBatches = await readLocal(STORAGE_KEYS.cleanupBatches, []);
  await writeLocal({
    [STORAGE_KEYS.cleanupBatches]: [batch, ...existingBatches].slice(0, 10),
  });

  const results = await Promise.allSettled(candidates.map(removeCookie));
  const deletedCount = results.filter(
    (result) => result.status === "fulfilled" && result.value
  ).length;
  const failedCount = candidates.length - deletedCount;

  return {
    deletedCount,
    failedCount,
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
    restoredCount,
    failedCount,
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
      exportedAt: new Date().toISOString(),
      warning:
        "This backup contains raw cookie values and should remain on a trusted device.",
      batch: latestBatch,
    }
  );

  return latestBatch;
}

async function openDashboardPage() {
  await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
}

async function getUiState() {
  const [report, cleanupBatches] = await Promise.all([
    getLatestReport({ refreshIfMissing: false }),
    readLocal(STORAGE_KEYS.cleanupBatches, []),
  ]);

  const lastCleanup = cleanupBatches[0]
    ? {
        createdAt: cleanupBatches[0].createdAt,
        cookieCount: cleanupBatches[0].cookies.length,
        id: cleanupBatches[0].id,
      }
    : null;

  return {
    cleanupCount: cleanupBatches.length,
    extensionId: chrome.runtime.id,
    lastCleanup,
    report,
    version: chrome.runtime.getManifest().version,
  };
}

async function handleInternalMessage(message) {
  switch (message?.type) {
    case "GET_STATE":
      return success(message.type, await getUiState());
    case "RUN_SCAN":
      return success(message.type, {
        report: await scanCookies(),
      });
    case "EXPORT_REPORT":
      return success(message.type, {
        report: await exportLatestReport(),
      });
    case "EXPORT_BACKUP": {
      const batch = await exportLatestBackup();
      if (!batch) {
        return failure(message.type, "No cleanup backup is available yet.");
      }

      return success(message.type, {
        batch,
      });
    }
    case "CLEAN_HIGH_RISK":
      return success(message.type, await cleanupHighRiskCookies());
    case "RESTORE_LAST_CLEANUP":
      return success(message.type, await restoreLastCleanup());
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
