function byId(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = byId(id);
  if (element) {
    element.textContent = value;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value || 0);
}

function formatDate(value) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) {
    return "Just now";
  }

  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}m ago`;
  }

  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}h ago`;
  }

  return date.toLocaleDateString();
}

function formatFullDate(value) {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleString();
}

function formatExpiry(value) {
  if (!value) {
    return "Session";
  }

  const date = new Date(value * 1000);
  const now = Date.now();
  const diff = date.getTime() - now;

  if (diff <= 0) {
    return "Expired";
  }

  if (diff <= 86400000) {
    return "Today";
  }

  if (diff <= 86400000 * 2) {
    return "Tomorrow";
  }

  if (diff <= 86400000 * 7) {
    return "This week";
  }

  return date.toLocaleDateString();
}

function getRiskTone(risk, recommendedKeep) {
  if (recommendedKeep) {
    return "safe";
  }

  if (risk === "high") {
    return "danger";
  }

  if (risk === "medium") {
    return "warning";
  }

  return "neutral";
}

function buildSignalPills(cookie) {
  const pills = [];

  if (cookie.recommendedKeep) {
    pills.push('<span class="pill tone-safe">keep</span>');
  }

  pills.push(
    `<span class="pill tone-${getRiskTone(cookie.risk, cookie.recommendedKeep)}">${escapeHtml(
      cookie.risk
    )}</span>`
  );

  if (cookie.category) {
    pills.push(`<span class="pill">${escapeHtml(cookie.category)}</span>`);
  }

  if (cookie.sameSite) {
    pills.push(`<span class="pill">${escapeHtml(cookie.sameSite)}</span>`);
  }

  if (cookie.secure) {
    pills.push('<span class="pill">secure</span>');
  }

  if (cookie.httpOnly) {
    pills.push('<span class="pill">httpOnly</span>');
  }

  return pills.join("");
}

function setStatus(message, tone = "info") {
  const statusBar = byId("status-bar");
  const statusText = byId("status-text");

  if (!statusBar || !statusText) {
    return;
  }

  statusText.textContent = message;
  statusBar.dataset.tone = tone;

  const iconMap = {
    info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  };

  const statusIcon = statusBar.querySelector(".status-icon");
  if (statusIcon && iconMap[tone]) {
    statusIcon.innerHTML = iconMap[tone];
  }
}

async function sendInternalMessage(message) {
  return chrome.runtime.sendMessage(message);
}

