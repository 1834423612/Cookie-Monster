"use client";

import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  requestCookieFeed,
  type CleanupPresetId,
  type CookieDomainGroup,
  type CookieSummaryReport,
} from "@/lib/extension-bridge";
import { useExtensionStatus } from "@/hooks/use-extension-status";
import { useCookieInventory } from "@/hooks/use-cookie-inventory";

const presetFilters: Array<{ id: CleanupPresetId; label: string }> = [
  { id: "balanced", label: "推荐可清理" },
  { id: "trackers", label: "追踪类" },
  { id: "highRisk", label: "高风险" },
  { id: "expired", label: "已过期" },
  { id: "longLived", label: "长期驻留" },
];

function formatExpiry(expirationDate: number | null) {
  if (!expirationDate) {
    return "会话 Cookie";
  }

  return new Date(expirationDate * 1000).toLocaleString();
}

function buildDemoGroups(report: CookieSummaryReport | null): CookieDomainGroup[] {
  if (!report) {
    return [];
  }

  return report.topDomains.slice(0, 8).map((domain, index) => {
    const count = Math.max(1, Math.min(domain.count, 6));
    return {
      domain: domain.domain,
      total: count,
      highRiskCount: domain.riskLevel === "high" ? Math.ceil(count / 2) : 0,
      recommendedKeepCount: 1,
      items: Array.from({ length: count }).map((_, cookieIndex) => ({
        key: `mock-${index}-${cookieIndex}`,
        name: `${cookieIndex === 0 ? "session" : "cookie"}_${cookieIndex + 1}`,
        domain: domain.domain,
        path: "/",
        storeId: "mock-store",
        session: cookieIndex % 2 === 0,
        secure: true,
        httpOnly: cookieIndex % 2 === 0,
        sameSite: "lax",
        category: cookieIndex === 0 ? "essential" : "analytics",
        risk: domain.riskLevel,
        expirationDate: cookieIndex % 2 === 0 ? null : Date.now() / 1000 + 86400 * 14,
        reasons: ["Demo 数据：用于本地安全演示"],
        recommendedKeep: cookieIndex === 0,
        presetIds: cookieIndex === 0 ? [] : ["balanced", "trackers"],
      })),
    };
  });
}

function applyFilters(groups: CookieDomainGroup[], query: string, activePreset: CleanupPresetId | "all") {
  const lowerQuery = query.trim().toLowerCase();

  return groups
    .map((group) => {
      const items = group.items.filter((item) => {
        const queryHit =
          !lowerQuery ||
          item.name.toLowerCase().includes(lowerQuery) ||
          item.domain.toLowerCase().includes(lowerQuery) ||
          item.category.toLowerCase().includes(lowerQuery);

        const presetHit = activePreset === "all" || item.presetIds.includes(activePreset);
        return queryHit && presetHit;
      });

      return {
        ...group,
        items,
        total: items.length,
        highRiskCount: items.filter((item) => item.risk === "high").length,
        recommendedKeepCount: items.filter((item) => item.recommendedKeep).length,
      };
    })
    .filter((group) => group.items.length > 0)
    .sort((left, right) => right.total - left.total);
}

