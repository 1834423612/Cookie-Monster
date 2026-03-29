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

function getRelativeTime(expirationDate: number | null) {
  if (!expirationDate) return "Session";

  const now = Date.now() / 1000;
  const diff = expirationDate - now;

  if (diff < 0) return "Expired";
  if (diff < 86400) return "Today";
  if (diff < 86400 * 2) return "Tomorrow";
  if (diff < 86400 * 7) return "This week";
  return "Long-lived";
}

function getStatusBadge(risk: string, recommendedKeep: boolean) {
  if (recommendedKeep) {
    return {
      label: "SAFE",
      className: "border-[#bfdfca] bg-[#edf8f0] text-[#2d7a52]",
    };
  }

  if (risk === "high") {
    return {
      label: "HIGH RISK",
      className: "border-[#f1beb7] bg-[#fdeceb] text-[#c44b3c]",
    };
  }

  if (risk === "medium") {
    return {
      label: "WATCH",
      className: "border-[#e3d8c9] bg-[#f8f3eb] text-[#8f7c66]",
    };
  }

  return {
    label: "NORMAL",
    className: "border-[#e2d6c3] bg-white text-[#6f6453]",
  };
}

function getCookieArt(risk: "high" | "medium" | "low") {
  if (risk === "high") return "/c4.png";
  if (risk === "medium") return "/c3.png";
  return "/c2.png";
}

