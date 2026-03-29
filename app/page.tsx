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
  { id: "balanced", label: "Recommended" },
  { id: "trackers", label: "Trackers" },
  { id: "highRisk", label: "High risk" },
  { id: "expired", label: "Expired" },
  { id: "longLived", label: "Long-lived" },
];

function formatExpiry(expirationDate: number | null) {
  if (!expirationDate) {
    return "Session cookie";
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
        reasons: ["Mock sample used for local-safe demo mode"],
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
      setMessage("Real cleanup requests are disabled while mock mode is active.");
      return;
    }

    const targetPreset: CleanupPresetId = selectedPresetHint || (preset === "all" ? "balanced" : preset);
    const pending = await requestCookieFeed({ presetId: targetPreset });

    if (pending) {
      setMessage(`Pending local cleanup request created: ${pending.label} (${pending.cookieCount} cookies).`);
      return;
    }

    setMessage("No removable cookies matched this preset. Run a new extension scan first.");
  };

  // Get status badge based on risk level
  const getStatusBadge = (risk: string, recommendedKeep: boolean) => {
    if (recommendedKeep) {
      return { label: "SAFE", bg: "bg-emerald-500", text: "text-white" };
    }
    if (risk === "high") {
      return { label: "ALERT", bg: "bg-red-500", text: "text-white" };
    }
    if (risk === "medium") {
      return { label: "REVIEW", bg: "bg-amber-500", text: "text-white" };
    }
    return { label: "OK", bg: "bg-slate-100", text: "text-slate-600" };
  };

  // Format relative time
  const getRelativeTime = (expirationDate: number | null) => {
    if (!expirationDate) return "Session";
    const now = Date.now() / 1000;
    const diff = expirationDate - now;
    if (diff < 0) return "Expired";
    if (diff < 86400) return "Today";
    if (diff < 86400 * 2) return "Tomorrow";
    if (diff < 86400 * 7) return "This week";
    return "Long-lived";
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-sky-50 via-indigo-50/40 to-cyan-50/50 text-slate-800">
      <main className="mx-auto flex min-h-0 w-full max-w-auto flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
        <section className="grid min-h-0 flex-1 gap-4 md:grid-cols-[2fr_1fr]">
          {!isJarOpened ? (
            <button
              onClick={() => setIsJarOpened(true)}
              className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-sm p-8 text-center transition hover:-translate-y-0.5 hover:shadow-xl shadow-lg shadow-indigo-100/50"
            >
              <div className="mx-auto mb-3 h-44 w-44 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-sky-50 text-8xl leading-44 shadow-inner flex items-center justify-center">
                <Icon icon="mdi:cookie" className="w-24 h-24 text-indigo-500" />
              </div>
              <strong className="text-xl text-slate-800">Open cookie list</strong>
              <p className="mt-2 text-sm text-slate-500">Placeholder art for jar and monster can be replaced with final assets.</p>
            </button>
          ) : (
            <section className="flex min-h-0 flex-col rounded-2xl border border-white/60 bg-white/90 backdrop-blur-sm p-4 shadow-lg shadow-indigo-100/50">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-800">Domain cookie inventory (local)</h2>
              </div>

              <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter by domain, cookie name, or category"
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                />
                <select
                  value={preset}
                  onChange={(event) => setPreset(event.target.value as CleanupPresetId | "all")}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                >
                  <option value="all">All groups</option>
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
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Refresh
                </button>
              </div>

              {inventory.isLoading && !extensionStatus.isUsingMockData && (
                <div className="flex items-center gap-2 p-3 text-sm text-slate-500">
                  <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" /> Loading local cookie inventory...
                </div>
              )}

              {inventory.error && !extensionStatus.isUsingMockData && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {inventory.error}
                </div>
              )}

              {/* ClickUp-style Table Header */}
              <div className="hidden md:grid grid-cols-[minmax(0,1fr)_100px_100px_80px_90px] gap-2 px-4 py-2 text-xs font-medium text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <span>Name</span>
                <span>Cookies</span>
                <span>Expiry</span>
                <span>Priority</span>
                <span>Status</span>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                {filteredGroups.map((group) => (
                  <div key={group.domain} className="border-b border-slate-100 last:border-b-0">
                    {/* Domain Row - ClickUp style */}
                    <button
                      onClick={() => setExpandedDomain((current) => (current === group.domain ? null : group.domain))}
                      className="w-full grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_100px_100px_80px_90px] gap-2 items-center px-4 py-3 text-left hover:bg-indigo-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon 
                          icon={expandedDomain === group.domain ? "mdi:chevron-down" : "mdi:chevron-right"} 
                          className="h-4 w-4 text-slate-400 flex-shrink-0" 
                        />
                        {/* Cookie icon placeholder */}
                        <img 
                          src={`https://placehold.co/32x32/6366f1/white?text=C`}
                          alt="cookie"
                          className="w-6 h-6 rounded-full flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{group.domain}</p>
                        </div>
                        {group.highRiskCount > 0 && (
                          <span className="text-xs text-slate-400">{group.total} items</span>
                        )}
                      </div>
                      <span className="text-sm text-slate-600 hidden md:block">{group.total}</span>
                      <span className="text-sm text-slate-500 hidden md:block">-</span>
                      <span className="hidden md:block">
                        {group.highRiskCount > 0 && (
                          <Icon icon="mdi:flag" className="w-4 h-4 text-red-500" />
                        )}
                      </span>
                      <span className="hidden md:block">
                        {group.highRiskCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-500 text-white">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            ALERT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            OK
                          </span>
                        )}
                      </span>
                    </button>

                    {/* Expanded Cookie Items - ClickUp nested style */}
                    {expandedDomain === group.domain && (
                      <div className="bg-slate-50/50">
                        {group.items.map((cookie) => {
                          const status = getStatusBadge(cookie.risk, cookie.recommendedKeep);
                          const expiry = getRelativeTime(cookie.expirationDate);
                          const isExpiringSoon = expiry === "Today" || expiry === "Tomorrow" || expiry === "Expired";
                          
                          return (
                            <label 
                              key={cookie.key} 
                              className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_100px_100px_80px_90px] gap-2 items-center px-4 py-2.5 cursor-pointer hover:bg-indigo-50/70 transition-colors border-t border-slate-100"
                            >
                              <div className="flex items-center gap-3 pl-7">
                                <input 
                                  type="checkbox" 
                                  checked={Boolean(selected[cookie.key])} 
                                  onChange={() => toggleCookie(cookie.key)} 
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500 flex-shrink-0" 
                                />
                                {/* Cookie icon based on risk */}
                                <img 
                                  src={`https://placehold.co/28x28/${cookie.risk === 'high' ? 'ef4444' : cookie.risk === 'medium' ? 'f59e0b' : '10b981'}/white?text=C`}
                                  alt="cookie"
                                  className="w-5 h-5 rounded-full flex-shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-700 text-sm truncate">{cookie.name}</span>
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{cookie.category}</span>
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs text-slate-500 hidden md:block">1</span>
                              <span className={`text-xs hidden md:block ${isExpiringSoon ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                                {expiry}
                              </span>
                              <span className="hidden md:block">
                                {cookie.risk === 'high' && <Icon icon="mdi:flag" className="w-4 h-4 text-red-500" />}
                                {cookie.risk === 'medium' && <Icon icon="mdi:flag-outline" className="w-4 h-4 text-amber-500" />}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.text} hidden md:inline-flex`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                                {status.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {filteredGroups.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 m-4">
                    No cookies match the current filters.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span>Selected cookies</span>
                  <strong>{selectedCount}</strong>
                </div>
                <button
                  onClick={requestFeed}
                  disabled={!canRequestFeed}
                  className="mt-3 w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-2.5 text-sm font-semibold text-white enabled:hover:from-indigo-600 enabled:hover:to-purple-600 transition-all shadow-md shadow-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
                >
                  Create local cleanup request (extension confirmation required)
                </button>
              </div>
            </section>
          )}

          <aside className="px-5 min-h-0 overflow-hidden">
            <img
              src="/cookiemonster_tp.png"
              alt="Cookie Monster"
              className="h-full w-full object-contain"
            />
          </aside>
        </section>
      </main>
    </div>
  );
}
