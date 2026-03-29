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

// Cookie icon URLs based on severity (placeholder images for now)
const cookieIcons = {
  high: "https://placehold.co/40x40/EF4444/FFFFFF?text=H",
  medium: "https://placehold.co/40x40/F59E0B/FFFFFF?text=M", 
  low: "https://placehold.co/40x40/10B981/FFFFFF?text=L",
};

const riskConfig = {
  high: {
    label: "High Risk",
    color: "text-[#EF4444]",
    bg: "bg-[#FEF2F2]",
    badge: "bg-[#EF4444] text-white",
  },
  medium: {
    label: "Medium",
    color: "text-[#F59E0B]",
    bg: "bg-[#FFFBEB]",
    badge: "bg-[#F59E0B] text-white",
  },
  low: {
    label: "Low",
    color: "text-[#10B981]",
    bg: "bg-[#ECFDF5]",
    badge: "bg-[#10B981] text-white",
  },
};

// Domain row component - ClickUp style
function DomainRow({ 
  domain, 
  onCookieDelete,
  expanded,
  onToggle 
}: { 
  domain: DomainData; 
  onCookieDelete?: (cookieName: string) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const risk = riskConfig[domain.riskLevel];
  
  return (
    <div className={cn(
      "border-b border-[#E8EAED] last:border-b-0",
      expanded && "bg-[#F8FAFC]"
    )}>
      {/* Domain row - clickable */}
      <button
        onClick={onToggle}
        className={cn(
          "cookie-row w-full flex items-center gap-4 px-4 py-3 text-left transition-colors",
          "hover:bg-[#F9FAFB]"
        )}
      >
        {/* Expand arrow */}
        <Icon 
          icon="mdi:chevron-right" 
          className={cn(
            "w-5 h-5 text-[#9CA3AF] transition-transform duration-200 shrink-0",
            expanded && "rotate-90"
          )} 
        />
        
        {/* Cookie icon - placeholder image based on risk */}
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm">
          <Image
            src={cookieIcons[domain.riskLevel]}
            alt={`${domain.riskLevel} risk cookie`}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Domain name */}
        <div className="flex-1 min-w-0">
          <span className="font-medium text-[#1F2937] truncate block">
            {domain.domain}
          </span>
        </div>
        
        {/* Cookie count */}
        <div className="flex items-center gap-1.5 text-[#6B7280] shrink-0">
          <Icon icon="mdi:cookie" className="w-4 h-4" />
          <span className="text-sm font-medium">{domain.cookieCount}</span>
        </div>
        
        {/* Risk badge */}
        <div className={cn(
          "px-2.5 py-1 rounded-md text-xs font-semibold shrink-0",
          risk.badge
        )}>
          {risk.label}
        </div>
        
        {/* Priority flag placeholder */}
        <Icon icon="mdi:flag-outline" className="w-4 h-4 text-[#D1D5DB] shrink-0" />
      </button>
      
      {/* Expanded cookie list */}
      {expanded && domain.cookies && domain.cookies.length > 0 && (
        <div className="animate-expand overflow-hidden">
          <div className="pl-14 pr-4 pb-3 space-y-1">
            {domain.cookies.map((cookie, idx) => {
              const cookieRisk = riskConfig[cookie.risk];
              return (
                <div 
                  key={idx}
                  className={cn(
                    "cookie-row flex items-center gap-4 px-4 py-2.5 rounded-lg",
                    "hover:bg-white transition-colors border border-transparent hover:border-[#E8EAED]"
                  )}
                >
                  {/* Nested indicator */}
                  <div className="w-5 flex justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]" />
                  </div>
                  
                  {/* Cookie mini icon */}
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                    <Image
                      src={cookieIcons[cookie.risk]}
                      alt={`${cookie.risk} risk`}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Cookie name and value */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-[#1F2937] truncate">
                        {cookie.name}
                      </span>
                      {/* Flags as small tags */}
                      <div className="flex items-center gap-1">
                        {cookie.httpOnly && (
                          <span className="px-1.5 py-0.5 bg-[#EBF5FF] text-[#3B82F6] text-[10px] font-medium rounded">
                            HTTP
                          </span>
                        )}
                        {cookie.secure && (
                          <span className="px-1.5 py-0.5 bg-[#ECFDF5] text-[#10B981] text-[10px] font-medium rounded">
                            SEC
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-[#9CA3AF] truncate mt-0.5">
                      {cookie.value.length > 40 ? cookie.value.slice(0, 40) + "..." : cookie.value}
                    </p>
                  </div>
                  
                  {/* Expiry date */}
                  <div className="text-xs text-[#6B7280] shrink-0 min-w-[80px]">
                    {cookie.expires || "Session"}
                  </div>
                  
                  {/* SameSite */}
                  <div className="text-xs text-[#9CA3AF] shrink-0 min-w-[60px]">
                    {cookie.sameSite}
                  </div>
                  
                  {/* Risk indicator */}
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    cookie.risk === "high" && "bg-[#EF4444]",
                    cookie.risk === "medium" && "bg-[#F59E0B]",
                    cookie.risk === "low" && "bg-[#10B981]"
                  )} />
                  
                  {/* Delete action */}
                  {onCookieDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCookieDelete(cookie.name);
                      }}
                      className="p-1.5 rounded-md hover:bg-[#FEF2F2] transition-colors group shrink-0"
                    >
                      <Icon 
                        icon="mdi:trash-can-outline" 
                        className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#EF4444]" 
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
        <div className="animate-expand overflow-hidden">
          <div className="pl-14 pr-4 pb-3">
            <div className="flex items-center gap-2 px-4 py-3 text-[#9CA3AF]">
              <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading cookies...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Cookie Monster mascot - simplified and cleaner
function CookieMonsterMascot() {
  return (
    <div className="relative flex flex-col items-center justify-center h-full py-8">
      {/* Floating cookies decoration */}
      <div className="absolute top-8 left-8 animate-float-gentle">
        <div className="w-6 h-6 rounded-full bg-[#FFB347] shadow-md" />
      </div>
      <div className="absolute top-20 right-6 animate-float-gentle" style={{ animationDelay: "0.5s" }}>
        <div className="w-5 h-5 rounded-full bg-[#4F8EF7] shadow-md" />
      </div>
      <div className="absolute bottom-24 left-12 animate-float-gentle" style={{ animationDelay: "1s" }}>
        <div className="w-4 h-4 rounded-full bg-[#10B981] shadow-md" />
      </div>
      
      {/* Monster container */}
      <div className="animate-monster-bounce">
        {/* Monster body */}
        <div className="relative">
          {/* Main body */}
          <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[#4FACFE] to-[#00C9FF] shadow-xl relative">
            {/* Fur texture spots */}
            <div className="absolute inset-2 rounded-full opacity-20">
              <div className="absolute top-2 left-4 w-4 h-2 bg-white rounded-full transform -rotate-12" />
              <div className="absolute top-8 right-4 w-3 h-2 bg-white rounded-full transform rotate-12" />
              <div className="absolute bottom-10 left-6 w-4 h-2 bg-white rounded-full" />
              <div className="absolute bottom-4 right-8 w-3 h-2 bg-white rounded-full transform rotate-6" />
            </div>
            
            {/* Eyes */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-3">
              {/* Left eye */}
              <div className="w-10 h-12 bg-white rounded-full shadow-inner flex items-start justify-center pt-2">
                <div className="w-4 h-4 bg-[#1a1a2e] rounded-full relative">
                  <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              </div>
              {/* Right eye */}
              <div className="w-10 h-12 bg-white rounded-full shadow-inner flex items-start justify-center pt-2">
                <div className="w-4 h-4 bg-[#1a1a2e] rounded-full relative">
                  <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              </div>
            </div>
            
            {/* Nose */}
            <div className="absolute top-[52px] left-1/2 -translate-x-1/2 w-4 h-3 bg-[#0284C7] rounded-full" />
            
            {/* Mouth */}
            <div className="absolute top-[65px] left-1/2 -translate-x-1/2 w-16 h-10 bg-[#DC2626] rounded-b-[40px] rounded-t-md overflow-hidden">
              <div className="absolute top-0 left-0 right-0 flex justify-center gap-0.5">
                <div className="w-2.5 h-2 bg-white rounded-b" />
                <div className="w-2.5 h-2 bg-white rounded-b" />
                <div className="w-2.5 h-2 bg-white rounded-b" />
              </div>
            </div>
          </div>
          
          {/* Arms */}
          <div className="absolute -left-4 top-16 w-8 h-12 bg-gradient-to-br from-[#4FACFE] to-[#00C9FF] rounded-full transform -rotate-12 shadow-lg" />
          <div className="absolute -right-4 top-16 w-8 h-12 bg-gradient-to-br from-[#4FACFE] to-[#00C9FF] rounded-full transform rotate-12 shadow-lg animate-monster-wave" />
          
          {/* Cookie in hand */}
          <div className="absolute -right-2 top-24 animate-cookie-float">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFB347] to-[#D97706] shadow-lg flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#78350F]" />
              <div className="absolute top-1 right-2 w-1 h-1 rounded-full bg-[#78350F]" />
              <div className="absolute bottom-1.5 left-1.5 w-1 h-1 rounded-full bg-[#78350F]" />
            </div>
          </div>
          
          {/* Feet */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-4">
            <div className="w-8 h-4 bg-[#0284C7] rounded-full shadow-md" />
            <div className="w-8 h-4 bg-[#0284C7] rounded-full shadow-md" />
          </div>
        </div>
      </div>
      
      {/* Speech bubble */}
      <div className="mt-6 bg-white rounded-2xl px-5 py-3 shadow-lg border border-[#E8EAED] relative">
        <p className="text-sm font-semibold text-[#1F2937]">Me love cookies!</p>
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-[#E8EAED] transform rotate-45" />
      </div>
      
      {/* Stats under monster */}
      <div className="mt-8 text-center">
        <p className="text-xs text-[#9CA3AF] uppercase tracking-wider font-medium">Cookie Status</p>
        <p className="text-2xl font-bold text-[#1F2937] mt-1">All Safe</p>
      </div>
    </div>
  );
}

export function CookieDomainList({ 
  domains, 
  onDomainSelect, 
  onCookieDelete,
  isLoading 
}: CookieDomainListProps) {
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  
  const filteredDomains = filter === "all" 
    ? domains 
    : domains.filter(d => d.riskLevel === filter);
  
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
    high: domains.filter(d => d.riskLevel === "high").length,
    medium: domains.filter(d => d.riskLevel === "medium").length,
    low: domains.filter(d => d.riskLevel === "low").length,
  };
  
  return (
    <div className="flex gap-8 min-h-[600px]">
      {/* Left side - Domain list (2/3) */}
      <div className="flex-[2] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#1F2937]">Cookie Jar</h2>
            <p className="text-sm text-[#6B7280] mt-0.5">
              {domains.length} domains detected
            </p>
          </div>
          
          {/* Search placeholder */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E8EAED] rounded-lg w-64">
            <Icon icon="mdi:magnify" className="w-4 h-4 text-[#9CA3AF]" />
            <input 
              type="text"
              placeholder="Search domains..."
              className="flex-1 text-sm bg-transparent outline-none text-[#1F2937] placeholder:text-[#9CA3AF]"
            />
          </div>
        </div>
        
        {/* Filter tabs - ClickUp style */}
        <div className="flex items-center gap-1 mb-4 border-b border-[#E8EAED]">
          {(["all", "high", "medium", "low"] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors relative",
                filter === level
                  ? "text-[#4F8EF7]"
                  : "text-[#6B7280] hover:text-[#1F2937]"
              )}
            >
              <span className="flex items-center gap-2">
                {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1)}
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-xs",
                  filter === level 
                    ? "bg-[#EBF5FF] text-[#4F8EF7]" 
                    : "bg-[#F3F4F6] text-[#6B7280]"
                )}>
                  {counts[level]}
                </span>
              </span>
              {filter === level && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F8EF7]" />
              )}
            </button>
          ))}
        </div>
        
        {/* Column headers - ClickUp style */}
        <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-[#6B7280] uppercase tracking-wider border-b border-[#E8EAED] bg-[#F9FAFB]">
          <div className="w-5" /> {/* Arrow space */}
          <div className="w-10" /> {/* Icon space */}
          <div className="flex-1">Domain</div>
          <div className="w-16 text-center">Cookies</div>
          <div className="w-24 text-center">Risk Level</div>
          <div className="w-4" /> {/* Flag space */}
        </div>
        
        {/* Domain list */}
        <div className="flex-1 bg-white rounded-lg border border-[#E8EAED] overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Icon icon="mdi:loading" className="w-8 h-8 text-[#4F8EF7] animate-spin" />
            </div>
          ) : filteredDomains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[#F3F4F6] flex items-center justify-center mb-4">
                <Icon icon="mdi:cookie-off-outline" className="w-8 h-8 text-[#9CA3AF]" />
              </div>
              <p className="text-[#6B7280] font-medium">No cookies found</p>
              <p className="text-sm text-[#9CA3AF] mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            filteredDomains.map((domain) => (
              <DomainRow
                key={domain.domain}
                domain={domain}
                expanded={expandedDomain === domain.domain}
                onToggle={() => handleToggle(domain.domain)}
                onCookieDelete={onCookieDelete ? (name) => onCookieDelete(domain.domain, name) : undefined}
              />
            ))
          )}
        </div>
      </div>
      
      {/* Right side - Cookie Monster (1/3) */}
      <div className="flex-1 hidden lg:block">
        <div className="sticky top-24 bg-gradient-to-br from-[#F0F9FF] to-[#E0F2FE] rounded-2xl h-[580px] border border-[#BAE6FD]">
          <CookieMonsterMascot />
        </div>
      </div>
    </div>
  );
}
