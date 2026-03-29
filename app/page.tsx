"use client";

import {
  memo,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Icon } from "@iconify/react";
import {
  requestCookieFeed,
  type CleanupPresetId,
  type CookieDomainGroup,
  type CookieInventoryItem,
  type CookieSummaryReport,
} from "@/lib/extension-bridge";
import { useExtensionStatus } from "@/hooks/use-extension-status";
import { useCookieInventory } from "@/hooks/use-cookie-inventory";

const EMPTY_SELECTION: Record<string, true> = {};

const presetFilters: Array<{ id: CleanupPresetId; label: string }> = [
  { id: "balanced", label: "Recommended" },
  { id: "trackers", label: "Trackers" },
  { id: "highRisk", label: "High risk" },
  { id: "expired", label: "Expired" },
  { id: "longLived", label: "Long-lived" },
];

const filterScopeOptions = [
  { id: "cleanup", label: "Cleanup ready" },
  { id: "high", label: "High risk" },
  { id: "watch", label: "Watch" },
  { id: "keep", label: "Keep" },
  { id: "selected", label: "Selected" },
  { id: "all", label: "All cookies" },
] as const;

type FilterScope = (typeof filterScopeOptions)[number]["id"];

interface FilteredDomainGroup extends CookieDomainGroup {
  cleanupCandidateCount: number;
}

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
      label: "KEEP",
      className: "border-[#cce3cf] bg-[#f7fcf8] text-[#2f7a4d]",
      accentClass: "bg-[#4ca46b]",
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
      className: "border-[#eadcb1] bg-[#fffaf0] text-[#a07a1f]",
      accentClass: "bg-[#e0bf58]",
    };
  }

  return {
    label: "NORMAL",
    className: "border-[#cce3cf] bg-[#f7fcf8] text-[#2f7a4d]",
    accentClass: "bg-[#4ca46b]",
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

function isCleanupCandidate(cookie: CookieInventoryItem) {
  return cookie.presetIds.length > 0;
}

function getCookieGuidance(cookie: CookieInventoryItem) {
  if (cookie.recommendedKeep) {
    return "keep on site";
  }

  if (cookie.risk === "high") {
    return "clear first";
  }

  if (cookie.risk === "medium") {
    return "review";
  }

  return "low impact";
}

function getSameSiteLabel(sameSite: string) {
  if (sameSite === "no_restriction") return "sameSite none";
  if (sameSite === "strict") return "sameSite strict";
  if (sameSite === "lax") return "sameSite lax";
  if (sameSite === "unspecified") return "sameSite unset";
  return sameSite;
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

function applyFilters(
  groups: CookieDomainGroup[],
  query: string,
  activePreset: CleanupPresetId | "all",
  scope: FilterScope,
  selectedLookup: Record<string, true>
) {
  const lowerQuery = query.trim().toLowerCase();
  const filteredGroups: FilteredDomainGroup[] = [];

  for (const group of groups) {
    const items: CookieInventoryItem[] = [];
    let highRiskCount = 0;
    let recommendedKeepCount = 0;
    let cleanupCandidateCount = 0;

    for (const item of group.items) {
      const queryHit =
        !lowerQuery ||
        item.name.toLowerCase().includes(lowerQuery) ||
        item.domain.toLowerCase().includes(lowerQuery) ||
        item.category.toLowerCase().includes(lowerQuery) ||
        item.reasons.some((reason) => reason.toLowerCase().includes(lowerQuery));

      if (!queryHit) {
        continue;
      }

      if (activePreset !== "all" && !item.presetIds.includes(activePreset)) {
        continue;
      }

      if (scope === "cleanup" && !isCleanupCandidate(item)) {
        continue;
      }

      if (scope === "high" && item.risk !== "high") {
        continue;
      }

      if (scope === "watch" && item.risk !== "medium") {
        continue;
      }

      if (scope === "keep" && !item.recommendedKeep) {
        continue;
      }

      if (scope === "selected" && !selectedLookup[item.key]) {
        continue;
      }

      items.push(item);

      if (item.risk === "high") {
        highRiskCount += 1;
      }

      if (item.recommendedKeep) {
        recommendedKeepCount += 1;
      }

      if (isCleanupCandidate(item)) {
        cleanupCandidateCount += 1;
      }
    }

    if (!items.length) {
      continue;
    }

    filteredGroups.push({
      domain: group.domain,
      total: items.length,
      highRiskCount,
      recommendedKeepCount,
      cleanupCandidateCount,
      items,
    });
  }

  return filteredGroups.sort((left, right) => right.total - left.total);
}

interface CookieRowProps {
  cookie: CookieInventoryItem;
  isSelected: boolean;
  onToggle: (key: string) => void;
}

const CookieRow = memo(function CookieRow({ cookie, isSelected, onToggle }: CookieRowProps) {
  const status = getStatusBadge(cookie.risk, cookie.recommendedKeep);
  const expiry = getRelativeTime(cookie.expirationDate);
  const isUrgent = expiry === "Expired" || expiry === "Today" || expiry === "Tomorrow";

  return (
    <div
      onClick={() => onToggle(cookie.key)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle(cookie.key);
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
            onToggle(cookie.key);
          }}
          className={`flex h-5 w-5 items-center justify-center rounded transition ${
            isSelected ? "text-[#d74d42]" : "text-[#ccbca4] hover:text-[#a69377]"
          }`}
          aria-pressed={isSelected}
          aria-label={isSelected ? `Unselect ${cookie.name}` : `Select ${cookie.name}`}
        >
          <Icon icon={isSelected ? "mdi:flag" : "mdi:flag-outline"} className="h-4 w-4" />
        </button>
        <img src={getCookieArt(cookie.risk)} alt="" className="h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-medium text-[#342c22]">{cookie.name}</span>
          </div>
          <p className="mt-0.5 truncate text-[10px] text-[#8a7b66]">
            {cookie.category} • {getSameSiteLabel(cookie.sameSite)} • {getCookieGuidance(cookie)}
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
});

interface DomainGroupRowProps {
  group: FilteredDomainGroup;
  isExpanded: boolean;
  onToggleExpanded: (domain: string) => void;
  onToggleCookie: (key: string) => void;
  selectedCount: number;
  selectedLookup: Record<string, true>;
}

const DomainGroupRow = memo(
  function DomainGroupRow({
    group,
    isExpanded,
    onToggleExpanded,
    onToggleCookie,
    selectedCount,
    selectedLookup,
  }: DomainGroupRowProps) {
    const groupRisk = getGroupRisk(group);
    const groupStatus = getStatusBadge(
      groupRisk,
      group.recommendedKeepCount > 0 && group.recommendedKeepCount === group.total
    );

    return (
      <div
        className="border-b border-[#eee4d6] last:border-b-0"
        style={{ contentVisibility: "auto", containIntrinsicSize: "76px" }}
      >
        <button
          onClick={() => onToggleExpanded(group.domain)}
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
            <img src={getCookieArt(groupRisk)} alt="" className="h-7 w-7 shrink-0" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-[#342c22]">{group.domain}</p>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[#8a7b66]">
                <span className="rounded-full bg-white/80 px-2 py-0.5">{group.total} visible</span>
                {group.cleanupCandidateCount > 0 && (
                  <span className="rounded-full bg-[#fff7ec] px-2 py-0.5 text-[#9b7120]">
                    {group.cleanupCandidateCount} cleanup ready
                  </span>
                )}
                {group.highRiskCount > 0 && (
                  <span className="rounded-full bg-[#fff1ef] px-2 py-0.5 text-[#c44b3c]">
                    {group.highRiskCount} clear first
                  </span>
                )}
                {group.recommendedKeepCount > 0 && (
                  <span className="rounded-full bg-[#edf8f0] px-2 py-0.5 text-[#2d7a52]">
                    {group.recommendedKeepCount} keep
                  </span>
                )}
                {selectedCount > 0 && (
                  <span className="rounded-full bg-[#e8f2ff] px-2 py-0.5 text-[#3569b8]">
                    {selectedCount} flagged
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

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div
              className="ml-9 border-l border-[#eadfce] bg-[#fbf7f1]/85"
              style={{ contentVisibility: "auto", containIntrinsicSize: "220px" }}
            >
              {group.items.map((cookie) => (
                <CookieRow
                  key={cookie.key}
                  cookie={cookie}
                  isSelected={Boolean(selectedLookup[cookie.key])}
                  onToggle={onToggleCookie}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  },
  (previous, next) => {
    if (
      previous.group !== next.group ||
      previous.isExpanded !== next.isExpanded ||
      previous.selectedCount !== next.selectedCount ||
      previous.onToggleExpanded !== next.onToggleExpanded ||
      previous.onToggleCookie !== next.onToggleCookie
    ) {
      return false;
    }

    for (const item of next.group.items) {
      if (Boolean(previous.selectedLookup[item.key]) !== Boolean(next.selectedLookup[item.key])) {
        return false;
      }
    }

    return true;
  }
);

export default function HomePage() {
  const extensionStatus = useExtensionStatus();
  const inventory = useCookieInventory(extensionStatus.isInstalled && !extensionStatus.isUsingMockData);

  const [isJarOpened, setIsJarOpened] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState<CleanupPresetId | "all">("all");
  const [filterScope, setFilterScope] = useState<FilterScope>("cleanup");
  const [selectedLookup, setSelectedLookup] = useState<Record<string, true>>({});
  const [message, setMessage] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query);

  const sourceGroups = useMemo(() => {
    if (extensionStatus.isUsingMockData) {
      return buildDemoGroups(extensionStatus.report);
    }

    return inventory.groups;
  }, [extensionStatus.isUsingMockData, extensionStatus.report, inventory.groups]);

  const selectedFilterLookup = filterScope === "selected" ? selectedLookup : EMPTY_SELECTION;

  const filteredGroups = useMemo(
    () => applyFilters(sourceGroups, deferredQuery, preset, filterScope, selectedFilterLookup),
    [sourceGroups, deferredQuery, preset, filterScope, selectedFilterLookup]
  );

  useEffect(() => {
    if (expandedDomain && !filteredGroups.some((group) => group.domain === expandedDomain)) {
      setExpandedDomain(null);
    }
  }, [expandedDomain, filteredGroups]);

  const keyToDomain = useMemo(() => {
    const next = new Map<string, string>();

    for (const group of sourceGroups) {
      for (const cookie of group.items) {
        next.set(cookie.key, group.domain);
      }
    }

    return next;
  }, [sourceGroups]);

  const selectedKeys = useMemo(() => Object.keys(selectedLookup), [selectedLookup]);
  const selectedCount = selectedKeys.length;

  const selectedCountByDomain = useMemo(() => {
    const next: Record<string, number> = {};

    for (const key of selectedKeys) {
      const domain = keyToDomain.get(key);
      if (!domain) {
        continue;
      }

      next[domain] = (next[domain] || 0) + 1;
    }

    return next;
  }, [keyToDomain, selectedKeys]);

  const visibleSelectableKeys = useMemo(() => {
    const keys: string[] = [];

    for (const group of filteredGroups) {
      for (const cookie of group.items) {
        if (isCleanupCandidate(cookie)) {
          keys.push(cookie.key);
        }
      }
    }

    return keys;
  }, [filteredGroups]);

  const visibleCookieCount = useMemo(
    () => filteredGroups.reduce((total, group) => total + group.total, 0),
    [filteredGroups]
  );

  const visibleSelectedCount = useMemo(() => {
    let total = 0;

    for (const key of visibleSelectableKeys) {
      if (selectedLookup[key]) {
        total += 1;
      }
    }

    return total;
  }, [selectedLookup, visibleSelectableKeys]);

  const toggleCookie = useCallback((key: string) => {
    startTransition(() => {
      setSelectedLookup((current) => {
        if (current[key]) {
          const next = { ...current };
          delete next[key];
          return next;
        }

        return {
          ...current,
          [key]: true,
        };
      });
    });
  }, []);

  const toggleExpandedDomain = useCallback((domain: string) => {
    setExpandedDomain((current) => (current === domain ? null : domain));
  }, []);

  const selectVisible = useCallback(() => {
    if (!visibleSelectableKeys.length) {
      return;
    }

    startTransition(() => {
      setSelectedLookup((current) => {
        let changed = false;
        const next = { ...current };

        for (const key of visibleSelectableKeys) {
          if (!next[key]) {
            next[key] = true;
            changed = true;
          }
        }

        return changed ? next : current;
      });
    });
  }, [visibleSelectableKeys]);

  const clearVisible = useCallback(() => {
    if (!visibleSelectableKeys.length) {
      return;
    }

    startTransition(() => {
      setSelectedLookup((current) => {
        let changed = false;
        const next = { ...current };

        for (const key of visibleSelectableKeys) {
          if (next[key]) {
            delete next[key];
            changed = true;
          }
        }

        return changed ? next : current;
      });
    });
  }, [visibleSelectableKeys]);

  const clearSelection = useCallback(() => {
    setSelectedLookup({});
  }, []);

  const canRequestFeed = extensionStatus.isInstalled && !extensionStatus.isUsingMockData;

  const requestFeed = async () => {
    if (!canRequestFeed) {
      setMessage("Real cleanup requests are disabled while mock mode is active.");
      return;
    }

    const targetKeys = selectedCount > 0 ? selectedKeys : visibleSelectableKeys;

    if (!targetKeys.length) {
      setMessage("No cleanup-ready cookies match the current filter. Try a broader view or flag items manually.");
      return;
    }

    const pending = await requestCookieFeed({
      description:
        selectedCount > 0
          ? `Only the ${targetKeys.length} cookies flagged on the website will be reviewed in the extension.`
          : `Cleanup-ready cookies matching the current website filters will be reviewed in the extension.`,
      keys: targetKeys,
      label: selectedCount > 0 ? "Website selection" : "Filtered cleanup request",
      presetId: preset === "all" ? undefined : preset,
    });

    if (pending) {
      setMessage(
        `${pending.label} created. The extension will confirm exactly ${pending.cookieCount} cookies before deletion.`
      );
      return;
    }

    setMessage("The extension could not create a cleanup request from this selection.");
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
              <div className="mb-4 rounded-[1.35rem] border border-[#e3d7c5] bg-white/75 p-4 shadow-[0_10px_28px_rgba(88,62,31,0.06)]">
                <div className="grid gap-2 lg:grid-cols-[minmax(0,1.2fr)_180px_auto]">
                  <label className="flex items-center gap-2 rounded-xl border border-[#ddcfba] bg-white px-3 text-sm text-[#4f4537] focus-within:border-[#ccb693] focus-within:ring-2 focus-within:ring-[#e8ddcb]">
                    <Icon icon="mdi:magnify" className="h-4 w-4 text-[#8a7b66]" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search domain, cookie, category, or reason"
                      className="h-10 w-full bg-transparent outline-none"
                    />
                  </label>

                  <select
                    value={preset}
                    onChange={(event) =>
                      startTransition(() => setPreset(event.target.value as CleanupPresetId | "all"))
                    }
                    className="h-10 rounded-xl border border-[#ddcfba] bg-white px-3 text-sm text-[#4f4537] outline-none"
                  >
                    <option value="all">All cleanup rules</option>
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

                <div className="mt-3 flex flex-wrap gap-2">
                  {filterScopeOptions.map((option) => {
                    const isActive = filterScope === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => startTransition(() => setFilterScope(option.id))}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          isActive
                            ? "border-[#c9b18e] bg-[#f0e2cf] text-[#4a3d2d]"
                            : "border-[#e0d4c2] bg-white text-[#7b6d5a] hover:bg-[#faf4eb]"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[#7b6d5a]">
                    Showing {visibleCookieCount.toLocaleString()} cookies across{" "}
                    {filteredGroups.length.toLocaleString()} domains, with{" "}
                    {visibleSelectableKeys.length.toLocaleString()} cleanup-ready items in view.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectVisible}
                      disabled={!visibleSelectableKeys.length}
                      className="rounded-xl border border-[#d8ccb8] bg-[#fff8ee] px-3 py-2 text-xs font-semibold text-[#6c5b44] transition hover:bg-[#f6ead8] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Flag visible
                    </button>
                    <button
                      type="button"
                      onClick={clearVisible}
                      disabled={!visibleSelectedCount}
                      className="rounded-xl border border-[#d8ccb8] bg-white px-3 py-2 text-xs font-semibold text-[#6c5b44] transition hover:bg-[#f7f0e5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Unflag visible
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <div className="rounded-2xl border border-[#f0d2cd] bg-[#fff7f6] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#bb5448]">
                      High Risk
                    </p>
                    <p className="mt-1 text-xs text-[#8e544a]">
                      Likely trackers or unsafe cross-site crumbs. Usually the best first cleanup.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#eadcb1] bg-[#fffaf0] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a07a1f]">
                      Watch
                    </p>
                    <p className="mt-1 text-xs text-[#8a6d24]">
                      Probably non-essential, but worth a quick review before clearing in bulk.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#cce3cf] bg-[#f7fcf8] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2f7a4d]">
                      Keep
                    </p>
                    <p className="mt-1 text-xs text-[#456b54]">
                      Likely sign-in or core site state. Leave these unless you are troubleshooting.
                    </p>
                  </div>
                </div>
              </div>

              {inventory.isLoading && !extensionStatus.isUsingMockData && (
                <div className="mb-3 flex items-center gap-2 p-3 text-sm text-[#6f6453]">
                  <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" /> Loading local cookie inventory...
                </div>
              )}

              {inventory.error && !extensionStatus.isUsingMockData && (
                <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  {inventory.error}
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-auto rounded-[1.35rem] border border-[#e3d7c5] bg-white/60 pr-1">
                <div className="sticky top-0 z-10 hidden grid-cols-[minmax(0,1.7fr)_82px_110px_140px] gap-2 border-b border-[#e7dccd] bg-[#f5ede1]/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b66] backdrop-blur md:grid">
                  <span className="pl-16.5">Domain</span>
                  <span className="text-center">Cookies</span>
                  <span className="text-center">Expiry</span>
                  <span>Status</span>
                </div>

                <div>
                  {filteredGroups.map((group) => (
                    <DomainGroupRow
                      key={group.domain}
                      group={group}
                      isExpanded={expandedDomain === group.domain}
                      onToggleExpanded={toggleExpandedDomain}
                      onToggleCookie={toggleCookie}
                      selectedCount={selectedCountByDomain[group.domain] || 0}
                      selectedLookup={selectedLookup}
                    />
                  ))}
                </div>

                {filteredGroups.length === 0 && (
                  <div className="m-4 rounded-2xl border border-dashed border-[#ddcfba] p-6 text-center text-sm text-[#6f6453]">
                    {filterScope === "selected"
                      ? "No flagged cookies yet. Flag rows from any other filter to build an exact cleanup batch."
                      : "No cookies match the current filter. Try broadening the search or switching to All cookies."}
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-[#eadfce] bg-white/90 p-4 shadow-[0_8px_24px_rgba(88,62,31,0.06)]">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-[#6f6453]">Selected cookies</span>
                  <span className="rounded-full bg-[#f3ede4] px-2.5 py-1 text-xs font-semibold text-[#3b3329]">
                    {selectedCount.toLocaleString()}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs text-[#8a7b66]">
                    Visible cleanup-ready {visibleSelectableKeys.length.toLocaleString()}
                  </span>
                  <span className="rounded-full bg-[#e8f2ff] px-2.5 py-1 text-xs font-medium text-[#3569b8]">
                    {selectedCount > 0 ? "Send exact flagged cookies" : "Send current filtered cleanup list"}
                  </span>
                </div>

                <p className="mt-2 text-xs text-[#8a7b66]">
                  Click a flag or any cookie row to mark it. Flagged cookies are sent exactly as-is to the extension.
                  If nothing is flagged, the extension receives the current filtered cleanup-ready cookies instead.
                </p>

                {message && <p className="mt-2 text-xs text-[#7b6d5a]">{message}</p>}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={requestFeed}
                    disabled={!canRequestFeed}
                    className="rounded-xl bg-[#1d6ed8] px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:bg-[#185db7] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {selectedCount > 0
                      ? `Send ${selectedCount.toLocaleString()} selected cookies`
                      : `Send ${visibleSelectableKeys.length.toLocaleString()} filtered cookies`}
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={selectedCount === 0}
                    className="rounded-xl border border-[#ddcfba] bg-[#faf6f0] px-4 py-2 text-xs font-medium text-[#6f6453] transition hover:bg-[#f4eddf] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear all flags
                  </button>
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
