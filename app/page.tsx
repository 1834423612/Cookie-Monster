"use client";

import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  requestCookieFeed,
  type CleanupPresetId,
  type CookieDomainGroup,
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
  const inventory = useCookieInventory(extensionStatus.isInstalled);

  const [isOpen, setIsOpen] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState<CleanupPresetId | "all">("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);

  const filteredGroups = useMemo(
    () => applyFilters(inventory.groups, query, preset),
    [inventory.groups, query, preset]
  );

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  const selectedPresetHint = useMemo(() => {
    const firstSelected = Object.entries(selected).find(([, checked]) => checked)?.[0];
    if (!firstSelected) {
      return null;
    }

    for (const group of filteredGroups) {
      const item = group.items.find((cookie) => cookie.key === firstSelected);
      if (item) {
        return item.presetIds[0] || null;
      }
    }

    return null;
  }, [filteredGroups, selected]);

  const toggleCookie = (key: string) => {
    setSelected((current) => ({ ...current, [key]: !current[key] }));
  };

  const requestFeed = async () => {
    const targetPreset: CleanupPresetId =
      selectedPresetHint || (preset === "all" ? "balanced" : preset);
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
        <div className="mb-6 rounded-3xl border border-[#d9ccb8] bg-white/80 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold">Cookie Monster 单页工作台</h1>
          <p className="mt-2 text-sm text-[#6f6453]">
            所有 Cookie 分析、分组与删除建议都在本地插件内完成。网站仅渲染本地桥接数据，不上传 Cookie 值。
          </p>
          {message && <p className="mt-3 text-sm text-[#1b6f3a]">{message}</p>}
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-[#d9ccb8] bg-white/70 p-5 md:col-span-1">
            <button
              onClick={() => setIsOpen((current) => !current)}
              className="group flex w-full flex-col items-center gap-3 rounded-2xl border border-[#d9ccb8] bg-[#fff7ea] p-5 transition hover:shadow-lg"
            >
              <div className={`text-6xl transition ${isOpen ? "scale-110 rotate-3" : ""}`}>🍯</div>
              <strong className="text-lg">点击饼干罐</strong>
              <span className="text-xs text-[#6f6453]">展开 / 收起 Cookie 清单</span>
            </button>

            <div className="mt-4 rounded-2xl border border-[#eadfce] bg-white p-4">
              <div className="flex items-center justify-between text-sm">
                <span>已选中</span>
                <strong>{selectedCount}</strong>
              </div>
              <button
                onClick={requestFeed}
                className="mt-3 w-full rounded-xl bg-[#1d6ed8] px-3 py-2 text-sm font-semibold text-white hover:bg-[#185db7]"
              >
                生成本地清理建议（需插件确认）
              </button>
              <p className="mt-2 text-xs text-[#6f6453]">
                删除动作不会由网站直接执行，必须在插件页进行二次确认。
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#d9ccb8] bg-white/90 p-4 md:col-span-2">
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

            {!extensionStatus.isInstalled && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                当前未检测到插件，请先安装并运行扫描。
              </div>
            )}

            {inventory.isLoading && (
              <div className="flex items-center gap-2 p-4 text-sm text-[#6f6453]">
                <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" /> 正在读取本地 Cookie 清单...
              </div>
            )}

            {inventory.error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {inventory.error}
              </div>
            )}

            {isOpen && (
              <div className="mt-3 max-h-[60vh] space-y-3 overflow-auto pr-1">
                {filteredGroups.map((group) => (
                  <article key={group.domain} className="rounded-2xl border border-[#ecdcc9] bg-[#fffdf9]">
                    <button
                      onClick={() =>
                        setExpandedDomain((current) =>
                          current === group.domain ? null : group.domain
                        )
                      }
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
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                                  {cookie.category}
                                </span>
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
                              <p className="mt-1 text-xs text-[#6f6453]">
                                Path: {cookie.path} · 过期时间：{formatExpiry(cookie.expirationDate)}
                              </p>
                              {cookie.reasons.length > 0 && (
                                <p className="mt-1 text-xs text-[#8a7b66]">
                                  判定依据：{cookie.reasons.join("；")}
                                </p>
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
            )}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-[#cde4d2] bg-[#eefaf0] p-4 text-sm text-[#2e6240]">
          <strong>隐私保证：</strong>
          Cookie 值、用户态会话信息仅在你的本地浏览器插件中读取和处理；当前页面只消费插件桥接提供的脱敏元数据，并且删除必须由插件内确认。
        </section>
      </main>
    </div>
  );
}
