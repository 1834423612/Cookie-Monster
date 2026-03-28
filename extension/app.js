function byId(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = byId(id);
  if (element) {
    element.textContent = value;
  }
}

function setStatus(message, tone = "info") {
  const status = byId("status");
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value || 0);
}

function formatDate(value) {
  if (!value) return "暂无";
  return new Date(value).toLocaleString();
}

async function sendInternalMessage(message) {
  return chrome.runtime.sendMessage(message);
}

let jarData = null;
let isJarOpen = false;
const selectedKeys = new Set();

function getFilters() {
  return {
    query: byId("domain-filter")?.value?.trim().toLowerCase() || "",
    risk: byId("risk-filter")?.value || "all",
    label: byId("label-filter")?.value || "all",
  };
}

function getFilteredDomains() {
  if (!jarData?.domains) return [];
  const filters = getFilters();

  return jarData.domains
    .map((domainEntry) => {
      const cookies = domainEntry.cookies.filter((cookie) => {
        const queryMatch =
          !filters.query ||
          domainEntry.domain.toLowerCase().includes(filters.query) ||
          cookie.name.toLowerCase().includes(filters.query);
        const riskMatch = filters.risk === "all" || cookie.risk === filters.risk;
        const labelMatch = filters.label === "all" || cookie.labels.includes(filters.label);
        return queryMatch && riskMatch && labelMatch;
      });

      return {
        ...domainEntry,
        filteredCookies: cookies,
      };
    })
    .filter((domainEntry) => domainEntry.filteredCookies.length > 0);
}

function renderCookieList() {
  const container = byId("cookie-list");
  if (!container) return;

  if (!isJarOpen) {
    container.innerHTML = '<p class="empty">请点击左侧罐子加载 cookie 列表。</p>';
    return;
  }

  if (!jarData?.domains?.length) {
    container.innerHTML = '<p class="empty">未发现 cookie，或尚未扫描。</p>';
    return;
  }

  const domains = getFilteredDomains();
  if (!domains.length) {
    container.innerHTML = '<p class="empty">当前筛选条件下没有匹配项。</p>';
    return;
  }

  container.innerHTML = "";

  for (const domainEntry of domains) {
    const details = document.createElement("details");
    details.className = "domain-item";
    details.open = false;

    const summary = document.createElement("summary");
    summary.innerHTML = `
      <div>
        <strong>${domainEntry.domain}</strong>
        <small>${formatNumber(domainEntry.filteredCookies.length)} / ${formatNumber(domainEntry.cookieCount)} cookies</small>
      </div>
      <div class="domain-badges">
        <span class="badge danger">高风险 ${domainEntry.counts.high}</span>
        <span class="badge warning">中风险 ${domainEntry.counts.medium}</span>
        <span class="badge safe">低风险 ${domainEntry.counts.low}</span>
      </div>
    `;

    const cookieRows = document.createElement("div");
    cookieRows.className = "cookie-rows";

    for (const cookie of domainEntry.filteredCookies) {
      const checked = selectedKeys.has(cookie.key) ? "checked" : "";
      const locked = cookie.labels.includes("critical");
      const disabled = locked ? "disabled" : "";
      const row = document.createElement("article");
      row.className = "cookie-row";
      row.innerHTML = `
        <label class="cookie-select">
          <input type="checkbox" data-cookie-key="${cookie.key}" ${checked} ${disabled} />
          <span></span>
        </label>
        <div class="cookie-main">
          <div class="cookie-title">
            <strong>${cookie.name}</strong>
            <span class="risk-pill risk-${cookie.risk}">${cookie.risk}</span>
          </div>
          <p class="cookie-meta">path: ${cookie.path} · value: ${cookie.valuePreview}</p>
          <div class="cookie-labels">
            ${cookie.labels
              .map((label) => `<span class="label label-${label}">${label}</span>`)
              .join("")}
          </div>
          <p class="cookie-extra">${cookie.reasons.join("；") || "暂无风险注释"}</p>
          <p class="cookie-extra">SameSite: ${cookie.sameSite} · ${
            cookie.session ? "Session" : `Expires: ${formatDate(cookie.expiresAt)}`
          }</p>
        </div>
      `;
      cookieRows.appendChild(row);
    }

    details.appendChild(summary);
    details.appendChild(cookieRows);
    container.appendChild(details);
  }

  for (const checkbox of container.querySelectorAll("input[type=checkbox][data-cookie-key]")) {
    checkbox.addEventListener("change", () => {
      const key = checkbox.getAttribute("data-cookie-key");
      if (!key) return;
      if (checkbox.checked) selectedKeys.add(key);
      else selectedKeys.delete(key);
      syncSelectionStatus();
    });
  }

  syncSelectionStatus();
}

