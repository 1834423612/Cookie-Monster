const uiState = {
  domains: [],
  expandedDomains: new Set(),
  selectedKeys: new Set(),
  jarOpen: false,
  filter: "all",
  query: "",
};

function byId(id) { return document.getElementById(id); }
function setText(id, value) { const el = byId(id); if (el) el.textContent = value; }
function formatNumber(value) { return new Intl.NumberFormat().format(value || 0); }
function formatDate(value) { return value ? new Date(value).toLocaleString() : "Not available yet"; }

function setStatus(message, tone = "info") {
  const element = byId("status");
  if (!element) return;
  element.textContent = message;
  element.dataset.tone = tone;
}

function toggleEmptyState(hasReport) {
  const empty = byId("empty-state");
  const panel = byId("report-shell");
  if (!empty || !panel) return;
  empty.hidden = hasReport;
  panel.hidden = !hasReport;
}

function getRiskClass(risk) {
  return risk === "high" ? "risk-high" : risk === "medium" ? "risk-medium" : "risk-low";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFilteredDomains() {
  const query = uiState.query.trim().toLowerCase();
  return uiState.domains
    .map((domainItem) => {
      const cookies = domainItem.cookies.filter((cookie) => {
        const passFilter =
          uiState.filter === "all" ||
          (uiState.filter === "recommended" && cookie.recommendedDelete) ||
          (uiState.filter === "high" && cookie.risk === "high") ||
          (uiState.filter === "essential" && cookie.protected);

        if (!passFilter) return false;
        if (!query) return true;

        return (
          cookie.name.toLowerCase().includes(query) ||
          domainItem.domain.toLowerCase().includes(query)
        );
      });

      return { ...domainItem, cookies };
    })
    .filter((item) => item.cookies.length > 0);
}

function updateSelectionSummary() {
  setText("selection-summary", `${formatNumber(uiState.selectedKeys.size)} selected`);
  const deleteButton = byId("delete-selected-button");
  if (deleteButton) {
    deleteButton.disabled = uiState.selectedKeys.size === 0;
  }
}

function renderCookieDomains() {
  const container = byId("cookie-domain-list");
  if (!container) return;

  const domains = getFilteredDomains();
  container.innerHTML = "";

  if (!domains.length) {
    container.innerHTML = '<div class="empty-state">No cookies matched current filters.</div>';
    updateSelectionSummary();
    return;
  }

  for (const domainItem of domains) {
    const expanded = uiState.expandedDomains.has(domainItem.domain);
    const wrapper = document.createElement("article");
    wrapper.className = "domain-card";

    const selectedInDomain = domainItem.cookies.filter((cookie) => uiState.selectedKeys.has(cookie.key)).length;

    const cookieRows = expanded
      ? `<div class="cookie-list">${domainItem.cookies
          .map((cookie) => {
            const checked = uiState.selectedKeys.has(cookie.key) ? "checked" : "";
            const expiryLabel = cookie.expiresAt ? formatDate(cookie.expiresAt) : "Session";
            return `<label class="cookie-item">
              <div class="cookie-item-head">
                <span><input type="checkbox" data-cookie-key="${escapeHtml(cookie.key)}" ${checked} /> <code>${escapeHtml(cookie.name)}</code></span>
                <span class="${getRiskClass(cookie.risk)}">${escapeHtml(cookie.risk)}</span>
              </div>
              <div>
                ${cookie.protected ? '<span class="badge protected">Protected</span>' : '<span class="badge recommended">Removable</span>'}
              </div>
              <dl>
                <dt>Category</dt><dd>${escapeHtml(cookie.category)}</dd>
                <dt>Path</dt><dd>${escapeHtml(cookie.path || "/")}</dd>
                <dt>Expires</dt><dd>${escapeHtml(expiryLabel)}</dd>
                <dt>Flags</dt><dd>${cookie.secure ? "Secure " : ""}${cookie.httpOnly ? "HttpOnly" : "Script-visible"}</dd>
                <dt>Reason</dt><dd>${escapeHtml((cookie.reasons || []).join("; ") || "No specific reason")}</dd>
              </dl>
            </label>`;
          })
          .join("")}</div>`
      : "";

    wrapper.innerHTML = `
      <div class="domain-head" data-domain-toggle="${escapeHtml(domainItem.domain)}">
        <div>
          <strong>${escapeHtml(domainItem.domain)}</strong>
          <div class="domain-meta">${formatNumber(domainItem.cookies.length)} cookies · ${formatNumber(selectedInDomain)} selected</div>
        </div>
        <span>${expanded ? "▾" : "▸"}</span>
      </div>
      ${cookieRows}
    `;

    container.appendChild(wrapper);
  }

  container.querySelectorAll("[data-domain-toggle]").forEach((node) => {
    node.addEventListener("click", () => {
      const domain = node.getAttribute("data-domain-toggle");
      if (!domain) return;
      if (uiState.expandedDomains.has(domain)) uiState.expandedDomains.delete(domain);
      else uiState.expandedDomains.add(domain);
      renderCookieDomains();
    });
  });

  container.querySelectorAll("[data-cookie-key]").forEach((node) => {
    node.addEventListener("change", () => {
      const key = node.getAttribute("data-cookie-key");
      if (!key) return;
      if (node.checked) uiState.selectedKeys.add(key);
      else uiState.selectedKeys.delete(key);
      updateSelectionSummary();
    });
  });

  updateSelectionSummary();
}

function renderPendingFeedRequest(pendingFeedRequest) {
  const panel = byId("pending-request-panel");
  const empty = byId("pending-request-empty");
  if (!panel || !empty) return;
  if (!pendingFeedRequest) { panel.hidden = true; empty.hidden = false; return; }

  empty.hidden = true;
  panel.hidden = false;
  setText("pending-request-title", pendingFeedRequest.label);
  setText("pending-request-meta", `${formatNumber(pendingFeedRequest.cookieCount)} cookies across ${formatNumber(pendingFeedRequest.domainCount)} domains`);
  setText("pending-request-description", pendingFeedRequest.description);
  setText("pending-request-domains", pendingFeedRequest.sampleDomains.length ? pendingFeedRequest.sampleDomains.join(", ") : "No sample domains available");
}

function renderCleanup(state) {
  setText("cleanup-count", formatNumber(state.cleanupCount));
  if (!state.lastCleanup) { setText("cleanup-meta", "No cleanup batch stored yet."); return; }
  setText("cleanup-meta", `${state.lastCleanup.label} backed up ${formatNumber(state.lastCleanup.cookieCount)} cookies on ${formatDate(state.lastCleanup.createdAt)}`);
}

function renderReport(report, localInventory = []) {
  toggleEmptyState(Boolean(report));
  if (!report) {
    uiState.domains = [];
    renderCookieDomains();
    return;
  }

  setText("generated-at", formatDate(report.generatedAt));
  setText("total-cookies", formatNumber(report.totals.cookies));
  setText("total-domains", formatNumber(report.totals.domains));
  uiState.domains = Array.isArray(localInventory) ? localInventory : [];
  renderCookieDomains();
}

async function sendInternalMessage(message) { return chrome.runtime.sendMessage(message); }

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
  renderReport(state.report, state.localInventory);

  if (message) setStatus(message, "success");
  else if (state.pendingFeedRequest) setStatus("A website feed request is waiting for your local confirmation.", "info");
  else if (state.report) setStatus("Local cookie list is ready. Data stays in this extension.", "info");
  else setStatus("Run your first scan to generate a local summary report.", "info");
}