async function openSidePanelFromUserGesture() {
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

let currentState = null;
let pendingDetails = null;
let pendingDetailsOpen = false;
const batchDetailsCache = new Map();
const openBatchIds = new Set();

function renderCleanup(state) {
  const lastCleanup = state.lastCleanup;
  setText("cleanup-count", formatNumber(state.cleanupCount));
  setText("cleanup-meta", lastCleanup ? formatDate(lastCleanup.createdAt) : "No backup yet");
}

function renderPendingDetails() {
  const container = byId("pending-details");
  const button = byId("toggle-pending-details-button");

  if (!container || !button) {
    return;
  }

  if (!pendingDetailsOpen || !pendingDetails) {
    container.hidden = true;
    container.innerHTML = "";
    button.textContent = "View details";
    return;
  }

  const rows = pendingDetails.cookies.length
    ? pendingDetails.cookies
        .map(
          (cookie) => `
            <div class="detail-item">
              <div class="detail-copy">
                <div class="detail-title-row">
                  <strong>${escapeHtml(cookie.name)}</strong>
                  <span class="detail-domain">${escapeHtml(cookie.domain)}</span>
                </div>
                <div class="detail-meta">${escapeHtml(cookie.path)} • ${escapeHtml(
            cookie.storeId
          )} • ${escapeHtml(formatExpiry(cookie.expirationDate))}</div>
                <div class="detail-pills">${buildSignalPills(cookie)}</div>
                ${
                  cookie.reasons?.length
                    ? `<ul class="detail-reasons">${cookie.reasons
                        .map((reason) => `<li>${escapeHtml(reason)}</li>`)
                        .join("")}</ul>`
                    : ""
                }
              </div>
            </div>
          `
        )
        .join("")
    : '<div class="detail-empty">No matching cookies remain for this request.</div>';

  container.hidden = false;
  container.innerHTML = `<div class="detail-list">${rows}</div>`;
  button.textContent = "Hide details";
}

function renderPendingFeedRequest(pendingFeedRequest) {
  const section = byId("pending-section");

  if (!section) {
    return;
  }

  if (!pendingFeedRequest) {
    section.hidden = true;
    pendingDetails = null;
    pendingDetailsOpen = false;
    renderPendingDetails();
    return;
  }

  section.hidden = false;
  setText("pending-request-title", pendingFeedRequest.label);
  setText("pending-request-description", pendingFeedRequest.description || "");
  setText(
    "pending-request-meta",
    `${formatNumber(pendingFeedRequest.cookieCount)} cookies • ${formatNumber(
      pendingFeedRequest.domainCount
    )} domains`
  );
  setText(
    "pending-badge",
    pendingFeedRequest.cookieCount > 99 ? "99+" : String(pendingFeedRequest.cookieCount)
  );

  renderPendingDetails();
}

function renderReport(report) {
  if (!report) {
    setText("last-scan", "Never");
    setText("total-cookies", "0");
    setText("total-domains", "0");
    setText("high-risk-count", "0");
    return;
  }

  setText("last-scan", formatDate(report.generatedAt));
  setText("total-cookies", formatNumber(report.totals.cookies));
  setText("total-domains", formatNumber(report.totals.domains));
  setText("high-risk-count", formatNumber(report.risk.high));
}

function renderRecycleBin(state) {
  const container = byId("recycle-bin-list");

  if (!container) {
    return;
  }

  const recycleBin = state.recycleBin || [];

  if (!recycleBin.length) {
    container.innerHTML =
      '<div class="detail-empty recycle-empty">The monster has not saved any recycle-bin batches yet.</div>';
    return;
  }

  container.innerHTML = recycleBin
    .map((batch) => {
      const isOpen = openBatchIds.has(batch.id);

      return `
        <div class="batch-card">
          <div class="batch-header">
            <div class="batch-copy">
              <strong>${escapeHtml(batch.label)}</strong>
              <div class="batch-meta">${formatNumber(batch.cookieCount)} cookies • ${formatNumber(
        batch.domainCount
      )} domains • ${escapeHtml(formatDate(batch.createdAt))}</div>
            </div>
            <div class="batch-actions">
              <button class="ghost-inline-btn" data-action="toggle-batch-details" data-batch-id="${escapeHtml(
                batch.id
              )}" type="button">
                ${isOpen ? "Hide" : "View"}
              </button>
              <button class="mini-btn" data-action="restore-batch-all" data-batch-id="${escapeHtml(
                batch.id
              )}" type="button">
                Restore all
              </button>
            </div>
          </div>
          <div class="batch-domain-list">
            ${(batch.sampleDomains || [])
              .map((domain) => `<span class="pill">${escapeHtml(domain)}</span>`)
              .join("")}
          </div>
          <div id="batch-details-${escapeHtml(batch.id)}" class="detail-panel" ${
        isOpen ? "" : "hidden"
      }></div>
        </div>
      `;
    })
    .join("");
}

function renderBatchDetails(batchId) {
  const container = byId(`batch-details-${batchId}`);
  const details = batchDetailsCache.get(batchId);

  if (!container || !details) {
    return;
  }

  container.hidden = false;
  container.innerHTML = `
    <div class="detail-toolbar">
      <button class="ghost-inline-btn" data-action="toggle-batch-selection" data-batch-id="${escapeHtml(
        batchId
      )}" type="button">
        Select all
      </button>
      <button class="mini-btn" data-action="restore-batch-selected" data-batch-id="${escapeHtml(
        batchId
      )}" type="button">
        Restore selected
      </button>
    </div>
    <div class="detail-list">
      ${details.cookies
        .map(
          (cookie) => `
            <label class="detail-item selectable-item">
              <input type="checkbox" class="detail-checkbox" data-batch-id="${escapeHtml(
                batchId
              )}" data-cookie-key="${escapeHtml(cookie.key)}" />
              <div class="detail-copy">
                <div class="detail-title-row">
                  <strong>${escapeHtml(cookie.name)}</strong>
                  <span class="detail-domain">${escapeHtml(cookie.domain)}</span>
                </div>
                <div class="detail-meta">${escapeHtml(cookie.path)} • ${escapeHtml(
            cookie.storeId
          )} • ${escapeHtml(formatExpiry(cookie.expirationDate))}</div>
                <div class="detail-pills">
                  ${cookie.secure ? '<span class="pill">secure</span>' : ""}
                  ${cookie.httpOnly ? '<span class="pill">httpOnly</span>' : ""}
                  <span class="pill">${escapeHtml(cookie.sameSite)}</span>
                  <span class="pill">${formatNumber(cookie.valueSize)} chars</span>
                </div>
              </div>
            </label>
          `
        )
        .join("")}
    </div>
  `;
}

