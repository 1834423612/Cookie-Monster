"use client";

import {
  memo,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
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
  {
    id: "cleanup",
    label: "Review first",
    description: "Cleanup-ready cookies matched by the current search and rule set.",
  },
  {
    id: "high",
    label: "High risk",
    description: "The highest-risk cookies in the current view.",
  },
  {
    id: "watch",
    label: "Needs review",
    description: "Probably removable, but worth checking before cleanup.",
  },
  {
    id: "keep",
    label: "Keep on site",
    description: "Likely sign-in or core site state you probably want to keep.",
  },
  {
    id: "selected",
    label: "Selected",
    description: "Only the cookies you have checked for review.",
  },
  {
    id: "all",
    label: "Everything",
    description: "All cookies that match the current search and cleanup rule.",
  },
] as const;

const JAR_FRAME_MS = 220;
const JAR_OPEN_HOLD_MS = 120;
const JAR_REVEAL_MS = 700;
const JAR_FRAME_SEQUENCE = [1, 2, 3, 4] as const;
const STATIC_ASSET_CACHE_NAME = "cookie-monster-static-assets";
const STATIC_ASSET_MANIFEST_KEY = "cm-static-asset-manifest-v1";
const STATIC_ASSET_MANIFEST = [
  { path: "/jar1.svg", type: "image", revision: "2026-03-29-1", priority: "high" },
  { path: "/jar2.svg", type: "image", revision: "2026-03-29-1", priority: "high" },
  { path: "/jar3.svg", type: "image", revision: "2026-03-29-1", priority: "high" },
  { path: "/jar4.svg", type: "image", revision: "2026-03-29-1", priority: "high" },
  { path: "/c2.png", type: "image", revision: "2026-03-29-1", priority: "low" },
  { path: "/c3.png", type: "image", revision: "2026-03-29-1", priority: "low" },
  { path: "/c4.png", type: "image", revision: "2026-03-29-1", priority: "low" },
  { path: "/cm_idle.mp4", type: "video", revision: "2026-03-29-1", priority: "high" },
  { path: "/cm_eat2.mp4", type: "video", revision: "2026-03-29-1", priority: "high" },
] as const;

type FilterScope = (typeof filterScopeOptions)[number]["id"];
type IdleWarmupHandle = number | ReturnType<typeof globalThis.setTimeout>;

interface FilteredDomainGroup extends CookieDomainGroup {
  cleanupCandidateCount: number;
}

function getFilterScopeMeta(scope: FilterScope) {
  return filterScopeOptions.find((option) => option.id === scope) || filterScopeOptions[0];
}

function getStaticAssetManifestSignature() {
  return STATIC_ASSET_MANIFEST.map((asset) => `${asset.path}:${asset.revision}`).join("|");
}

function preloadStaticAsset(asset: (typeof STATIC_ASSET_MANIFEST)[number]) {
  if (typeof document === "undefined") {
    return;
  }

  const selector = `link[data-cookie-monster-preload="${asset.path}"]`;
  if (document.head.querySelector(selector)) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = asset.type;
  link.href = asset.path;
  link.setAttribute("data-cookie-monster-preload", asset.path);
  if (asset.priority === "high") {
    link.setAttribute("fetchpriority", "high");
  }
  document.head.appendChild(link);
}

function warmStaticAssetInMemory(asset: (typeof STATIC_ASSET_MANIFEST)[number]) {
  if (typeof window === "undefined") {
    return;
  }

  if (asset.type === "image") {
    const image = new window.Image();
    image.decoding = "async";
    image.src = asset.path;
    return;
  }

  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = asset.path;
  video.load();
}