function syncSelectionStatus() {
  const deleteButton = byId("delete-selected-button");
  if (deleteButton) {
    deleteButton.textContent = selectedKeys.size
      ? `删除已选 (${selectedKeys.size})`
      : "删除已选";
  }
}

function renderCleanup(state) {
  setText("cleanup-count", formatNumber(state.cleanupCount));
  const lastCleanup = state.lastCleanup;
  if (!lastCleanup) {
    setText("cleanup-meta", "暂无删除记录");
    return;
  }

  setText(
    "cleanup-meta",
    `${lastCleanup.label}：${formatNumber(lastCleanup.cookieCount)} cookies，${formatDate(
      lastCleanup.createdAt
    )}`
  );
}

async function refreshState(message) {
  const response = await sendInternalMessage({ type: "GET_STATE" });
  if (!response.success) {
    setStatus(response.error || "无法读取扩展状态", "error");
    return;
  }

  const state = response.data;
  setText("version", state.version);
  setText("extension-id", state.extensionId);
  renderCleanup(state);

  if (message) {
    setStatus(message, "success");
  } else {
    setStatus("就绪：所有 cookie 分析与删除动作仅在本地执行。", "info");
  }
}

async function refreshJarData(message) {
  const response = await sendInternalMessage({ type: "GET_COOKIE_JAR_VIEW" });
  if (!response.success) {
    setStatus(response.error || "读取罐子失败", "error");
    return;
  }

  jarData = response.data;
  setText("total-cookies", formatNumber(jarData.totalCookies));
  setText("total-domains", formatNumber(jarData.totalDomains));

  const recommended = jarData.domains.reduce((sum, domain) => sum + domain.recommendedCount, 0);
  setText("total-recommended", formatNumber(recommended));

  renderCookieList();
  if (message) {
    setStatus(message, "success");
  }
}

async function runAction(type, payload) {
  const labelMap = {
    RUN_SCAN: "正在本地扫描 cookie...",
    DELETE_SELECTED_COOKIES: "正在删除已选 cookie...",
    RESTORE_LAST_CLEANUP: "正在恢复上次删除批次...",
    EXPORT_REPORT: "正在导出摘要...",
    EXPORT_BACKUP: "正在导出备份...",
  };
  setStatus(labelMap[type] || "处理中...", "info");

  const response = await sendInternalMessage({ type, payload });
  if (!response.success) {
    setStatus(response.error || "操作失败", "error");
    return;
  }

  selectedKeys.clear();
  await refreshState();
  await refreshJarData(
    type === "DELETE_SELECTED_COOKIES"
      ? `删除完成：${response.data?.deletedCount || 0} 个 cookie。`
      : "操作完成。"
  );
}

function bindEvents() {
  byId("scan-button")?.addEventListener("click", () => runAction("RUN_SCAN"));
  byId("restore-button")?.addEventListener("click", () => runAction("RESTORE_LAST_CLEANUP"));
  byId("export-report-button")?.addEventListener("click", () => runAction("EXPORT_REPORT"));
  byId("export-backup-button")?.addEventListener("click", () => runAction("EXPORT_BACKUP"));

  byId("jar-toggle-button")?.addEventListener("click", async () => {
    isJarOpen = !isJarOpen;
    byId("jar-toggle-button")?.setAttribute("aria-expanded", String(isJarOpen));
    if (isJarOpen && !jarData) {
      await refreshJarData("饼干罐已打开。");
    } else {
      renderCookieList();
    }
  });

  byId("recommend-select-button")?.addEventListener("click", () => {
    if (!jarData?.domains) return;
    selectedKeys.clear();
    for (const domain of jarData.domains) {
      for (const cookie of domain.cookies) {
        if (cookie.labels.includes("recommended") && !cookie.labels.includes("critical")) {
          selectedKeys.add(cookie.key);
        }
      }
    }
    renderCookieList();
    setStatus(`已自动选择 ${selectedKeys.size} 个推荐删除项。`, "success");
  });

  byId("clear-selection-button")?.addEventListener("click", () => {
    selectedKeys.clear();
    renderCookieList();
    setStatus("已清空选择。", "info");
  });

  byId("delete-selected-button")?.addEventListener("click", () => {
    if (!selectedKeys.size) {
      setStatus("请至少选择一个 cookie。", "error");
      return;
    }
    runAction("DELETE_SELECTED_COOKIES", { keys: [...selectedKeys] });
  });

  for (const filterId of ["domain-filter", "risk-filter", "label-filter"]) {
    byId(filterId)?.addEventListener("input", () => renderCookieList());
    byId(filterId)?.addEventListener("change", () => renderCookieList());
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  refreshState().catch((error) => {
    setStatus(error instanceof Error ? error.message : "初始化失败", "error");
  });
});
