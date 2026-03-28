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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_#f6ecd8,_#efe6d7_45%,_#ece7df)] text-[#2d261a]">
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
        <section className="grid min-h-0 flex-1 gap-4 md:grid-cols-[2fr_1fr]">
          {!isJarOpened ? (
            <button
              onClick={() => setIsJarOpened(true)}
              className="rounded-3xl border border-[#d7c7af] bg-[#fff8ea] p-8 text-center transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="mx-auto mb-3 h-44 w-44 rounded-3xl border border-[#dbc8ad] bg-white text-8xl leading-[11rem] shadow-inner">🫙</div>
              <strong className="text-xl">Open cookie list</strong>
              <p className="mt-2 text-sm text-[#6f6453]">Placeholder art for jar and monster can be replaced with final assets.</p>
            </button>
          ) : (
            <section className="flex min-h-0 flex-col rounded-3xl border border-[#d7c7af] bg-white/95 p-4 shadow-[0_14px_36px_rgba(70,54,26,0.08)]">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Domain cookie inventory (local)</h2>
              </div>

              <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter by domain, cookie name, or category"
                  className="h-10 rounded-xl border border-[#ddcfba] bg-white px-3 text-sm"
                />
                <select
                  value={preset}
                  onChange={(event) => setPreset(event.target.value as CleanupPresetId | "all")}
                  className="h-10 rounded-xl border border-[#ddcfba] bg-white px-3 text-sm"
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
                  className="h-10 rounded-xl border border-[#ddcfba] bg-white px-3 text-sm hover:bg-[#faf6f0]"
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

              <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
                {filteredGroups.map((group) => (
                  <article key={group.domain} className="rounded-2xl border border-[#ecdcc9] bg-[#fffdf9]">
                    <button
                      onClick={() => setExpandedDomain((current) => (current === group.domain ? null : group.domain))}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <div>
                        <p className="font-semibold">{group.domain}</p>
                        <p className="text-xs text-[#6f6453]">
                          {group.total} cookies · High risk {group.highRiskCount} · Protected {group.recommendedKeepCount}
                        </p>
                      </div>
                      <Icon icon={expandedDomain === group.domain ? "mdi:chevron-up" : "mdi:chevron-down"} className="h-5 w-5 text-[#6f6453]" />
                    </button>

                    {expandedDomain === group.domain && (
                      <div className="space-y-2 border-t border-[#f1e5d6] px-3 py-3">
                        {group.items.map((cookie) => (
                          <label key={cookie.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#f1e5d6] bg-white p-3">
                            <input type="checkbox" checked={Boolean(selected[cookie.key])} onChange={() => toggleCookie(cookie.key)} className="mt-1" />
                            <div className="min-w-0 flex-1 text-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                <strong>{cookie.name}</strong>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{cookie.category}</span>
                                <span className={`rounded-full px-2 py-0.5 text-xs ${cookie.risk === "high" ? "bg-rose-100 text-rose-700" : cookie.risk === "medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                                  {cookie.risk}
                                </span>
                                {cookie.recommendedKeep && (
                                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Protected (recommended keep)</span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-[#6f6453]">Path: {cookie.path} · Expiry: {formatExpiry(cookie.expirationDate)}</p>
                              {cookie.reasons.length > 0 && (
                                <p className="mt-1 text-xs text-[#8a7b66]">Signals: {cookie.reasons.join("; ")}</p>
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
                    No cookies match the current filters.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-[#eadfce] bg-white p-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Selected cookies</span>
                  <strong>{selectedCount}</strong>
                </div>
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