async function primeStaticAssetCache(forceRefresh: boolean) {
  if (typeof window === "undefined" || !("caches" in window)) {
    return;
  }

  const cache = await window.caches.open(STATIC_ASSET_CACHE_NAME);

  if (forceRefresh) {
    const existingRequests = await cache.keys();
    await Promise.all(existingRequests.map((request) => cache.delete(request)));
  }

  await Promise.all(
    STATIC_ASSET_MANIFEST.map(async (asset) => {
      const cachedResponse = forceRefresh ? null : await cache.match(asset.path);
      if (cachedResponse) {
        return;
      }

      const response = await fetch(asset.path, { cache: forceRefresh ? "reload" : "force-cache" });
      if (response.ok) {
        await cache.put(asset.path, response.clone());
      }
    })
  );
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
      className={`grid cursor-pointer grid-cols-1 items-center gap-1.5 border-t border-[#eee4d6] px-3 py-1.5 transition-colors hover:bg-[#f6efe5] md:grid-cols-[minmax(0,1.7fr)_70px_96px_126px] ${
        isSelected ? "bg-[#efe2cf]" : ""
      }`}
    >
      <div className="flex items-center gap-2.5 pl-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggle(cookie.key);
          }}
          className={`flex h-5 w-5 items-center justify-center rounded transition ${
            isSelected ? "text-[#1d6ed8]" : "text-[#ccbca4] hover:text-[#a69377]"
          }`}
          aria-pressed={isSelected}
          aria-label={isSelected ? `Unselect ${cookie.name}` : `Select ${cookie.name}`}
        >
          <Icon
            icon={isSelected ? "mdi:checkbox-marked-circle" : "mdi:checkbox-blank-circle-outline"}
            className="h-3.5 w-3.5"
          />
        </button>
        <img src={getCookieArt(cookie.risk)} alt="" className="h-4.5 w-4.5 shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[12px] font-medium text-[#342c22]">{cookie.name}</span>
          </div>
          <p className="truncate text-[10px] text-[#8a7b66]">
            {cookie.category} - {getSameSiteLabel(cookie.sameSite)} - {getCookieGuidance(cookie)}
          </p>
        </div>
      </div>

      <span className="hidden text-center text-[11px] text-[#6f6453] md:block">1</span>
      <span
        title={formatExpiry(cookie.expirationDate)}
        className={`hidden text-center text-[11px] md:block ${
          isUrgent ? "font-semibold text-[#c44b3c]" : "text-[#8a7b66]"
        }`}
      >
        {expiry}
      </span>
      <span
        className={`hidden items-center gap-1.5 rounded-md border px-2 py-0.75 text-[9px] font-semibold uppercase tracking-[0.08em] md:inline-flex ${status.className}`}
      >
        <span className={`h-3.5 w-1 rounded-full ${status.accentClass}`} />
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
          className={`grid w-full grid-cols-1 items-center gap-1.5 px-3 py-2.5 text-left transition-all md:grid-cols-[minmax(0,1.7fr)_70px_96px_126px] ${
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
            <img src={getCookieArt(groupRisk)} alt="" className="h-6 w-6 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[#342c22]">{group.domain}</p>
              <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px] text-[#8a7b66]">
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
                    {selectedCount} selected
                  </span>
                )}
              </div>
            </div>
          </div>

          <span className="hidden text-center text-[12px] text-[#5e5548] md:block">{group.total}</span>
          <span className="hidden text-center text-[11px] text-[#8a7b66] md:block">--</span>
          <span
            className={`hidden items-center gap-1.5 rounded-md border px-2 py-0.75 text-[9px] font-semibold uppercase tracking-[0.08em] md:inline-flex ${groupStatus.className}`}
          >
            <span className={`h-3.5 w-1 rounded-full ${groupStatus.accentClass}`} />
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
              className="ml-7 border-l border-[#eadfce] bg-[#fbf7f1]/85"
              style={{ contentVisibility: "auto", containIntrinsicSize: "180px" }}
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
  const jarTimeoutIdsRef = useRef<number[]>([]);

  const [jarPhase, setJarPhase] = useState<"idle" | 1 | 2 | 3 | 4 | "fading" | "done">("idle");
  const [expandedDomains, setExpandedDomains] = useState<Record<string, true>>({});
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState<CleanupPresetId | "all">("all");
  const [filterScope, setFilterScope] = useState<FilterScope>("cleanup");
  const [selectedLookup, setSelectedLookup] = useState<Record<string, true>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isEating, setIsEating] = useState(false);
  const [isReturningToIdle, setIsReturningToIdle] = useState(false);
  const [isCookieListExpanded, setIsCookieListExpanded] = useState(false);
  const [isGuideCollapsed, setIsGuideCollapsed] = useState(true);

  const clearJarTimers = useCallback(() => {
    for (const timeoutId of jarTimeoutIdsRef.current) {
      window.clearTimeout(timeoutId);
    }
    jarTimeoutIdsRef.current = [];
  }, []);

  const handleJarClick = useCallback(() => {
    if (jarPhase !== "idle") return;

    clearJarTimers();
    setJarPhase(2);
    jarTimeoutIdsRef.current = [
      window.setTimeout(() => setJarPhase(3), JAR_FRAME_MS),
      window.setTimeout(() => setJarPhase(4), JAR_FRAME_MS * 2),
      window.setTimeout(() => setJarPhase("fading"), JAR_FRAME_MS * 2 + JAR_OPEN_HOLD_MS),
      window.setTimeout(
        () => setJarPhase("done"),
        JAR_FRAME_MS * 2 + JAR_OPEN_HOLD_MS + JAR_REVEAL_MS
      ),
    ];
  }, [clearJarTimers, jarPhase]);

  const deferredQuery = useDeferredValue(query);

  const sourceGroups = useMemo(() => {
    if (extensionStatus.isUsingMockData) {
      return buildDemoGroups(extensionStatus.report);
    }

    return inventory.groups;
  }, [extensionStatus.isUsingMockData, extensionStatus.report, inventory.groups]);

  const baseFilteredGroups = useMemo(
    () => applyFilters(sourceGroups, deferredQuery, preset, "all", EMPTY_SELECTION),
    [sourceGroups, deferredQuery, preset]
  );

  const filteredGroups = useMemo(
    () => applyFilters(sourceGroups, deferredQuery, preset, filterScope, selectedLookup),
    [sourceGroups, deferredQuery, preset, filterScope, selectedLookup]
  );

  useEffect(() => {
    setExpandedDomains((current) => {
      let changed = false;
      const visibleDomains = new Set(filteredGroups.map((group) => group.domain));
      const next: Record<string, true> = {};

      for (const domain of Object.keys(current)) {
        if (visibleDomains.has(domain)) {
          next[domain] = true;
        } else {
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [filteredGroups]);

  useEffect(() => {
    const manifestSignature = getStaticAssetManifestSignature();
    const previousManifest = window.localStorage.getItem(STATIC_ASSET_MANIFEST_KEY);
    const needsRefresh = previousManifest !== manifestSignature;
    const criticalAssets = STATIC_ASSET_MANIFEST.filter((asset) => asset.priority === "high");
    const idleAssets = STATIC_ASSET_MANIFEST.filter((asset) => asset.priority !== "high");

    for (const asset of criticalAssets) {
      preloadStaticAsset(asset);
      warmStaticAssetInMemory(asset);
    }

    const scheduleIdleWarmup = (callback: IdleRequestCallback) => {
      if (typeof globalThis.requestIdleCallback === "function") {
        return globalThis.requestIdleCallback(callback);
      }

      return globalThis.setTimeout(
        () => callback({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline),
        180
      );
    };

    const cancelIdleWarmup = (handle: IdleWarmupHandle) => {
      if (typeof globalThis.cancelIdleCallback === "function") {
        globalThis.cancelIdleCallback(handle as number);
        return;
      }

      globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>);
    };

    const idleHandle = scheduleIdleWarmup(async () => {
      for (const asset of idleAssets) {
        preloadStaticAsset(asset);
        warmStaticAssetInMemory(asset);
      }

      try {
        await primeStaticAssetCache(needsRefresh);
        window.localStorage.setItem(STATIC_ASSET_MANIFEST_KEY, manifestSignature);
      } catch {
        // Ignore cache warmup failures and fall back to normal browser caching.
      }
    });

    return () => {
      cancelIdleWarmup(idleHandle);
    };
  }, []);

  useEffect(() => clearJarTimers, [clearJarTimers]);

  useEffect(() => {
    if (!isCookieListExpanded) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCookieListExpanded(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCookieListExpanded]);

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

  const selectionInCurrentSearchCount = useMemo(() => {
    let total = 0;

    for (const group of baseFilteredGroups) {
      for (const cookie of group.items) {
        if (selectedLookup[cookie.key]) {
          total += 1;
        }
      }
    }

    return total;
  }, [baseFilteredGroups, selectedLookup]);

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

    for (const group of filteredGroups) {
      for (const cookie of group.items) {
        if (selectedLookup[cookie.key]) {
          total += 1;
        }
      }
    }

    return total;
  }, [filteredGroups, selectedLookup]);

  const hiddenSelectedCount = Math.max(0, selectedCount - selectionInCurrentSearchCount);

  const scopeCounts = useMemo(() => {
    const counts: Record<FilterScope, number> = {
      cleanup: 0,
      high: 0,
      watch: 0,
      keep: 0,
      selected: selectedCount,
      all: 0,
    };

    for (const group of baseFilteredGroups) {
      counts.all += group.total;

      for (const cookie of group.items) {
        if (isCleanupCandidate(cookie)) {
          counts.cleanup += 1;
        }

        if (cookie.risk === "high") {
          counts.high += 1;
        }

        if (cookie.risk === "medium") {
          counts.watch += 1;
        }

        if (cookie.recommendedKeep) {
          counts.keep += 1;
        }
      }
    }

    return counts;
  }, [baseFilteredGroups, selectedCount]);

  const activeScope = getFilterScopeMeta(filterScope);

  const toggleCookie = useCallback((key: string) => {
    startTransition(() => {
      setMessage(null);
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
    setExpandedDomains((current) => {
      if (current[domain]) {
        const next = { ...current };
        delete next[domain];
        return next;
      }

      return {
        ...current,
        [domain]: true,
      };
    });
  }, []);

  const selectVisible = useCallback(() => {
    if (!visibleSelectableKeys.length) {
      return;
    }

    startTransition(() => {
      setMessage(null);
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
      setFilterScope("selected");
      setExpandedDomains((current) => {
        const next = { ...current };

        for (const group of filteredGroups) {
          if (group.items.some((cookie) => isCleanupCandidate(cookie))) {
            next[group.domain] = true;
          }
        }

        return next;
      });
    });
  }, [filteredGroups, visibleSelectableKeys]);

  const clearVisible = useCallback(() => {
    if (!visibleSelectableKeys.length) {
      return;
    }

    startTransition(() => {
      setMessage(null);
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
    setMessage(null);
    setSelectedLookup({});
  }, []);

  const showSelected = useCallback(() => {
    if (!selectedCount) {
      return;
    }

    startTransition(() => {
      setQuery("");
      setPreset("all");
      setFilterScope("selected");
      setExpandedDomains((current) => {
        const next = { ...current };

        for (const key of selectedKeys) {
          const domain = keyToDomain.get(key);
          if (domain) {
            next[domain] = true;
          }
        }

        return next;
      });
    });
  }, [keyToDomain, selectedCount, selectedKeys]);

  const handleReturnToJar = useCallback(() => {
    clearJarTimers();
    setIsCookieListExpanded(false);
    setIsEating(false);
    setMessage(null);
    setJarPhase("idle");
  }, [clearJarTimers]);

  const canRequestFeed = extensionStatus.isInstalled && !extensionStatus.isUsingMockData;

  const requestFeed = async () => {
    if (!canRequestFeed) {
      setMessage("Real cleanup requests are disabled while mock mode is active.");
      return;
    }

    if (!selectedCount) {
      setMessage("Select the cookies you want first. Nothing will be queued until items are checked.");
      return;
    }

    const pending = await requestCookieFeed({
      description:
        `Only the ${selectedKeys.length} checked cookies from the website will be reviewed in the extension.`,
      keys: selectedKeys,
      label: "Website selection",
    });

    if (pending) {
      setMessage(
        `${pending.cookieCount} cookies were sent to the extension. Open the extension to approve the request before cleanup.`
      );
      return;
    }

    setTimeout(() => {
      setIsReturningToIdle(false);
      setIsEating(true);
    }, 1000);
    setMessage("The extension could not create a cleanup request from this selection.");
  };

  useEffect(() => {
    if (filterScope === "selected" && !selectedCount) {
      setFilterScope("cleanup");
    }
  }, [filterScope, selectedCount]);

  useEffect(() => {
    if (filterScope !== "selected") {
      return;
    }

    setExpandedDomains((current) => {
      const next = { ...current };
      let changed = false;

      for (const group of filteredGroups) {
        if (!next[group.domain]) {
          next[group.domain] = true;
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [filterScope, filteredGroups]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,#f6ecd8,#efe6d7_45%,#ece7df)] text-[#2d261a]">
      <main className="mx-auto flex min-h-0 w-full max-w-auto flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
        <section
          className={`grid min-h-0 flex-1 gap-4 transition-[grid-template-columns] duration-500 ease-in-out ${
            isEating
              ? "md:grid-cols-[minmax(0,1.55fr)_minmax(0,1.45fr)]"
              : "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
          }`}
        >
          {jarPhase !== "fading" && jarPhase !== "done" ? (
            jarPhase === "idle" ? (
              <button
                onClick={handleJarClick}
                className="flex items-center justify-center transition hover:-translate-y-0.5"
              >
                <div className="relative h-135 w-135">
                  {JAR_FRAME_SEQUENCE.map((frame) => {
                    const isVisible = frame === 1;

                    return (
                      <img
                        key={frame}
                        src={`/jar${frame}.svg`}
                        alt="Cookie jar"
                        aria-hidden={!isVisible}
                        decoding="async"
                        fetchPriority={frame === 1 ? "high" : "auto"}
                        className={`absolute inset-0 h-135 w-135 transition-opacity duration-75 ${
                          isVisible ? "opacity-100" : "opacity-0"
                        } ${frame === 1 && jarPhase === "idle" ? "animate-jar-idle-shake" : ""}`}
                        style={{ willChange: "opacity, transform" }}
                      />
                    );
                  })}
                </div>
              </button>
            ) : (
              <div className="flex items-center justify-center">
                <div className="relative h-135 w-135">
                  {JAR_FRAME_SEQUENCE.map((frame) => {
                    const isVisible =
                      (frame === 1 && jarPhase === 1) ||
                      (frame === 2 && jarPhase === 2) ||
                      (frame === 3 && jarPhase === 3) ||
                      (frame === 4 && jarPhase === 4);

                    return (
                      <img
                        key={frame}
                        src={`/jar${frame}.svg`}
                        alt="Cookie jar"
                        aria-hidden={!isVisible}
                        decoding="async"
                        className={`absolute inset-0 h-135 w-135 transition-opacity duration-75 ${
                          isVisible ? "opacity-100" : "opacity-0"
                        }`}
                        style={{ willChange: "opacity, transform" }}
                      />
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            <div className="relative flex min-h-0 min-w-0 flex-col">
              {jarPhase === "fading" && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                  <img
                    src="/jar4.svg"
                    alt="Cookie jar"
                    className="h-135 w-135 animate-jar-fade-out"
                    decoding="async"
                    style={{ willChange: "opacity, transform" }}
                  />
                </div>
              )}
              <section
                className="flex min-h-0 min-w-0 flex-1 flex-col p-4 transition-opacity duration-700"
                style={{ opacity: jarPhase === "done" ? 1 : 0 }}
              >
              <div className="mb-2 rounded-[1.2rem] border border-[#e3d7c5] bg-white/78 p-3 shadow-[0_8px_22px_rgba(88,62,31,0.05)]">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReturnToJar}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#ddcfba] bg-white px-3 text-xs font-semibold text-[#6c5b44] transition hover:bg-[#f7f0e5]"
                  >
                    <Icon icon="mdi:arrow-left" className="h-4 w-4" />
                    Back
                  </button>

                  <label className="flex h-9 min-w-55 flex-1 items-center gap-2 rounded-xl border border-[#ddcfba] bg-white px-3 text-sm text-[#4f4537] focus-within:border-[#ccb693] focus-within:ring-2 focus-within:ring-[#e8ddcb]">
                    <Icon icon="mdi:magnify" className="h-4 w-4 text-[#8a7b66]" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search domain, cookie, category, or reason"
                      className="w-full bg-transparent outline-none"
                    />
                  </label>

                  <select
                    value={preset}
                    onChange={(event) =>
                      startTransition(() => setPreset(event.target.value as CleanupPresetId | "all"))
                    }
                    className="h-9 rounded-xl border border-[#ddcfba] bg-white px-3 text-sm text-[#4f4537] outline-none"
                  >
                    <option value="all">All rules</option>
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
                    className="h-9 rounded-xl border border-[#ddcfba] bg-white px-3 text-xs font-semibold text-[#5e5548] transition hover:bg-[#faf6f0]"
                  >
                    Refresh
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {filterScopeOptions.map((option) => {
                    const isActive = filterScope === option.id;
                    const count = option.id === "selected" ? selectedCount : scopeCounts[option.id];

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => startTransition(() => setFilterScope(option.id))}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          isActive
                            ? "border-[#c9b18e] bg-[#f0e2cf] text-[#4a3d2d]"
                            : "border-[#e0d4c2] bg-white text-[#7b6d5a] hover:bg-[#faf4eb]"
                        }`}
                      >
                        <span>{option.label}</span>
                        <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px]">
                          {count.toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7b6d5a]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{activeScope.label}</span>
                    <span>·</span>
                    <span>{visibleCookieCount.toLocaleString()} cookies</span>
                    <span>·</span>
                    <span>{filteredGroups.length.toLocaleString()} domains</span>
                    <span>·</span>
                    <span>{selectedCount.toLocaleString()} selected</span>
                    {hiddenSelectedCount > 0 && (
                      <>
                        <span>·</span>
                        <span>{hiddenSelectedCount.toLocaleString()} hidden by current search</span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectVisible}
                      disabled={!visibleSelectableKeys.length}
                      className="rounded-xl border border-[#d8ccb8] bg-[#fff8ee] px-3 py-1.5 text-xs font-semibold text-[#6c5b44] transition hover:bg-[#f6ead8] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Select visible
                    </button>
                    <button
                      type="button"
                      onClick={clearVisible}
                      disabled={!visibleSelectedCount}
                      className="rounded-xl border border-[#d8ccb8] bg-white px-3 py-1.5 text-xs font-semibold text-[#6c5b44] transition hover:bg-[#f7f0e5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear visible
                    </button>
                    <button
                      type="button"
                      onClick={showSelected}
                      disabled={!selectedCount}
                      className="rounded-xl border border-[#c7daf5] bg-[#eef5ff] px-3 py-1.5 text-xs font-semibold text-[#3569b8] transition hover:bg-[#e3efff] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Show selected
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsGuideCollapsed((current) => !current)}
                      className="rounded-xl border border-[#ddcfba] bg-white px-3 py-1.5 text-xs font-semibold text-[#6c5b44] transition hover:bg-[#f7f0e5]"
                      aria-expanded={!isGuideCollapsed}
                    >
                      {isGuideCollapsed ? "Guide" : "Hide guide"}
                    </button>
                  </div>
                </div>

                {!isGuideCollapsed && (
                  <div className="mt-2 rounded-xl border border-[#eadfce] bg-[#fcf8f1] px-3 py-2 text-xs text-[#7b6d5a]">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span><strong className="text-[#bb5448]">High risk</strong>: start here</span>
                      <span><strong className="text-[#a07a1f]">Needs review</strong>: check before clearing</span>
                      <span><strong className="text-[#2f7a4d]">Keep on site</strong>: likely sign-in or core state</span>
                    </div>
                  </div>
                )}
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

              {isCookieListExpanded && (
                <button
                  type="button"
                  aria-label="Close expanded cookie list"
                  onClick={() => setIsCookieListExpanded(false)}
                  className="fixed inset-0 z-40 bg-[#2d261a]/38 backdrop-blur-[2px]"
                />
              )}

              <div
                className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.35rem] border border-[#e3d7c5] bg-white/60 ${
                  isCookieListExpanded
                    ? "fixed inset-4 z-50 max-h-[calc(100vh-2rem)] bg-white/95 shadow-[0_24px_80px_rgba(45,38,26,0.22)] md:inset-6 md:max-h-[calc(100vh-3rem)]"
                    : ""
                }`}
                role={isCookieListExpanded ? "dialog" : undefined}
                aria-modal={isCookieListExpanded || undefined}
                aria-label="Cookie inventory"
              >
                <div className="flex items-center justify-between gap-3 border-b border-[#e7dccd] bg-[#fcf7ef]/95 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#4a3d2d]">Cookie inventory</p>
                    <p className="truncate text-xs text-[#8a7b66]">
                      {visibleCookieCount.toLocaleString()} cookies across {filteredGroups.length.toLocaleString()} domains
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCookieListExpanded((current) => !current)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#ddcfba] bg-white px-3 py-2 text-xs font-semibold text-[#6c5b44] transition hover:bg-[#f7f0e5]"
                    aria-pressed={isCookieListExpanded}
                  >
                    <Icon
                      icon={isCookieListExpanded ? "mdi:fullscreen-exit" : "mdi:fullscreen"}
                      className="h-4 w-4"
                    />
                    {isCookieListExpanded ? "Exit full screen" : "Full screen"}
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-auto pr-1">
                  <div className="sticky top-0 z-10 hidden grid-cols-[minmax(0,1.7fr)_70px_96px_126px] gap-1.5 border-b border-[#e7dccd] bg-[#f5ede1]/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a7b66] backdrop-blur md:grid">
                    <span className="pl-12">Domain</span>
                    <span className="text-center">Cookies</span>
                    <span className="text-center">Expiry</span>
                    <span>Status</span>
                  </div>

                  <div>
                    {filteredGroups.map((group) => (
                      <DomainGroupRow
                        key={group.domain}
                        group={group}
                        isExpanded={Boolean(expandedDomains[group.domain])}
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
                        ? "No selected cookies yet. Check rows from any other view to build an exact cleanup batch."
                        : "No cookies match the current filter. Try broadening the search or switching to All cookies."}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2 rounded-2xl border border-[#eadfce] bg-white/88 px-3 py-2 shadow-[0_6px_18px_rgba(88,62,31,0.05)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#7b6d5a]">
                    <span className="rounded-full bg-[#f3ede4] px-2 py-0.5 font-semibold text-[#3b3329]">
                      {selectedCount.toLocaleString()} selected
                    </span>
                    {visibleSelectedCount > 0 && (
                      <span className="rounded-full bg-white px-2 py-0.5">
                        {visibleSelectedCount.toLocaleString()} visible
                      </span>
                    )}
                    <span>{selectedCount > 0 ? "Send only checked cookies. Approve the request in the extension." : "Select cookies in the list, then send them to the extension for approval."}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={requestFeed}
                      disabled={!canRequestFeed || selectedCount === 0}
                      className="rounded-xl bg-[#1d6ed8] px-3 py-1.5 text-xs font-semibold text-white transition enabled:hover:bg-[#185db7] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {selectedCount > 0 ? `Send ${selectedCount.toLocaleString()}` : "Send selected"}
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      disabled={selectedCount === 0}
                      className="rounded-xl border border-[#ddcfba] bg-[#faf6f0] px-3 py-1.5 text-xs font-medium text-[#6f6453] transition hover:bg-[#f4eddf] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {message && <p className="mt-1 text-[11px] text-[#7b6d5a]">{message}</p>}
              </div>
            </section>
            </div>
          )}

          <aside
            className="relative min-h-0 min-w-0 overflow-hidden transition-transform duration-700 ease-out"
            style={{
              transform:
                jarPhase === "fading" || jarPhase === "done"
                  ? "translateX(0)"
                  : "translateX(-40%)",
            }}
          >
            <video
              src="/cm_idle.mp4"
              autoPlay
              loop
              muted
              playsInline
              className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${
                isEating && !isReturningToIdle ? "opacity-0" : "opacity-100"
              }`}
              preload="auto"
              style={{ willChange: "opacity" }}
            />
            <video
              key={isEating ? "eating" : "idle"}
              src="/cm_eat2.mp4"
              autoPlay={isEating}
              muted
              playsInline
              onEnded={() => {
                setIsReturningToIdle(true);
                setTimeout(() => {
                  setIsEating(false);
                  setIsReturningToIdle(false);
                }, 180);
              }}
              preload="auto"
              className={`h-full w-full object-contain transition-[opacity,transform] duration-200 ${isEating ? "scale-135 opacity-100" : "scale-100 opacity-0"}`}
              style={{ willChange: "opacity, transform" }}
            />
          </aside>
        </section>
      </main>
    </div>
  );
}
