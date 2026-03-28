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
    return "Not yet";
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

async function sendInternalMessage(message) {
  return chrome.runtime.sendMessage(message);
}

function renderCleanup(state) {
  const lastCleanup = state.lastCleanup;
  setText("cleanup-count", formatNumber(state.cleanupCount));

  if (!lastCleanup) {
    setText("cleanup-meta", "No cleanup backup yet");
    return;
  }

  setText(
    "cleanup-meta",
    `${lastCleanup.label} · ${formatNumber(lastCleanup.cookieCount)} cookies · ${formatDate(
      lastCleanup.createdAt
    )}`
  );
}

function renderPendingFeedRequest(pendingFeedRequest) {
  const panel = byId("pending-request-panel");
  const empty = byId("pending-request-empty");

  if (!panel || !empty) {
    return;
  }

  if (!pendingFeedRequest) {
    panel.hidden = true;
    empty.hidden = false;
    setText("pending-count", "0");
    setText("pending-label", "No request waiting");
    return;
  }

  empty.hidden = true;
  panel.hidden = false;

  setText("pending-count", "1");
  setText("pending-label", pendingFeedRequest.label);
  setText("pending-request-title", pendingFeedRequest.label);
  setText("pending-request-description", pendingFeedRequest.description);
  setText(
    "pending-request-meta",
    `${formatNumber(pendingFeedRequest.cookieCount)} cookies across ${formatNumber(
      pendingFeedRequest.domainCount
    )} domains`
  );
  setText(
    "pending-request-domains",
    pendingFeedRequest.sampleDomains.length
      ? pendingFeedRequest.sampleDomains.join(", ")
      : "No sample domains available"
  );
}

function renderReport(report) {
  if (!report) {
    setText("last-scan", "Not yet");
    setText("cookie-count", "0 cookies cached");
    setText("high-risk-count", "0");
    setText("domain-count", "0 domains in cache");
    setText("total-cookies", "0");
    setText("total-domains", "0");
    setText("summary-high-risk", "0");
    setText("tracking-total", "0");
    return;
  }

  setText("last-scan", formatDate(report.generatedAt));
  setText("cookie-count", `${formatNumber(report.totals.cookies)} cookies cached`);
  setText("high-risk-count", formatNumber(report.risk.high));
  setText("domain-count", `${formatNumber(report.totals.domains)} domains in cache`);
  setText("total-cookies", formatNumber(report.totals.cookies));
  setText("total-domains", formatNumber(report.totals.domains));
  setText("summary-high-risk", formatNumber(report.risk.high));
  setText(
    "tracking-total",
    formatNumber((report.categories.analytics || 0) + (report.categories.advertising || 0))
  );
}

async function refreshState(message) {
  const response = await sendInternalMessage({ type: "GET_STATE" });

  if (!response.success) {
    setStatus(response.error || "Could not load extension state.", "error");
    return;
  }

  const state = response.data;
  setText("version", state.version);
  setText("extension-id", state.extensionId);

  renderCleanup(state);
  renderPendingFeedRequest(state.pendingFeedRequest);
  renderReport(state.report);

  if (message) {
    setStatus(message, "success");
    return;
  }

  if (state.pendingFeedRequest) {
    setStatus("A website cleanup request is waiting for local confirmation.", "info");
    return;
  }

  if (state.report) {
    setStatus(
      "Local scan cache is ready. Use the website for detailed browsing, and keep sensitive actions here.",
      "info"
    );
    return;
  }

  setStatus("Run a scan to create the first local summary cache.", "info");
}

async function runAction(type, payload) {
  const statusLabelMap = {
    APPLY_CLEANUP_PRESET: "Feeding the selected cookie batch locally...",
    CONFIRM_PENDING_FEED_REQUEST: "Confirming website cleanup request...",
    DISMISS_PENDING_FEED_REQUEST: "Dismissing pending website request...",
    EXPORT_BACKUP: "Preparing cleanup backup export...",
    EXPORT_REPORT: "Preparing report export...",
    OPEN_DASHBOARD: "Opening the full local dashboard...",
    OPEN_SIDE_PANEL: "Opening the side panel...",
    RESTORE_LAST_CLEANUP: "Restoring the latest cleanup batch...",
    RUN_SCAN: "Scanning cookies locally...",
  };

  setStatus(statusLabelMap[type] || "Working...", "info");

  const response = await sendInternalMessage({ type, payload });
  if (!response.success) {
    setStatus(response.error || "The action failed.", "error");
    return;
  }

  switch (type) {
    case "RUN_SCAN":
      await refreshState("Scan complete. Local summary cache refreshed.");
      break;
    case "APPLY_CLEANUP_PRESET": {
      const deleted = response.data.deletedCount || 0;
      await refreshState(
        deleted
          ? `Fed ${deleted} cookies to the monster and stored a recycle-bin backup.`
          : "No cookies matched that preset right now."
      );
      break;
    }
    case "CONFIRM_PENDING_FEED_REQUEST": {
      const deleted = response.data.deletedCount || 0;
      await refreshState(
        deleted
          ? `Confirmed website request and fed ${deleted} cookies locally.`
          : "The pending request did not match any removable cookies."
      );
      break;
    }
    case "DISMISS_PENDING_FEED_REQUEST":
      await refreshState("The pending website request was dismissed.");
      break;
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
      setStatus("Opened the full local dashboard in a new tab.", "success");
      break;
    case "OPEN_SIDE_PANEL":
      setStatus("Opened the side panel for the current window.", "success");
      break;
    default:
      await refreshState();
      break;
  }
}

function bindActions() {
  const bindings = [
    ["scan-button", "RUN_SCAN"],
    ["restore-button", "RESTORE_LAST_CLEANUP"],
    ["export-report-button", "EXPORT_REPORT"],
    ["export-backup-button", "EXPORT_BACKUP"],
    ["open-dashboard-button", "OPEN_DASHBOARD"],
    ["open-sidepanel-button", "OPEN_SIDE_PANEL"],
    ["confirm-request-button", "CONFIRM_PENDING_FEED_REQUEST"],
    ["dismiss-request-button", "DISMISS_PENDING_FEED_REQUEST"],
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

  const cleanupButton = byId("cleanup-button");
  if (cleanupButton) {
    cleanupButton.addEventListener("click", () => {
      runAction("APPLY_CLEANUP_PRESET", { presetId: "highRisk" }).catch((error) => {
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
