/**
 * Cookie Monster Extension - Popup Script
 * Handles UI interactions and state management
 */

// ========================================
// DOM Utilities
// ========================================

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
    return "Never";
  }
  const date = new Date(value);
  const now = new Date();
  const diff = now - date;
  
  // Show relative time for recent scans
  if (diff < 60000) {
    return "Just now";
  }
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  return date.toLocaleDateString();
}

// ========================================
// Status Management
// ========================================

function setStatus(message, tone = "info") {
  const statusBar = byId("status-bar");
  const statusText = byId("status-text");
  
  if (!statusBar || !statusText) {
    return;
  }
  
  statusText.textContent = message;
  statusBar.dataset.tone = tone;
  
  // Update status icon based on tone
  const iconMap = {
    info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
  };
  
  const statusIcon = statusBar.querySelector('.status-icon');
  if (statusIcon && iconMap[tone]) {
    statusIcon.innerHTML = iconMap[tone];
  }
}

// ========================================
// Extension Communication
// ========================================

async function sendInternalMessage(message) {
  return chrome.runtime.sendMessage(message);
}

// ========================================
// Render Functions
// ========================================

function renderCleanup(state) {
  const lastCleanup = state.lastCleanup;
  setText("cleanup-count", formatNumber(state.cleanupCount));
  
  if (!lastCleanup) {
    setText("cleanup-meta", "No backup yet");
    return;
  }
  
  setText("cleanup-meta", formatDate(lastCleanup.createdAt));
}

function renderPendingFeedRequest(pendingFeedRequest) {
  const section = byId("pending-section");
  const panel = byId("pending-request-panel");
  
  if (!section || !panel) {
    return;
  }
  
  if (!pendingFeedRequest) {
    section.hidden = true;
    return;
  }
  
  section.hidden = false;
  
  setText("pending-request-title", pendingFeedRequest.label);
  setText("pending-request-description", pendingFeedRequest.description || "");
  setText(
    "pending-request-meta",
    `${formatNumber(pendingFeedRequest.cookieCount)} cookies · ${formatNumber(pendingFeedRequest.domainCount)} domains`
  );
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

// ========================================
// State Management
// ========================================

async function refreshState(message) {
  const response = await sendInternalMessage({ type: "GET_STATE" });
  
  if (!response.success) {
    setStatus(response.error || "Failed to load state", "error");
    return;
  }
  
  const state = response.data;
  setText("version", state.version);
  
  renderCleanup(state);
  renderPendingFeedRequest(state.pendingFeedRequest);
  renderReport(state.report);
  
  if (message) {
    setStatus(message, "success");
    return;
  }
  
  if (state.pendingFeedRequest) {
    setStatus("Website request waiting for approval", "warning");
    return;
  }
  
  if (state.report) {
    setStatus("Ready - scan cache is current", "success");
    return;
  }
  
  setStatus("Run a scan to analyze cookies", "info");
}

// ========================================
// Action Handler
// ========================================

async function runAction(type, payload) {
  const statusMessages = {
    APPLY_CLEANUP_PRESET: "Cleaning cookies...",
    CONFIRM_PENDING_FEED_REQUEST: "Processing request...",
    DISMISS_PENDING_FEED_REQUEST: "Dismissing...",
    EXPORT_BACKUP: "Exporting backup...",
    EXPORT_REPORT: "Exporting report...",
    OPEN_DASHBOARD: "Opening dashboard...",
    OPEN_SIDE_PANEL: "Opening panel...",
    RESTORE_LAST_CLEANUP: "Restoring cookies...",
    RUN_SCAN: "Scanning...",
  };
  
  setStatus(statusMessages[type] || "Working...", "info");
  
  const response = await sendInternalMessage({ type, payload });
  
  if (!response.success) {
    setStatus(response.error || "Action failed", "error");
    return;
  }
  
  // Handle success responses
  switch (type) {
    case "RUN_SCAN":
      await refreshState("Scan complete");
      break;
      
    case "APPLY_CLEANUP_PRESET": {
      const count = response.data.deletedCount || 0;
      await refreshState(count ? `Cleaned ${count} cookies` : "No cookies to clean");
      break;
    }
    
    case "CONFIRM_PENDING_FEED_REQUEST": {
      const count = response.data.deletedCount || 0;
      await refreshState(count ? `Confirmed - cleaned ${count} cookies` : "No cookies matched");
      break;
    }
    
    case "DISMISS_PENDING_FEED_REQUEST":
      await refreshState("Request dismissed");
      break;
      
    case "RESTORE_LAST_CLEANUP": {
      const count = response.data.restoredCount || 0;
      await refreshState(count ? `Restored ${count} cookies` : "No backup available");
      break;
    }
    
    case "EXPORT_REPORT":
      setStatus("Report exported", "success");
      break;
      
    case "EXPORT_BACKUP":
      setStatus("Backup exported", "success");
      break;
      
    case "OPEN_DASHBOARD":
      setStatus("Dashboard opened", "success");
      break;
      
    case "OPEN_SIDE_PANEL":
      setStatus("Panel opened", "success");
      break;
      
    default:
      await refreshState();
      break;
  }
}

// ========================================
// Event Bindings
// ========================================

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
    if (!button) continue;
    
    button.addEventListener("click", () => {
      runAction(type).catch((error) => {
        setStatus(error instanceof Error ? error.message : "Unknown error", "error");
      });
    });
  }
  
  // Special handler for cleanup button with preset
  const cleanupButton = byId("cleanup-button");
  if (cleanupButton) {
    cleanupButton.addEventListener("click", () => {
      runAction("APPLY_CLEANUP_PRESET", { presetId: "highRisk" }).catch((error) => {
        setStatus(error instanceof Error ? error.message : "Unknown error", "error");
      });
    });
  }
}

// ========================================
// Initialize
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  bindActions();
  refreshState().catch((error) => {
    setStatus(error instanceof Error ? error.message : "Unknown error", "error");
  });
});
