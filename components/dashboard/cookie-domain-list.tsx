"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface DomainData {
  domain: string;
  cookieCount: number;
  riskLevel: "high" | "medium" | "low";
  cookies?: CookieItem[];
}

interface CookieItem {
  name: string;
  value: string;
  risk: "high" | "medium" | "low";
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
  expires?: string;
}

interface CookieDomainListProps {
  domains: DomainData[];
  onDomainSelect?: (domain: string) => void;
  onCookieDelete?: (domain: string, cookieName: string) => void;
  isLoading?: boolean;
}

// Cookie icon URLs based on severity
const cookieIcons = {
  high: "https://placehold.co/48x48/EF4444/FFFFFF/png?text=C&font=montserrat",
  medium: "https://placehold.co/48x48/F59E0B/FFFFFF/png?text=C&font=montserrat",
  low: "https://placehold.co/48x48/22C55E/FFFFFF/png?text=C&font=montserrat",
};

const riskConfig = {
  high: {
    label: "HIGH RISK",
    dotColor: "bg-red-500",
    textColor: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  medium: {
    label: "MEDIUM",
    dotColor: "bg-amber-500",
    textColor: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  low: {
    label: "LOW",
    dotColor: "bg-emerald-500",
    textColor: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
};

const statusConfig = {
  high: {
    label: "ALERT",
    bg: "bg-red-500",
    text: "text-white",
  },
  medium: {
    label: "REVIEW",
    bg: "bg-amber-500",
    text: "text-white",
  },
  low: {
    label: "SAFE",
    bg: "bg-emerald-500",
    text: "text-white",
  },
};

// Domain row component - ClickUp style
function DomainRow({
  domain,
  onCookieDelete,
  expanded,
  onToggle,
}: {
  domain: DomainData;
  onCookieDelete?: (cookieName: string) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const risk = riskConfig[domain.riskLevel];
  const status = statusConfig[domain.riskLevel];

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      {/* Domain row - clickable */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all duration-150",
          "hover:bg-slate-50/80",
          expanded && "bg-slate-50"
        )}
      >
        {/* Expand arrow */}
        <div className="w-5 flex justify-center shrink-0">
          <Icon
            icon="mdi:chevron-right"
            className={cn(
              "w-5 h-5 text-slate-400 transition-transform duration-200",
              expanded && "rotate-90 text-slate-600"
            )}
          />
        </div>

        {/* Cookie icon */}
        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 shadow-sm ring-1 ring-slate-200/50">
          <Image
            src={cookieIcons[domain.riskLevel]}
            alt={`${domain.riskLevel} risk cookie`}
            width={36}
            height={36}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Domain name */}
        <div className="flex-1 min-w-0">
          <span className="font-medium text-slate-800 truncate block text-[15px]">
            {domain.domain}
          </span>
        </div>

        {/* Cookie count badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md shrink-0">
          <Icon icon="mdi:cookie-outline" className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600">
            {domain.cookieCount}
          </span>
        </div>

        {/* Date column */}
        <div className="w-24 text-center shrink-0">
          <span className="text-sm text-slate-500">Today</span>
        </div>

        {/* Priority flag */}
        <div className="w-8 flex justify-center shrink-0">
          <Icon
            icon={domain.riskLevel === "high" ? "mdi:flag" : "mdi:flag-outline"}
            className={cn(
              "w-4 h-4",
              domain.riskLevel === "high" && "text-red-500",
              domain.riskLevel === "medium" && "text-amber-400",
              domain.riskLevel === "low" && "text-slate-300"
            )}
          />
        </div>

        {/* Status badge - ClickUp style */}
        <div className="w-28 shrink-0">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold",
              status.bg,
              status.text
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                domain.riskLevel === "high" && "bg-white/80",
                domain.riskLevel !== "high" && "bg-white/60"
              )}
            />
            {status.label}
          </div>
        </div>
      </button>

      {/* Expanded cookie list */}
      {expanded && domain.cookies && domain.cookies.length > 0 && (
        <div className="animate-expand overflow-hidden bg-slate-50/50">
          <div className="py-2">
            {domain.cookies.map((cookie, idx) => {
              const cookieStatus = statusConfig[cookie.risk];
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-3 px-5 py-2.5 ml-8 mr-4 rounded-lg transition-all duration-150",
                    "hover:bg-white hover:shadow-sm"
                  )}
                >
                  {/* Nested dot indicator */}
                  <div className="w-5 flex justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  </div>

                  {/* Cookie mini icon */}
                  <div className="w-7 h-7 rounded-md overflow-hidden shrink-0 ring-1 ring-slate-200/50">
                    <Image
                      src={cookieIcons[cookie.risk]}
                      alt={`${cookie.risk} risk`}
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Cookie name and flags */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-700 truncate">
                        {cookie.name}
                      </span>
                      <div className="flex items-center gap-1">
                        {cookie.httpOnly && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded">
                            HTTP
                          </span>
                        )}
                        {cookie.secure && (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-semibold rounded">
                            SEC
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {cookie.value.length > 50
                        ? cookie.value.slice(0, 50) + "..."
                        : cookie.value}
                    </p>
                  </div>

                  {/* Expiry date */}
                  <div className="text-xs text-slate-500 shrink-0 min-w-[80px] text-center">
                    {cookie.expires || "Session"}
                  </div>

                  {/* SameSite */}
                  <div className="text-xs text-slate-400 shrink-0 min-w-[60px] text-center">
                    {cookie.sameSite}
                  </div>

                  {/* Risk indicator dot */}
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white",
                      cookie.risk === "high" && "bg-red-500",
                      cookie.risk === "medium" && "bg-amber-500",
                      cookie.risk === "low" && "bg-emerald-500"
                    )}
                  />

                  {/* Delete action */}
                  {onCookieDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCookieDelete(cookie.name);
                      }}
                      className="p-1.5 rounded-md hover:bg-red-50 transition-colors group shrink-0"
                    >
                      <Icon
                        icon="mdi:trash-can-outline"
                        className="w-4 h-4 text-slate-400 group-hover:text-red-500"
                      />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading state for expanded without cookies */}
      {expanded && (!domain.cookies || domain.cookies.length === 0) && (
        <div className="animate-expand overflow-hidden bg-slate-50/50">
          <div className="py-4 px-5 ml-8">
            <div className="flex items-center gap-2 text-slate-400">
              <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading cookies...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Cookie Monster mascot - Clean and minimal
function CookieMonsterCard() {
  return (
    <div className="relative h-full flex flex-col items-center justify-center p-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute top-6 left-6 w-16 h-16 rounded-full bg-blue-200/30 blur-xl" />
        <div className="absolute bottom-10 right-8 w-20 h-20 rounded-full bg-amber-200/30 blur-xl" />
        <div className="absolute top-1/2 left-1/3 w-12 h-12 rounded-full bg-emerald-200/30 blur-xl" />
      </div>

      {/* Monster avatar */}
      <div className="relative animate-monster-bounce">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 shadow-xl flex items-center justify-center relative overflow-hidden">
          {/* Fur texture */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-2 left-4 w-6 h-2 bg-white rounded-full" />
            <div className="absolute top-6 right-3 w-4 h-2 bg-white rounded-full" />
            <div className="absolute bottom-8 left-5 w-5 h-2 bg-white rounded-full" />
          </div>

          {/* Eyes */}
          <div className="flex gap-2 mb-4">
            <div className="w-8 h-10 bg-white rounded-full flex items-start justify-center pt-1.5 shadow-inner">
              <div className="w-4 h-4 bg-slate-800 rounded-full relative">
                <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
            <div className="w-8 h-10 bg-white rounded-full flex items-start justify-center pt-1.5 shadow-inner">
              <div className="w-4 h-4 bg-slate-800 rounded-full relative">
                <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
          </div>

          {/* Mouth */}
          <div className="absolute bottom-5 w-10 h-6 bg-red-500 rounded-b-full rounded-t-sm overflow-hidden">
            <div className="flex justify-center gap-0.5 pt-0">
              <div className="w-2 h-1.5 bg-white rounded-b" />
              <div className="w-2 h-1.5 bg-white rounded-b" />
            </div>
          </div>
        </div>

        {/* Floating cookie */}
        <div className="absolute -right-2 -bottom-2 animate-cookie-float">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg flex items-center justify-center">
            <div className="absolute top-2 left-3 w-1.5 h-1.5 rounded-full bg-amber-800" />
            <div className="absolute bottom-3 right-2 w-1 h-1 rounded-full bg-amber-800" />
            <div className="absolute bottom-2 left-2.5 w-1.5 h-1.5 rounded-full bg-amber-800" />
          </div>
        </div>
      </div>

      {/* Speech bubble */}
      <div className="mt-8 bg-white rounded-2xl px-5 py-3 shadow-lg border border-slate-100 relative z-10">
        <p className="text-sm font-semibold text-slate-700 text-center">
          Me love cookies!
        </p>
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-slate-100 transform rotate-45" />
      </div>

      {/* Status */}
      <div className="mt-6 text-center">
        <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">
          Cookie Status
        </p>
        <p className="text-xl font-bold text-slate-700 mt-1">All Clear</p>
      </div>
    </div>
  );
}

export function CookieDomainList({
  domains,
  onDomainSelect,
  onCookieDelete,
  isLoading,
}: CookieDomainListProps) {
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDomains = domains
    .filter((d) => (filter === "all" ? true : d.riskLevel === filter))
    .filter((d) =>
      searchQuery
        ? d.domain.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

  const handleToggle = (domain: string) => {
    if (expandedDomain === domain) {
      setExpandedDomain(null);
    } else {
      setExpandedDomain(domain);
      onDomainSelect?.(domain);
    }
  };

  // Count by risk level
  const counts = {
    all: domains.length,
    high: domains.filter((d) => d.riskLevel === "high").length,
    medium: domains.filter((d) => d.riskLevel === "medium").length,
    low: domains.filter((d) => d.riskLevel === "low").length,
  };

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Left side - Domain list (2/3) */}
      <div className="flex-[2] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Cookie Jar</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {domains.length} domains detected
            </p>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl w-72 shadow-sm focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Icon icon="mdi:magnify" className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search domains..."
              className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Filter tabs - ClickUp style */}
        <div className="flex items-center gap-1 mb-5 bg-slate-100/60 p-1 rounded-xl w-fit">
          {(["all", "high", "medium", "low"] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg flex items-center gap-2",
                filter === level
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {level === "all"
                ? "All"
                : level.charAt(0).toUpperCase() + level.slice(1)}
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-xs font-semibold",
                  filter === level
                    ? level === "high"
                      ? "bg-red-100 text-red-600"
                      : level === "medium"
                        ? "bg-amber-100 text-amber-600"
                        : level === "low"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-blue-100 text-blue-600"
                    : "bg-slate-200/80 text-slate-500"
                )}
              >
                {counts[level]}
              </span>
            </button>
          ))}
        </div>

        {/* Column headers - ClickUp style */}
        <div className="flex items-center gap-3 px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 rounded-t-xl border border-b-0 border-slate-200">
          <div className="w-5" /> {/* Arrow space */}
          <div className="w-9" /> {/* Icon space */}
          <div className="flex-1">Name</div>
          <div className="w-20 text-center">Cookies</div>
          <div className="w-24 text-center">Updated</div>
          <div className="w-8 text-center">Priority</div>
          <div className="w-28 text-center">Status</div>
        </div>

        {/* Domain list */}
        <div className="flex-1 bg-white rounded-b-xl border border-slate-200 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Icon
                  icon="mdi:loading"
                  className="w-8 h-8 text-blue-500 animate-spin"
                />
                <span className="text-sm text-slate-500">Loading...</span>
              </div>
            </div>
          ) : filteredDomains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Icon
                  icon="mdi:cookie-off-outline"
                  className="w-8 h-8 text-slate-400"
                />
              </div>
              <p className="text-slate-600 font-medium">No cookies found</p>
              <p className="text-sm text-slate-400 mt-1">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            filteredDomains.map((domain) => (
              <DomainRow
                key={domain.domain}
                domain={domain}
                expanded={expandedDomain === domain.domain}
                onToggle={() => handleToggle(domain.domain)}
                onCookieDelete={
                  onCookieDelete
                    ? (name) => onCookieDelete(domain.domain, name)
                    : undefined
                }
              />
            ))
          )}
        </div>
      </div>

      {/* Right side - Cookie Monster (1/3) */}
      <div className="flex-1 hidden lg:block">
        <div className="sticky top-24 bg-gradient-to-br from-blue-50 via-cyan-50 to-emerald-50 rounded-2xl h-[560px] border border-slate-200/60 shadow-sm overflow-hidden">
          <CookieMonsterCard />
        </div>
      </div>
    </div>
  );
}