async function refreshState(message) {
  const response = await sendInternalMessage({ type: "GET_STATE" });

  if (!response.success) {
    setStatus(response.error || "Failed to load state", "error");
    return;
  }

  currentState = response.data;
  setText("version", currentState.version);
  setText("extension-id", currentState.extensionId || "unknown");
  renderCleanup(currentState);
  renderPendingFeedRequest(currentState.pendingFeedRequest);
  renderRecycleBin(currentState);
  renderReport(currentState.report);

  if (pendingDetailsOpen && currentState.pendingFeedRequest) {
    await loadPendingDetails(true);
  }

  for (const batchId of [...openBatchIds]) {
    if (!(currentState.recycleBin || []).some((batch) => batch.id === batchId)) {
      openBatchIds.delete(batchId);
      batchDetailsCache.delete(batchId);
      continue;
    }

    await loadRecycleBinBatchDetails(batchId, true);
  }

  if (message) {
    setStatus(message, "success");
    return;
  }

  if (currentState.pendingFeedRequest) {
    setStatus("Website request waiting for approval", "warning");
    return;
  }

  if (currentState.report) {
    setStatus("Ready - scan cache is current", "success");
    return;
  }

  setStatus("Run a scan to analyze cookies", "info");
}

async function loadPendingDetails(forceRefresh = false) {
  if (!currentState?.pendingFeedRequest) {
    return;
  }

  if (!forceRefresh && pendingDetails) {
    renderPendingDetails();
    return;
  }

  const response = await sendInternalMessage({ type: "GET_PENDING_FEED_REQUEST_DETAILS" });
  if (!response.success) {
    setStatus(response.error || "Could not load request details", "error");
    return;
  }

  pendingDetails = response.data;
  renderPendingDetails();
}

async function loadRecycleBinBatchDetails(batchId, forceRefresh = false) {
  if (!forceRefresh && batchDetailsCache.has(batchId)) {
    renderBatchDetails(batchId);
    return;
  }

  const response = await sendInternalMessage({
    type: "GET_RECYCLE_BIN_BATCH_DETAILS",
    payload: { batchId },
  });

  if (!response.success) {
    setStatus(response.error || "Could not load recycle-bin details", "error");
    return;
  }

  batchDetailsCache.set(batchId, response.data);
  renderBatchDetails(batchId);
}

function getSelectedBatchKeys(batchId) {
  return [...document.querySelectorAll(`input[data-batch-id="${batchId}"]:checked`)].map(
    (input) => input.getAttribute("data-cookie-key")
  );
}

function toggleAllBatchCheckboxes(batchId) {
  const checkboxes = [
    ...document.querySelectorAll(`input[data-batch-id="${batchId}"]`),
  ];
  const shouldSelectAll = checkboxes.some((input) => !input.checked);
  checkboxes.forEach((input) => {
    input.checked = shouldSelectAll;
  });
}

async function runAction(type, payload) {
  const statusMessages = {
    APPLY_CLEANUP_PRESET: "Cleaning cookies...",
    CONFIRM_PENDING_FEED_REQUEST: "Processing request...",
    DISMISS_PENDING_FEED_REQUEST: "Dismissing...",
    EXPORT_BACKUP: "Exporting backup...",
    EXPORT_REPORT: "Exporting report...",
    OPEN_DASHBOARD: "Opening dashboard...",
    OPEN_EXTENSION_POPUP: "Opening popup...",
    OPEN_SIDE_PANEL: "Opening panel...",
    RESTORE_BATCH_COOKIES: "Restoring selected cookies...",
    RESTORE_CLEANUP_BATCH: "Restoring batch...",
    RESTORE_LAST_CLEANUP: "Restoring cookies...",
    RUN_SCAN: "Scanning...",
  };

  setStatus(statusMessages[type] || "Working...", "info");
  const response = await sendInternalMessage({ type, payload });

  if (!response.success) {
    setStatus(response.error || "Action failed", "error");
    return;
  }

  if (type === "RUN_SCAN") {
    await refreshState("Scan complete");
    return;
  }

  if (type === "APPLY_CLEANUP_PRESET") {
    await refreshState(
      response.data.deletedCount
        ? `Cleaned ${response.data.deletedCount} cookies`
        : "No cookies to clean"
    );
    return;
  }

  if (type === "CONFIRM_PENDING_FEED_REQUEST") {
    pendingDetails = null;
    pendingDetailsOpen = false;
    await refreshState(
      response.data.deletedCount
        ? `Confirmed - cleaned ${response.data.deletedCount} cookies`
        : "No cookies matched"
    );
    return;
  }

  if (type === "DISMISS_PENDING_FEED_REQUEST") {
    pendingDetails = null;
    pendingDetailsOpen = false;
    await refreshState("Request dismissed");
    return;
  }

  if (type === "RESTORE_CLEANUP_BATCH" || type === "RESTORE_BATCH_COOKIES") {
    batchDetailsCache.delete(payload.batchId);
    await refreshState(
      response.data.restoredCount
        ? `Restored ${response.data.restoredCount} cookies`
        : "No cookies were restored"
    );
    return;
  }

  if (type === "RESTORE_LAST_CLEANUP") {
    await refreshState(
      response.data.restoredCount
        ? `Restored ${response.data.restoredCount} cookies`
        : "No backup available"
    );
    return;
  }

  if (type === "EXPORT_REPORT") {
    setStatus("Report exported", "success");
    return;
  }

  if (type === "EXPORT_BACKUP") {
    setStatus("Backup exported", "success");
    return;
  }

  if (
    type === "OPEN_DASHBOARD" ||
    type === "OPEN_SIDE_PANEL" ||
    type === "OPEN_EXTENSION_POPUP"
  ) {
    setStatus(
      type === "OPEN_DASHBOARD"
        ? "Dashboard opened"
        : type === "OPEN_SIDE_PANEL"
          ? "Panel opened"
          : "Popup opened",
      "success"
    );
    return;
  }

  await refreshState();
}