async function runAction(type, payload) {
  const statusLabelMap = {
    APPLY_CLEANUP_PRESET: "Feeding selected preset...",
    CONFIRM_PENDING_FEED_REQUEST: "Confirming website feed request...",
    DELETE_COOKIE_SELECTION: "Deleting selected cookies locally...",
    DISMISS_PENDING_FEED_REQUEST: "Dismissing pending website request...",
    EXPORT_BACKUP: "Preparing cleanup backup export...",
    EXPORT_REPORT: "Preparing summary report export...",
    OPEN_DASHBOARD: "Opening dashboard...",
    RESTORE_LAST_CLEANUP: "Restoring latest cleanup batch...",
    RUN_SCAN: "Scanning cookies locally...",
  };

  setStatus(statusLabelMap[type] || "Working...", "info");
  const response = await sendInternalMessage({ type, payload });
  if (!response.success) {
    setStatus(response.error || "The action failed.", "error");
    return;
  }

  if (type === "DELETE_COOKIE_SELECTION") {
    uiState.selectedKeys.clear();
    await refreshState(`Deleted ${response.data.deletedCount || 0} selected cookies and stored local backup.`);
    return;
  }

  if (type === "RUN_SCAN") {
    await refreshState("Scan complete. Local list refreshed.");
    return;
  }

  if (type === "APPLY_CLEANUP_PRESET" || type === "CONFIRM_PENDING_FEED_REQUEST") {
    await refreshState(`Fed ${response.data.deletedCount || 0} cookies to the monster.`);
    return;
  }

  if (type === "DISMISS_PENDING_FEED_REQUEST") {
    await refreshState("The pending website feed request was dismissed.");
    return;
  }

  if (type === "RESTORE_LAST_CLEANUP") {
    await refreshState(`Restored ${response.data.restoredCount || 0} cookies from latest cleanup.`);
    return;
  }

  await refreshState();
}

