const ACTION_LABELS = {
  RUN_SCAN: "Scanning cookies locally...",
  CLEAN_HIGH_RISK: "Removing high-risk and expired cookies...",
  RESTORE_LAST_CLEANUP: "Restoring the latest cleanup batch...",
  EXPORT_REPORT: "Preparing summary report export...",
  EXPORT_BACKUP: "Preparing cleanup backup export...",
  OPEN_DASHBOARD: "Opening the full extension dashboard...",
};

function byId(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = byId(id);
  if (element) {
    element.textContent = value;
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value || 0);
}

function formatDate(value) {
  if (!value) {
    return "Not available yet";
  }

  return new Date(value).toLocaleString();
}

function setStatus(message, tone = "info") {
  const element = byId("status");
  if (!element) {
    return;
  }

  element.textContent = message;
  element.dataset.tone = tone;
}

function toggleEmptyState(hasReport) {
  const empty = byId("empty-state");
  const populated = byId("report-shell");

  if (!empty || !populated) {
    return;
  }

  empty.hidden = hasReport;
  populated.hidden = !hasReport;
}

function renderTopDomains(domains = []) {
  const list = byId("top-domains");
  if (!list) {
    return;
  }

  list.innerHTML = "";

  if (!domains.length) {
    const item = document.createElement("li");
    item.className = "list-empty";
    item.textContent = "Run a scan to see the busiest cookie domains.";
    list.appendChild(item);
    return;
  }

  for (const domain of domains) {
    const item = document.createElement("li");
    item.className = "domain-row";
    item.innerHTML = `
      <div>
        <strong>${domain.domain}</strong>
        <span class="domain-risk risk-${domain.riskLevel}">${domain.riskLevel} risk</span>
      </div>
      <span>${formatNumber(domain.count)}</span>
    `;
    list.appendChild(item);
  }
}

function renderCleanup(state) {
  const lastCleanup = state.lastCleanup;
  setText("cleanup-count", formatNumber(state.cleanupCount));

  if (!lastCleanup) {
    setText("cleanup-meta", "No cleanup batch stored yet.");
    return;
  }

  setText(
    "cleanup-meta",
    `${formatNumber(lastCleanup.cookieCount)} cookies backed up on ${formatDate(lastCleanup.createdAt)}`
  );
}

function renderReport(report) {
  toggleEmptyState(Boolean(report));

  if (!report) {
    return;
  }

  setText("generated-at", formatDate(report.generatedAt));
  setText("total-cookies", formatNumber(report.totals.cookies));
  setText("total-domains", formatNumber(report.totals.domains));
  setText("high-risk", formatNumber(report.risk.high));
  setText("medium-risk", formatNumber(report.risk.medium));
  setText("low-risk", formatNumber(report.risk.low));
  setText("flag-summary", `${formatNumber(report.flags.secure)} secure / ${formatNumber(report.flags.httpOnly)} HttpOnly`);
  setText(
    "category-summary",
    `${formatNumber(report.categories.analytics)} analytics / ${formatNumber(report.categories.advertising)} advertising`
  );

  renderTopDomains(report.topDomains);
}

async function sendInternalMessage(type) {
  return chrome.runtime.sendMessage({ type });
}

async function refreshState(message) {
  const response = await sendInternalMessage("GET_STATE");

  if (!response.success) {
    setStatus(response.error || "Could not load extension state.", "error");
    return;
  }

  const state = response.data;
  setText("version", state.version);
  setText("extension-id", state.extensionId);
  renderCleanup(state);
  renderReport(state.report);

  if (message) {
    setStatus(message, "success");
  } else if (state.report) {
    setStatus("Summary report is ready. Website sync uses sanitized data only.", "info");
  } else {
    setStatus("Run your first scan to generate a local summary report.", "info");
  }
}

async function runAction(type) {
  setStatus(ACTION_LABELS[type] || "Working...", "info");

  const response = await sendInternalMessage(type);
  if (!response.success) {
    setStatus(response.error || "The action failed.", "error");
    return;
  }

  switch (type) {
    case "RUN_SCAN":
      await refreshState("Scan complete. The website can now fetch the latest summary report.");
      break;
    case "CLEAN_HIGH_RISK": {
      const deleted = response.data.deletedCount || 0;
      const failed = response.data.failedCount || 0;
      await refreshState(
        failed
          ? `Deleted ${deleted} cookies. ${failed} cookies could not be removed.`
          : `Deleted ${deleted} high-risk or expired cookies and stored a restore batch.`
      );
      break;
    }
    case "RESTORE_LAST_CLEANUP": {
      const restored = response.data.restoredCount || 0;
      await refreshState(
        restored
          ? `Restored ${restored} cookies from the latest cleanup batch.`
          : "No cleanup batch was available to restore."
      );
      break;
    }
    case "EXPORT_REPORT":
      await refreshState("The summary report export dialog was opened.");
      break;
    case "EXPORT_BACKUP":
      await refreshState("The latest cleanup backup was exported locally.");
      break;
    case "OPEN_DASHBOARD":
      setStatus("Opened the full extension dashboard in a new tab.", "success");
      break;
    default:
      await refreshState();
      break;
  }
}

function bindActions() {
  const bindings = [
    ["scan-button", "RUN_SCAN"],
    ["cleanup-button", "CLEAN_HIGH_RISK"],
    ["restore-button", "RESTORE_LAST_CLEANUP"],
    ["export-report-button", "EXPORT_REPORT"],
    ["export-backup-button", "EXPORT_BACKUP"],
    ["open-dashboard-button", "OPEN_DASHBOARD"],
  ];

  for (const [id, type] of bindings) {
    const button = byId(id);
    if (!button) {
      continue;
    }

    button.addEventListener("click", () => {
      runAction(type).catch((error) => {
        setStatus(error instanceof Error ? error.message : "Unknown error", "error");
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindActions();
  refreshState().catch((error) => {
    setStatus(error instanceof Error ? error.message : "Unknown error", "error");
  });
});
