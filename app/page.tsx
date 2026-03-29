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
      className: "border-[#c8e2cf] bg-[#f7fcf8] text-[#2d7a52]",
      accentClass: "bg-[#41a36c]",
    };
  }

  if (risk === "high") {
    return {
      label: "HIGH RISK",
      className: "border-[#f0d2cd] bg-[#fff7f6] text-[#bb5448]",
      accentClass: "bg-[#d96c5d]",
    };
  }

  if (risk === "medium") {
    return {
      label: "WATCH",
      className: "border-[#e3d8c9] bg-[#fbf8f3] text-[#8f7c66]",
      accentClass: "bg-[#baa17f]",
    };
  }

  return {
    label: "NORMAL",
    className: "border-[#e5dccf] bg-white text-[#6f6453]",
    accentClass: "bg-[#c8b79e]",
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
                <div className="sticky top-0 z-10 hidden grid-cols-[minmax(0,1.7fr)_82px_110px_140px] gap-2 border-b border-[#e7dccd] bg-[#f5ede1]/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b66] backdrop-blur md:grid">
                  <span className="pl-[66px]">Domain</span>
                  <span>Cookies</span>
                  <span>Expiry</span>
                  <span>Status</span>
                </div>

                <div>
                  {filteredGroups.map((group) => {
                    const isExpanded = expandedDomain === group.domain;
                    const groupRisk = getGroupRisk(group);
                    const groupStatus = getStatusBadge(groupRisk, false);

                    return (
                      <div key={group.domain} className="border-b border-[#eee4d6] last:border-b-0">
                        <button
                          onClick={() => setExpandedDomain((current) => (current === group.domain ? null : group.domain))}
                          className={`grid w-full grid-cols-1 items-center gap-2 px-4 py-3 text-left transition-all md:grid-cols-[minmax(0,1.7fr)_82px_110px_140px] ${
                            isExpanded
                              ? "bg-[#f8efe3] shadow-[inset_3px_0_0_#d8b48a]"
                              : "hover:bg-[#f7f0e5]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon
                              icon={isExpanded ? "mdi:chevron-down" : "mdi:chevron-right"}
                              className="h-4 w-4 shrink-0 text-[#8a7b66]"
                            />
                            <img
                              src={getCookieArt(groupRisk)}
                              alt=""
                              className="h-7 w-7 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#342c22]">{group.domain}</p>
                              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[#8a7b66]">
                                <span className="rounded-full bg-white/80 px-2 py-0.5">{group.total} cookies</span>
                                {group.highRiskCount > 0 && (
                                  <span className="rounded-full bg-[#fff1ef] px-2 py-0.5 text-[#c44b3c]">
                                    {group.highRiskCount} high risk
                                  </span>
                                )}
                                {group.recommendedKeepCount > 0 && (
                                  <span className="rounded-full bg-[#edf8f0] px-2 py-0.5 text-[#2d7a52]">
                                    {group.recommendedKeepCount} protected
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span className="hidden text-center text-sm text-[#5e5548] md:block">{group.total}</span>
                          <span className="hidden text-center text-xs text-[#8a7b66] md:block">--</span>
                          <span
                            className={`hidden items-center gap-2 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] md:inline-flex ${groupStatus.className}`}
                          >
                            <span className={`h-4 w-1 rounded-full ${groupStatus.accentClass}`} />
                            {groupStatus.label}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="ml-9 border-l border-[#eadfce] bg-[#fbf7f1]/85">
                            {group.items.map((cookie) => {
                              const status = getStatusBadge(cookie.risk, cookie.recommendedKeep);
                              const expiry = getRelativeTime(cookie.expirationDate);
                              const isUrgent =
                                expiry === "Expired" || expiry === "Today" || expiry === "Tomorrow";
                              const isSelected = Boolean(selected[cookie.key]);

                              return (
                                <div
                                  key={cookie.key}
                                  onClick={() => toggleCookie(cookie.key)}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      toggleCookie(cookie.key);
                                    }
                                  }}
                                  className={`grid cursor-pointer grid-cols-1 items-center gap-2 border-t border-[#eee4d6] px-4 py-2 transition-colors hover:bg-[#f6efe5] md:grid-cols-[minmax(0,1.7fr)_82px_110px_140px] ${
                                    isSelected ? "bg-[#efe2cf]" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-3 pl-5">
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        toggleCookie(cookie.key);
                                      }}
                                      className={`flex h-5 w-5 items-center justify-center rounded transition ${
                                        isSelected ? "text-[#d74d42]" : "text-[#ccbca4] hover:text-[#a69377]"
                                      }`}
                                      aria-pressed={isSelected}
                                      aria-label={isSelected ? `Unselect ${cookie.name}` : `Select ${cookie.name}`}
                                    >
                                      <Icon
                                        icon={isSelected ? "mdi:flag" : "mdi:flag-outline"}
                                        className="h-4 w-4"
                                      />
                                    </button>
                                    <img
                                      src={getCookieArt(cookie.risk)}
                                      alt=""
                                      className="h-5 w-5 shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="truncate text-[13px] font-medium text-[#342c22]">
                                          {cookie.name}
                                        </span>
                                      </div>
                                      <p className="mt-0.5 truncate text-[10px] text-[#8a7b66]">
                                        {cookie.category}
                                        {cookie.recommendedKeep ? " / keep" : ""}
                                        {cookie.sameSite ? ` / ${cookie.sameSite}` : ""}
                                      </p>
                                    </div>
                                  </div>

                                  <span className="hidden text-center text-xs text-[#6f6453] md:block">1</span>
                                  <span
                                    title={formatExpiry(cookie.expirationDate)}
                                    className={`hidden text-center text-xs md:block ${
                                      isUrgent ? "font-semibold text-[#c44b3c]" : "text-[#8a7b66]"
                                    }`}
                                  >
                                    {expiry}
                                  </span>
                                  <span
                                    className={`hidden items-center gap-2 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] md:inline-flex ${status.className}`}
                                  >
                                    <span className={`h-4 w-1 rounded-full ${status.accentClass}`} />
                                    {status.label}
                                  </span>
                                </div>
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

              <div className="mt-4 rounded-[1.25rem] border border-[#eadfce] bg-white/90 p-4 shadow-[0_8px_24px_rgba(88,62,31,0.06)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-[#6f6453]">Selected cookies</span>
                      <span className="rounded-full bg-[#f3ede4] px-2.5 py-1 text-xs font-semibold text-[#3b3329]">
                        {selectedCount}
                      </span>
                      {selectedPresetHint && (
                        <span className="rounded-full bg-[#e8f2ff] px-2.5 py-1 text-xs font-medium text-[#3569b8]">
                          {selectedPresetHint}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[#8a7b66]">
                      Click a flag or any cookie row to select items for the next cleanup request.
                    </p>
                    {message && <p className="mt-2 text-xs text-[#7b6d5a]">{message}</p>}
                  </div>

                  <div className="flex flex-col gap-2 md:min-w-[260px]">
                    <button
                      onClick={requestFeed}
                      disabled={!canRequestFeed}
                      className="w-full rounded-xl bg-[#1d6ed8] px-3 py-2.5 text-sm font-semibold text-white enabled:hover:bg-[#185db7] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {selectedCount > 0 ? "Create local cleanup request" : "Create request from current filter"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelected({})}
                      disabled={selectedCount === 0}
                      className="w-full rounded-xl border border-[#ddcfba] bg-[#faf6f0] px-3 py-2 text-xs font-medium text-[#6f6453] transition hover:bg-[#f4eddf] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear selection
                    </button>
                  </div>
                </div>
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