function bindActions() {
  const bindings = [
    ["scan-button", "RUN_SCAN"],
    ["restore-button", "RESTORE_LAST_CLEANUP"],
    ["export-report-button", "EXPORT_REPORT"],
    ["export-backup-button", "EXPORT_BACKUP"],
    ["open-dashboard-button", "OPEN_DASHBOARD"],
    ["open-popup-button", "OPEN_EXTENSION_POPUP"],
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

  const sidePanelButton = byId("open-sidepanel-button");
  if (sidePanelButton) {
    sidePanelButton.addEventListener("click", () => {
      setStatus("Opening panel...", "info");
      openSidePanelFromUserGesture()
        .then(() => {
          setStatus("Panel opened", "success");
        })
        .catch((error) => {
          setStatus(error instanceof Error ? error.message : "Unknown error", "error");
        });
    });
  }

  document.addEventListener("click", (event) => {
    const actionTrigger = event.target.closest("[data-action]");
    if (!actionTrigger) {
      return;
    }

    const action = actionTrigger.getAttribute("data-action");
    const batchId = actionTrigger.getAttribute("data-batch-id");

    if (action === "toggle-pending-details") {
      pendingDetailsOpen = !pendingDetailsOpen;
      if (!pendingDetailsOpen) {
        renderPendingDetails();
        return;
      }

      loadPendingDetails().catch((error) => {
        setStatus(error instanceof Error ? error.message : "Unknown error", "error");
      });
      return;
    }

    if (!batchId) {
      return;
    }

    if (action === "toggle-batch-details") {
      if (openBatchIds.has(batchId)) {
        openBatchIds.delete(batchId);
        renderRecycleBin(currentState || { recycleBin: [] });
        return;
      }

      openBatchIds.add(batchId);
      renderRecycleBin(currentState || { recycleBin: [] });
      loadRecycleBinBatchDetails(batchId).catch((error) => {
        setStatus(error instanceof Error ? error.message : "Unknown error", "error");
      });
      return;
    }

    if (action === "toggle-batch-selection") {
      toggleAllBatchCheckboxes(batchId);
      return;
    }

    if (action === "restore-batch-all") {
      runAction("RESTORE_CLEANUP_BATCH", { batchId }).catch((error) => {
        setStatus(error instanceof Error ? error.message : "Unknown error", "error");
      });
      return;
    }

    if (action === "restore-batch-selected") {
      const keys = getSelectedBatchKeys(batchId).filter(Boolean);
      if (!keys.length) {
        setStatus("Select at least one cookie to restore", "warning");
        return;
      }

      runAction("RESTORE_BATCH_COOKIES", { batchId, keys }).catch((error) => {
        setStatus(error instanceof Error ? error.message : "Unknown error", "error");
      });
    }
  });
}

function bindRealtimeSync() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (!Object.keys(changes).some((key) => key.startsWith("cm."))) {
      return;
    }

    refreshState().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Unknown error", "error");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindActions();
  bindRealtimeSync();
  refreshState().catch((error) => {
    setStatus(error instanceof Error ? error.message : "Unknown error", "error");
  });
});
