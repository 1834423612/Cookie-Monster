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
            <section className="flex min-h-0 flex-col p-4">
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

              <div className="min-h-0 flex-1 overflow-auto pr-1">
                <table className="w-full border-separate border-spacing-y-1 text-sm">
                  <thead className="sticky top-0 z-10 bg-[#f6ecd8]">
                    <tr className="border-b border-[#ddcfba] text-left text-xs font-semibold text-[#6f6453]">
                      <th className="py-2 pl-2 pr-3">Domain / Cookie</th>
                      <th className="py-2 px-3">Risk</th>
                      <th className="py-2 px-3">Expiry</th>
                      <th className="py-2 px-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.map((group) => (
                      <>
                        <tr
                          key={group.domain}
                          onClick={() => setExpandedDomain((current) => (current === group.domain ? null : group.domain))}
                          className="cursor-pointer transition-colors hover:bg-[#cabb9a] [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl"
                        >
                          <td className="py-2.5 pl-2 pr-3">
                            <p className="font-semibold">{group.domain}</p>
                            <p className="text-xs text-[#6f6453]">{group.total} cookies · High risk {group.highRiskCount}</p>
                          </td>
                          <td className="py-2.5 px-3">
                            {group.highRiskCount > 0 ? (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">high</span>
                            ) : group.items.filter((c) => c.risk === "medium").length > group.total / 2 ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">medium</span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">low</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-[#6f6453]">—</td>
                          <td className="py-2.5 px-3">
                            <Icon icon={expandedDomain === group.domain ? "mdi:chevron-up" : "mdi:chevron-down"} className="h-4 w-4 text-[#6f6453]" />
                          </td>
                        </tr>
                        {expandedDomain === group.domain &&
                          group.items.map((cookie) => (
                            <tr
                              key={cookie.key}
                              onClick={() => toggleCookie(cookie.key)}
                              className={`cursor-pointer transition-colors hover:bg-[#cabb9a] [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl ${selected[cookie.key] ? "bg-[#e2d4be]" : ""}`}
                            >
                              <td className="py-2 pl-8 pr-3">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={cookie.risk === "high" ? "/c4.png" : cookie.risk === "medium" ? "/c3.png" : "/c2.png"}
                                    alt=""
                                    className="h-5 w-5 flex-shrink-0"
                                  />
                                  <span>
                                    <strong>{cookie.name}</strong>
                                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{cookie.category}</span>
                                    {cookie.recommendedKeep && (
                                      <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">keep</span>
                                    )}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <span className={`rounded-full px-2 py-0.5 text-xs ${cookie.risk === "high" ? "bg-rose-100 text-rose-700" : cookie.risk === "medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                                  {cookie.risk}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-xs text-[#6f6453]">{formatExpiry(cookie.expirationDate)}</td>
                              <td></td>
                            </tr>
                          ))}
                      </>
                    ))}
                  </tbody>
                </table>

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