function getGroupRisk(group: CookieDomainGroup) {
  const mediumRiskCount = group.items.filter((item) => item.risk === "medium").length;

  if (group.highRiskCount > 0) {
    return "high";
  }

  if (mediumRiskCount > 0) {
    return "medium";
  }

  return "low";
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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,#f6ecd8,#efe6d7_45%,#ece7df)] text-[#2d261a]">
      <main className="mx-auto flex min-h-0 w-full max-w-auto flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
        <section className="grid min-h-0 flex-1 gap-4 md:grid-cols-[2fr_1fr]">
          {!isJarOpened ? (
            <button
              onClick={() => setIsJarOpened(true)}
              className="rounded-3xl border border-[#d7c7af] bg-[#fff8ea] p-8 text-center transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="mx-auto mb-3 flex h-44 w-44 items-center justify-center rounded-3xl border border-[#dbc8ad] bg-white shadow-inner">
                <Icon icon="mdi:cookie" className="h-24 w-24 text-[#c9823b]" />
              </div>
              <strong className="text-xl">Open cookie list</strong>
              <p className="mt-2 text-sm text-[#6f6453]">
                Placeholder art for jar and monster can be replaced with final assets.
              </p>
            </button>
          ) : (
            <section className="flex min-h-0 flex-col p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Domain cookie inventory (local)</h2>
              </div>

              <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter by domain, cookie name, or category"
                  className="h-10 rounded-xl border border-[#ddcfba] bg-white px-3 text-sm text-[#4f4537] outline-none transition focus:border-[#ccb693] focus:ring-2 focus:ring-[#e8ddcb]"
                />
                <select
                  value={preset}
                  onChange={(event) => setPreset(event.target.value as CleanupPresetId | "all")}
                  className="h-10 rounded-xl border border-[#ddcfba] bg-white px-3 text-sm text-[#4f4537]"
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
                  className="h-10 rounded-xl border border-[#ddcfba] bg-white px-3 text-sm text-[#5e5548] transition hover:bg-[#faf6f0]"
                >
                  Refresh
                </button>
              </div>

              {inventory.isLoading && !extensionStatus.isUsingMockData && (
                <div className="flex items-center gap-2 p-3 text-sm text-[#6f6453]">
                  <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" /> Loading local cookie inventory...
                </div>
              )}

              {inventory.error && !extensionStatus.isUsingMockData && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  {inventory.error}
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-auto rounded-[1.35rem] border border-[#e3d7c5] bg-white/60 pr-1">
                <div className="sticky top-0 z-10 hidden grid-cols-[minmax(0,1.7fr)_82px_110px_72px_126px] gap-2 border-b border-[#e7dccd] bg-[#f5ede1]/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b66] backdrop-blur md:grid">
                  <span>Name</span>
                  <span>Cookies</span>
                  <span>Expiry</span>
                  <span>Priority</span>
                  <span>Status</span>
                </div>

                <div>
                  {filteredGroups.map((group) => {
                    const groupRisk = getGroupRisk(group);
                    const groupStatus = getStatusBadge(groupRisk, false);

                    return (
                      <div key={group.domain} className="border-b border-[#eee4d6] last:border-b-0">
                        <button
                          onClick={() => setExpandedDomain((current) => (current === group.domain ? null : group.domain))}
                          className="grid w-full grid-cols-1 items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-[#f7f0e5] md:grid-cols-[minmax(0,1.7fr)_82px_110px_72px_126px]"
                        >
                          <div className="flex items-center gap-3">
                            <Icon
                              icon={expandedDomain === group.domain ? "mdi:chevron-down" : "mdi:chevron-right"}
                              className="h-4 w-4 shrink-0 text-[#8a7b66]"
                            />
                            <img
                              src={getCookieArt(groupRisk)}
                              alt=""
                              className="h-7 w-7 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#342c22]">{group.domain}</p>
                              <p className="mt-0.5 text-xs text-[#8a7b66]">
                                {group.total} cookies / {group.highRiskCount} high risk
                              </p>
                            </div>
                          </div>

                          <span className="hidden text-sm text-[#5e5548] md:block">{group.total}</span>
                          <span className="hidden text-xs text-[#8a7b66] md:block">--</span>
                          <span className="hidden md:block">
                            {groupRisk === "high" ? (
                              <Icon icon="mdi:flag" className="h-4 w-4 text-[#d74d42]" />
                            ) : groupRisk === "medium" ? (
                              <Icon icon="mdi:flag-outline" className="h-4 w-4 text-[#b29a79]" />
                            ) : (
                              <span className="text-xs text-[#c3b39b]">--</span>
                            )}
                          </span>
                          <span
                            className={`hidden items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] md:inline-flex ${groupStatus.className}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                            {groupStatus.label}
                          </span>
                        </button>

                        {expandedDomain === group.domain && (
                          <div className="bg-[#fbf7f1]/85">
                            {group.items.map((cookie) => {
                              const status = getStatusBadge(cookie.risk, cookie.recommendedKeep);
                              const expiry = getRelativeTime(cookie.expirationDate);
                              const isUrgent =
                                expiry === "Expired" || expiry === "Today" || expiry === "Tomorrow";

                              return (
                                <label
                                  key={cookie.key}
                                  className={`grid cursor-pointer grid-cols-1 items-center gap-2 border-t border-[#eee4d6] px-4 py-2.5 transition-colors hover:bg-[#f6efe5] md:grid-cols-[minmax(0,1.7fr)_82px_110px_72px_126px] ${
                                    selected[cookie.key] ? "bg-[#efe2cf]" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-3 pl-6">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(selected[cookie.key])}
                                      onChange={() => toggleCookie(cookie.key)}
                                      className="h-4 w-4 rounded border-[#cdbda3] text-[#1d6ed8] focus:ring-[#1d6ed8]"
                                    />
                                    <img
                                      src={getCookieArt(cookie.risk)}
                                      alt=""
                                      className="h-5 w-5 shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="truncate text-sm font-medium text-[#342c22]">
                                          {cookie.name}
                                        </span>
                                        <span className="rounded-md bg-[#f3ede4] px-1.5 py-0.5 text-[11px] text-[#7d6e59]">
                                          {cookie.category}
                                        </span>
                                        {cookie.recommendedKeep && (
                                          <span className="rounded-md bg-[#e8f2ff] px-1.5 py-0.5 text-[11px] font-medium text-[#3569b8]">
                                            keep
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <span className="hidden text-xs text-[#6f6453] md:block">1</span>
                                  <span
                                    className={`hidden text-xs md:block ${
                                      isUrgent ? "font-semibold text-[#c44b3c]" : "text-[#8a7b66]"
                                    }`}
                                  >
                                    {expiry}
                                  </span>
                                  <span className="hidden md:block">
                                    {cookie.risk === "high" ? (
                                      <Icon icon="mdi:flag" className="h-4 w-4 text-[#d74d42]" />
                                    ) : cookie.risk === "medium" ? (
                                      <span className="inline-flex h-2 w-2 rounded-full bg-[#cdbca1]" />
                                    ) : (
                                      <span className="text-xs text-[#c3b39b]">--</span>
                                    )}
                                  </span>
                                  <span
                                    className={`hidden items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] md:inline-flex ${status.className}`}
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                                    {status.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {filteredGroups.length === 0 && (
                  <div className="m-4 rounded-2xl border border-dashed border-[#ddcfba] p-6 text-center text-sm text-[#6f6453]">
                    No cookies match the current filters.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-[#eadfce] bg-white p-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Selected cookies</span>
                  <strong>{selectedCount}</strong>
                </div>
                {message && <p className="mt-2 text-xs text-[#7b6d5a]">{message}</p>}
                <button
                  onClick={requestFeed}
                  disabled={!canRequestFeed}
                  className="mt-3 w-full rounded-xl bg-[#1d6ed8] px-3 py-2 text-sm font-semibold text-white enabled:hover:bg-[#185db7] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Create local cleanup request (extension confirmation required)
                </button>
              </div>
            </section>
          )}

          <aside className="min-h-0 overflow-hidden">
            <video
              src="/cm_idle.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-contain"
            />
          </aside>
        </section>
      </main>
    </div>
  );
}