export default function HomePage() {
  const extensionStatus = useExtensionStatus();
  const inventory = useCookieInventory(extensionStatus.isInstalled && !extensionStatus.isUsingMockData);

  const [isJarOpened, setIsJarOpened] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState<CleanupPresetId | "all">("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);

  const sourceGroups = useMemo(() => {
    if (extensionStatus.isUsingMockData) {
      return buildDemoGroups(extensionStatus.report);
    }
    return inventory.groups;
  }, [extensionStatus.isUsingMockData, extensionStatus.report, inventory.groups]);

  const filteredGroups = useMemo(
    () => applyFilters(sourceGroups, query, preset),
    [sourceGroups, query, preset]
  );

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const selectedPresetHint = useMemo(() => {
    const firstSelected = Object.entries(selected).find(([, checked]) => checked)?.[0];
    if (!firstSelected) return null;

    for (const group of filteredGroups) {
      const item = group.items.find((cookie) => cookie.key === firstSelected);
      if (item) return item.presetIds[0] || null;
    }

    return null;
  }, [filteredGroups, selected]);

  const toggleCookie = (key: string) => {
    setSelected((current) => ({ ...current, [key]: !current[key] }));
  };

  const canRequestFeed = extensionStatus.isInstalled && !extensionStatus.isUsingMockData;

  const requestFeed = async () => {
    if (!canRequestFeed) {
      setMessage("当前是测试数据模式，已禁用真实删除请求。");
      return;
    }

    const targetPreset: CleanupPresetId = selectedPresetHint || (preset === "all" ? "balanced" : preset);
    const pending = await requestCookieFeed({ presetId: targetPreset });

    if (pending) {
      setMessage(`已创建本地待确认清理请求：${pending.label}（${pending.cookieCount} 个 Cookie）`);
      return;
    }

    setMessage("暂未匹配到可删除 Cookie，建议先在插件中执行扫描。");
  };

  return (
    <div className="min-h-screen bg-[#f8f3ea] text-[#2d261a]">
      <main className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-4 rounded-3xl border border-[#d9ccb8] bg-white/80 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold">Cookie Monster 单页操作台</h1>
          <p className="mt-2 text-sm text-[#6f6453]">
            默认：左侧罐子 + 右侧小怪物。点击罐子后切换为大列表视图，怪物自动缩小到右侧。
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-1">
              数据源：{extensionStatus.isUsingMockData ? "测试数据" : "真实插件数据"}
            </span>
            {extensionStatus.isDevMode && (
              <>
                <button
                  onClick={() => extensionStatus.setDataMode("auto")}
                  className={`rounded-full px-2 py-1 ${
                    extensionStatus.dataMode === "auto" ? "bg-emerald-100" : "bg-slate-100"
                  }`}
                >
                  自动切换真实数据
                </button>
                <button
                  onClick={() => extensionStatus.setDataMode("mock")}
                  className={`rounded-full px-2 py-1 ${
                    extensionStatus.dataMode === "mock" ? "bg-amber-100" : "bg-slate-100"
                  }`}
                >
                  强制测试数据
                </button>
              </>
            )}
          </div>
          {message && <p className="mt-3 text-sm text-[#1b6f3a]">{message}</p>}
        </div>

        <section className={`grid gap-4 ${isJarOpened ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {!isJarOpened ? (
            <button
              onClick={() => setIsJarOpened(true)}
              className="rounded-3xl border border-[#d9ccb8] bg-[#fff7ea] p-8 text-center transition hover:shadow-lg"
            >
              <div className="mx-auto mb-3 h-40 w-40 rounded-3xl border border-[#dbc8ad] bg-white/80 text-8xl leading-[10rem]">
                🫙
              </div>
              <strong className="text-xl">点击罐子进入 Cookie 列表</strong>
              <p className="mt-2 text-sm text-[#6f6453]">占位图：后续可替换为正式角色素材</p>
            </button>
          ) : (
            <section className="rounded-3xl border border-[#d9ccb8] bg-white/95 p-4 md:col-span-2">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Cookie 大列表（本地）</h2>
                <button
                  onClick={() => setIsJarOpened(false)}
                  className="rounded-xl border border-[#ddcfba] bg-white px-3 py-1.5 text-sm"
                >
                  返回罐子视图
                </button>
              </div>

              <div className="mb-3 flex flex-col gap-2 md:flex-row">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="筛选：domain / cookie 名 / 类别"
                  className="h-10 flex-1 rounded-xl border border-[#ddcfba] bg-white px-3 text-sm"
                />
                <select
                  value={preset}
                  onChange={(event) => setPreset(event.target.value as CleanupPresetId | "all")}
                  className="h-10 rounded-xl border border-[#ddcfba] bg-white px-3 text-sm"
                >
                  <option value="all">全部分组</option>
                  {presetFilters.map((filter) => (
                    <option key={filter.id} value={filter.id}>
                      {filter.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    extensionStatus.refresh();
                    inventory.refresh();
                  }}
                  className="h-10 rounded-xl border border-[#ddcfba] bg-white px-3 text-sm"
                >
                  刷新
                </button>
              </div>

              {inventory.isLoading && !extensionStatus.isUsingMockData && (
                <div className="flex items-center gap-2 p-3 text-sm text-[#6f6453]">
                  <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" /> 正在读取本地 Cookie 清单...
                </div>
              )}

              {inventory.error && !extensionStatus.isUsingMockData && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  {inventory.error}
                </div>
              )}

              <div className="max-h-[62vh] space-y-3 overflow-auto pr-1">
                {filteredGroups.map((group) => (
                  <article key={group.domain} className="rounded-2xl border border-[#ecdcc9] bg-[#fffdf9]">
                    <button
                      onClick={() => setExpandedDomain((current) => (current === group.domain ? null : group.domain))}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <div>
                        <p className="font-semibold">{group.domain}</p>
                        <p className="text-xs text-[#6f6453]">
                          {group.total} 个 Cookie · 高风险 {group.highRiskCount} · 建议保留 {group.recommendedKeepCount}
                        </p>
                      </div>
                      <Icon
                        icon={expandedDomain === group.domain ? "mdi:chevron-up" : "mdi:chevron-down"}
                        className="h-5 w-5 text-[#6f6453]"
                      />
                    </button>

                    {expandedDomain === group.domain && (
                      <div className="space-y-2 border-t border-[#f1e5d6] px-3 py-3">
                        {group.items.map((cookie) => (
                          <label
                            key={cookie.key}
                            className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#f1e5d6] bg-white p-3"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(selected[cookie.key])}
                              onChange={() => toggleCookie(cookie.key)}
                              className="mt-1"
                            />
                            <div className="min-w-0 flex-1 text-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                <strong>{cookie.name}</strong>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{cookie.category}</span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs ${
                                    cookie.risk === "high"
                                      ? "bg-rose-100 text-rose-700"
                                      : cookie.risk === "medium"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {cookie.risk}
                                </span>
                                {cookie.recommendedKeep && (
                                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                    保护标签（建议保留）
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-[#6f6453]">Path: {cookie.path} · 过期时间：{formatExpiry(cookie.expirationDate)}</p>
                              {cookie.reasons.length > 0 && (
                                <p className="mt-1 text-xs text-[#8a7b66]">判定依据：{cookie.reasons.join("；")}</p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </article>
                ))}

                {filteredGroups.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#ddcfba] p-6 text-center text-sm text-[#6f6453]">
                    当前筛选条件下没有匹配项。
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-[#eadfce] bg-white p-4">
                <div className="flex items-center justify-between text-sm">
                  <span>已选中</span>
                  <strong>{selectedCount}</strong>
                </div>
                <button
                  onClick={requestFeed}
                  disabled={!canRequestFeed}
                  className="mt-3 w-full rounded-xl bg-[#1d6ed8] px-3 py-2 text-sm font-semibold text-white enabled:hover:bg-[#185db7] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  生成本地清理建议（需插件确认）
                </button>
                <p className="mt-2 text-xs text-[#6f6453]">删除动作不会由网站直接执行，必须在插件页进行二次确认。</p>
              </div>
            </section>
          )}

          <aside
            className={`rounded-3xl border border-[#d9ccb8] bg-white/80 p-4 transition-all ${
              isJarOpened ? "md:col-span-1" : "md:col-span-1"
            }`}
          >
            <div className={`mx-auto text-center ${isJarOpened ? "max-w-[180px]" : "max-w-[320px]"}`}>
              <div className={`mx-auto rounded-3xl border border-[#dbc8ad] bg-white/80 ${isJarOpened ? "h-32 w-32 text-6xl leading-[8rem]" : "h-56 w-56 text-8xl leading-[14rem]"}`}>
                👾
              </div>
              <h3 className="mt-3 font-semibold">Cookie 小怪物（占位）</h3>
              <p className="mt-1 text-xs text-[#6f6453]">罐子打开后怪物会缩小，给列表让位。</p>
            </div>
          </aside>
        </section>

        <section className="mt-6 rounded-3xl border border-[#cde4d2] bg-[#eefaf0] p-4 text-sm text-[#2e6240]">
          <strong>隐私保证：</strong>
          Cookie 值、用户态会话信息仅在你的本地浏览器插件中读取和处理；当前页面只消费插件桥接提供的脱敏元数据，并且删除必须由插件内确认。
        </section>
      </main>
    </div>
  );
}
