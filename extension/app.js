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

function renderRecommendations(recommendations = []) {
  const list = byId("recommendations");
  if (!list) {
    return;
  }

  list.innerHTML = "";

  if (!recommendations.length) {
    const item = document.createElement("li");
    item.className = "list-empty";
    item.textContent = "No cleanup recommendations yet. Run a scan first.";
    list.appendChild(item);
    return;
  }

  for (const recommendation of recommendations) {
    const item = document.createElement("li");
    item.className = "recommendation-row";
    item.innerHTML = `
      <div>
        <strong>${recommendation.title}</strong>
        <p>${recommendation.description}</p>
      </div>
      <span class="recommendation-pill risk-${recommendation.tone}">${formatNumber(
        recommendation.cookieCount
      )}</span>
    `;
    list.appendChild(item);
  }
}

function renderPresetCards(presets = []) {
  const grid = byId("preset-grid");
  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  if (!presets.length) {
    const empty = document.createElement("div");
    empty.className = "list-empty";
    empty.textContent = "No monster-ready cookie presets yet. Scan the browser to generate them.";
    grid.appendChild(empty);
    return;
  }

  for (const preset of presets) {
    const card = document.createElement("article");
    card.className = "preset-card";
    card.innerHTML = `
      <div>
        <div class="preset-head">
          <h4>${preset.label}</h4>
          <span>${formatNumber(preset.cookieCount)} cookies</span>
        </div>
        <p>${preset.description}</p>
        <div class="preset-meta">
          <span>${formatNumber(preset.domainCount)} domains</span>
          <span>${preset.sampleDomains.join(", ") || "No sample domains yet"}</span>
        </div>
      </div>
      <button class="secondary preset-action" data-preset-id="${preset.id}">Feed This Batch</button>
    `;
    grid.appendChild(card);
  }

  for (const button of grid.querySelectorAll(".preset-action")) {
    button.addEventListener("click", () => {
      const presetId = button.getAttribute("data-preset-id");
      runAction("APPLY_CLEANUP_PRESET", { presetId }).catch((error) => {
        setStatus(error instanceof Error ? error.message : "Unknown error", "error");
      });
    });
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
    `${lastCleanup.label} backed up ${formatNumber(lastCleanup.cookieCount)} cookies on ${formatDate(
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
    return;
  }

  empty.hidden = true;
  panel.hidden = false;

  setText("pending-request-title", pendingFeedRequest.label);
  setText("pending-request-meta", `${formatNumber(pendingFeedRequest.cookieCount)} cookies across ${formatNumber(pendingFeedRequest.domainCount)} domains`);
  setText("pending-request-description", pendingFeedRequest.description);
  setText(
    "pending-request-domains",
    pendingFeedRequest.sampleDomains.length
      ? pendingFeedRequest.sampleDomains.join(", ")
      : "No sample domains available"
  );
}

function renderReport(report) {
  toggleEmptyState(Boolean(report));

  if (!report) {
    renderPresetCards([]);
    renderRecommendations([]);
    return;
  }

  setText("generated-at", formatDate(report.generatedAt));
  setText("total-cookies", formatNumber(report.totals.cookies));
  setText("total-domains", formatNumber(report.totals.domains));
  setText("high-risk", formatNumber(report.risk.high));
  setText("medium-risk", formatNumber(report.risk.medium));
  setText("low-risk", formatNumber(report.risk.low));
  setText(
    "flag-summary",
    `${formatNumber(report.flags.secure)} secure / ${formatNumber(report.flags.httpOnly)} HttpOnly`
  );
  setText(
    "category-summary",
    `${formatNumber(report.categories.analytics)} analytics / ${formatNumber(
      report.categories.advertising
    )} advertising`
  );
  setText(
    "feed-summary",
    report.cleanup
      ? `${formatNumber(report.cleanup.totalCandidates)} cookies currently look feedable to the monster.`
      : "No cleanup insights available yet."
  );

  renderTopDomains(report.topDomains);
  renderPresetCards(report.cleanup?.presets || []);
  renderRecommendations(report.cleanup?.recommendations || []);
}



const inventoryState = {
  open: false,
  allGroups: [],
  search: "",
  filter: "all",
};

function formatExpiryForInventory(expirationDate) {
  if (!expirationDate) {
    return "Session";
  }

  return new Date(expirationDate * 1000).toLocaleString();
}

function applyInventoryFilters(groups) {
  const query = inventoryState.search.trim().toLowerCase();
  const filter = inventoryState.filter;

  return groups
    .map((group) => {
      const items = group.items.filter((item) => {
        const queryHit =
          !query ||
          item.name.toLowerCase().includes(query) ||
          item.domain.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query);
        const filterHit = filter === "all" || (item.presetIds || []).includes(filter);
        return queryHit && filterHit;
      });

      return {
        ...group,
        items,
      };
    })
    .filter((group) => group.items.length > 0)
    .sort((left, right) => right.items.length - left.items.length);
}

function renderInventory() {
  const shell = byId("inventory-shell");
  const list = byId("inventory-list");
  const summary = byId("inventory-summary");
  const toggleButton = byId("jar-toggle-button");
  const layout = byId("monster-layout");

  if (!shell || !list || !summary || !toggleButton || !layout) {
    return;
  }

  shell.hidden = !inventoryState.open;
  toggleButton.setAttribute("aria-expanded", String(inventoryState.open));
  layout.classList.toggle("expanded", inventoryState.open);

  if (!inventoryState.open) {
    return;
  }

  const groups = applyInventoryFilters(inventoryState.allGroups);
  const totalCookies = groups.reduce((count, group) => count + group.items.length, 0);
  summary.textContent = `${formatNumber(groups.length)} domains / ${formatNumber(totalCookies)} cookies in current view`;

  list.innerHTML = "";

  if (!groups.length) {
    const empty = document.createElement("div");
    empty.className = "list-empty";
    empty.textContent = "No cookies match this filter.";
    list.appendChild(empty);
    return;
  }

  for (const group of groups) {
    const details = document.createElement("details");
    details.className = "inventory-domain";

    const summaryLine = document.createElement("summary");
    summaryLine.innerHTML = `<strong>${group.domain}</strong><span>${formatNumber(group.items.length)} cookies</span>`;
    details.appendChild(summaryLine);

    for (const item of group.items) {
      const card = document.createElement("article");
      card.className = "inventory-cookie";
      const labels = [
        `<span class="recommendation-pill risk-${item.risk}">${item.risk}</span>`,
        `<span class="recommendation-pill">${item.category}</span>`,
        item.recommendedKeep ? `<span class="recommendation-pill">keep-protected</span>` : "",
      ]
        .filter(Boolean)
        .join("");

      card.innerHTML = `
        <div class="inventory-cookie-head">
          <strong>${item.name}</strong>
          <div class="inventory-labels">${labels}</div>
        </div>
        <p class="muted">Path ${item.path} · Expires ${formatExpiryForInventory(item.expirationDate)}</p>
        <p class="muted">${(item.reasons || []).join("; ") || "No additional reasons"}</p>
      `;
      details.appendChild(card);
    }

    list.appendChild(details);
  }
}

async function refreshInventory() {
  const response = await sendInternalMessage({ type: "GET_COOKIE_INVENTORY" });

  if (!response.success || !Array.isArray(response.data)) {
    inventoryState.allGroups = [];
    renderInventory();
    return;
  }

  inventoryState.allGroups = response.data;
  renderInventory();
}

async function sendInternalMessage(message) {
  return chrome.runtime.sendMessage(message);
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

  if (inventoryState.open) {
    refreshInventory().catch(() => undefined);
  }

  if (message) {
    setStatus(message, "success");
  } else if (state.pendingFeedRequest) {
    setStatus("A website feed request is waiting for your local confirmation.", "info");
  } else if (state.report) {
    setStatus("Summary report is ready. Website sync uses sanitized data only.", "info");
  } else {
    setStatus("Run your first scan to generate a local summary report.", "info");
  }
}

async function runAction(type, payload) {
  const statusLabelMap = {
    APPLY_CLEANUP_PRESET: "Feeding the selected cookie batch to the monster...",
    CONFIRM_PENDING_FEED_REQUEST: "Confirming website feed request...",
    DISMISS_PENDING_FEED_REQUEST: "Dismissing pending website request...",
    EXPORT_BACKUP: "Preparing cleanup backup export...",
    EXPORT_REPORT: "Preparing summary report export...",
    OPEN_DASHBOARD: "Opening the full extension dashboard...",
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
      await refreshState("Scan complete. Cleanup presets and website sync data were refreshed.");
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
          ? `Website request confirmed. Fed ${deleted} cookies to the monster.`
          : "The pending request did not match any removable cookies."
      );
      break;
    }
    case "DISMISS_PENDING_FEED_REQUEST":
      await refreshState("The pending website feed request was dismissed.");
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
    ["restore-button", "RESTORE_LAST_CLEANUP"],
    ["export-report-button", "EXPORT_REPORT"],
    ["export-backup-button", "EXPORT_BACKUP"],
    ["open-dashboard-button", "OPEN_DASHBOARD"],
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

  const jarToggleButton = byId("jar-toggle-button");
  if (jarToggleButton) {
    jarToggleButton.addEventListener("click", () => {
      inventoryState.open = !inventoryState.open;
      renderInventory();
      if (inventoryState.open) {
        refreshInventory().catch(() => undefined);
      }
    });
  }

  const collapseInventoryButton = byId("collapse-inventory-button");
  if (collapseInventoryButton) {
    collapseInventoryButton.addEventListener("click", () => {
      inventoryState.open = false;
      renderInventory();
    });
  }

  const inventorySearch = byId("inventory-search");
  if (inventorySearch) {
    inventorySearch.addEventListener("input", (event) => {
      inventoryState.search = event.target.value || "";
      renderInventory();
    });
  }

  const inventoryFilter = byId("inventory-filter");
  if (inventoryFilter) {
    inventoryFilter.addEventListener("change", (event) => {
      inventoryState.filter = event.target.value || "all";
      renderInventory();
    });
  }

  const inventoryRefresh = byId("inventory-refresh-button");
  if (inventoryRefresh) {
    inventoryRefresh.addEventListener("click", () => {
      refreshInventory().catch((error) => {
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
  renderInventory();
});