function bindFilters() {
  byId("search-input")?.addEventListener("input", (event) => {
    uiState.query = event.target.value || "";
    renderCookieDomains();
  });

  document.querySelectorAll(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.getAttribute("data-filter") || "all";
      uiState.filter = next;
      document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.remove("active"));
      button.classList.add("active");
      renderCookieDomains();
    });
  });

  byId("jar-toggle")?.addEventListener("click", () => {
    uiState.jarOpen = !uiState.jarOpen;
    const reportShell = byId("report-shell");
    if (reportShell) reportShell.hidden = !uiState.jarOpen;
    const jarToggle = byId("jar-toggle");
    if (jarToggle) jarToggle.setAttribute("aria-expanded", uiState.jarOpen ? "true" : "false");
  });

  byId("delete-selected-button")?.addEventListener("click", () => {
    runAction("DELETE_COOKIE_SELECTION", { keys: [...uiState.selectedKeys] }).catch((error) => {
      setStatus(error instanceof Error ? error.message : "Unknown error", "error");
    });
  });
}

function bindActions() {
  const bindings = [
    ["scan-button", "RUN_SCAN"],
    ["restore-button", "RESTORE_LAST_CLEANUP"],
    ["export-report-button", "EXPORT_REPORT"],
    ["export-backup-button", "EXPORT_BACKUP"],
    ["open-dashboard-button", "OPEN_DASHBOARD"],
    ["confirm-request-button", "CONFIRM_PENDING_FEED_REQUEST"],
    ["dismiss-request-button", "DISMISS_PENDING_FEED_REQUEST"],
  ];

  for (const [id, type] of bindings) {
    const button = byId(id);
    if (!button) continue;
    button.addEventListener("click", () => {
      runAction(type).catch((error) => setStatus(error instanceof Error ? error.message : "Unknown error", "error"));
    });
  }

  byId("cleanup-button")?.addEventListener("click", () => {
    runAction("APPLY_CLEANUP_PRESET", { presetId: "highRisk" }).catch((error) => {
      setStatus(error instanceof Error ? error.message : "Unknown error", "error");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindFilters();
  bindActions();
  refreshState().catch((error) => setStatus(error instanceof Error ? error.message : "Unknown error", "error"));
});
