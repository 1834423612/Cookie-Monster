"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

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

const riskConfig = {
  high: {
    color: "text-risk-high",
    bg: "bg-risk-high/10",
    border: "border-risk-high/20",
    dot: "bg-risk-high",
    label: "High",
  },
  medium: {
    color: "text-risk-medium",
    bg: "bg-risk-medium/10",
    border: "border-risk-medium/20",
    dot: "bg-risk-medium",
    label: "Medium",
  },
  low: {
    color: "text-risk-low",
    bg: "bg-risk-low/10",
    border: "border-risk-low/20",
    dot: "bg-risk-low",
    label: "Low",
  },
};

// Cookie icon SVG component
function CookieIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.9" />
      <circle cx="8" cy="8" r="1.5" fill="#5C4033" />
      <circle cx="14" cy="7" r="1.2" fill="#5C4033" />
      <circle cx="16" cy="12" r="1.4" fill="#5C4033" />
      <circle cx="10" cy="14" r="1.3" fill="#5C4033" />
      <circle cx="6" cy="12" r="1.1" fill="#5C4033" />
      <circle cx="13" cy="16" r="1.2" fill="#5C4033" />
    </svg>
  );
}

// Domain card with expandable cookies
function DomainCard({ 
  domain, 
  onSelect, 
  onCookieDelete,
  expanded,
  onToggle 
}: { 
  domain: DomainData; 
  onSelect?: () => void;
  onCookieDelete?: (cookieName: string) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const risk = riskConfig[domain.riskLevel];
  
  return (
    <div 
      className={cn(
        "rounded-2xl border transition-all duration-200",
        expanded 
          ? "bg-card border-primary/30 shadow-lg shadow-primary/5" 
          : "bg-card border-border hover:border-primary/20 hover:shadow-md"
      )}
    >
      {/* Domain header - clickable to expand */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {/* Cookie icon */}
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          "bg-gradient-to-br from-primary/20 to-secondary/20"
        )}>
          <CookieIcon className="w-6 h-6 text-primary" />
        </div>
        
        {/* Domain info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {domain.domain}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-muted-foreground">
              {domain.cookieCount} cookies
            </span>
          </div>
        </div>
        
        {/* Risk badge */}
        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0",
          risk.bg, risk.color
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", risk.dot)} />
          {risk.label}
        </div>
        
        {/* Expand chevron */}
        <Icon 
          icon="mdi:chevron-down" 
          className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )} 
        />
      </button>
      
      {/* Expanded cookie list */}
      {expanded && domain.cookies && domain.cookies.length > 0 && (
        <div className="px-4 pb-4 border-t border-border/50">
          <div className="mt-3 space-y-2">
            {domain.cookies.map((cookie, idx) => {
              const cookieRisk = riskConfig[cookie.risk];
              return (
                <div 
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  {/* Cookie mini icon */}
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon icon="mdi:cookie-outline" className="w-4 h-4 text-primary" />
                  </div>
                  
                  {/* Cookie details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-foreground truncate">
                        {cookie.name}
                      </p>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        cookieRisk.dot
                      )} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {cookie.value.length > 30 ? cookie.value.slice(0, 30) + "..." : cookie.value}
                    </p>
                    
                    {/* Cookie flags */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {cookie.httpOnly && (
                        <span className="px-2 py-0.5 rounded-full bg-chart-5/10 text-chart-5 text-[10px] font-medium">
                          HttpOnly
                        </span>
                      )}
                      {cookie.secure && (
                        <span className="px-2 py-0.5 rounded-full bg-chart-3/10 text-chart-3 text-[10px] font-medium">
                          Secure
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
                        {cookie.sameSite}
                      </span>
                      {cookie.expires && (
                        <span className="px-2 py-0.5 rounded-full bg-secondary/20 text-secondary-foreground text-[10px] font-medium">
                          {cookie.expires}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Delete button */}
                  {onCookieDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCookieDelete(cookie.name);
                      }}
                      className="w-8 h-8 rounded-lg hover:bg-risk-high/10 flex items-center justify-center shrink-0 transition-colors group"
                    >
                      <Icon 
                        icon="mdi:delete-outline" 
                        className="w-4 h-4 text-muted-foreground group-hover:text-risk-high transition-colors" 
                      />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Empty state for expanded without cookies */}
      {expanded && (!domain.cookies || domain.cookies.length === 0) && (
        <div className="px-4 pb-4 border-t border-border/50">
          <div className="mt-3 p-4 rounded-xl bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground">
              Loading cookie details...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Cookie Monster mascot component
function CookieMonsterMascot() {
  return (
    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center">
      {/* Background decorative cookies */}
      <div className="absolute top-4 left-4 animate-cookie-float" style={{ animationDelay: "0s" }}>
        <CookieIcon className="w-8 h-8 text-secondary/60" />
      </div>
      <div className="absolute top-16 right-8 animate-cookie-float" style={{ animationDelay: "0.5s" }}>
        <CookieIcon className="w-6 h-6 text-primary/50" />
      </div>
      <div className="absolute bottom-20 left-8 animate-cookie-float" style={{ animationDelay: "1s" }}>
        <CookieIcon className="w-7 h-7 text-secondary/50" />
      </div>
      
      {/* Monster body */}
      <div className="animate-monster-bounce">
        <div className="relative">
          {/* Body - fluffy blue circle */}
          <div className="w-48 h-48 rounded-full bg-[#1e88e5] shadow-xl relative overflow-hidden">
            {/* Fur texture */}
            <div className="absolute inset-0 opacity-30">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-6 h-3 bg-[#42a5f5] rounded-full"
                  style={{
                    left: `${(i * 17) % 100}%`,
                    top: `${(i * 23) % 100}%`,
                    transform: `rotate(${i * 37}deg)`,
                  }}
                />
              ))}
            </div>
            
            {/* Eyes container */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-4">
              {/* Left eye */}
              <div className="animate-monster-eyes">
                <div className="w-12 h-14 bg-white rounded-full relative shadow-inner">
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-5 h-5 bg-black rounded-full">
                    <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
              </div>
              {/* Right eye */}
              <div className="animate-monster-eyes" style={{ animationDelay: "0.1s" }}>
                <div className="w-12 h-14 bg-white rounded-full relative shadow-inner">
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-5 h-5 bg-black rounded-full">
                    <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Nose */}
            <div className="absolute top-[70px] left-1/2 -translate-x-1/2 w-6 h-4 bg-[#0d47a1] rounded-full" />
            
            {/* Mouth - big cookie-eating mouth */}
            <div className="absolute top-[85px] left-1/2 -translate-x-1/2 w-24 h-16 bg-[#c62828] rounded-b-[60px] rounded-t-lg overflow-hidden">
              {/* Teeth */}
              <div className="absolute top-0 left-0 right-0 flex justify-center gap-1">
                <div className="w-4 h-3 bg-white rounded-b-lg" />
                <div className="w-4 h-3 bg-white rounded-b-lg" />
                <div className="w-4 h-3 bg-white rounded-b-lg" />
              </div>
              {/* Tongue */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-6 bg-[#e57373] rounded-full" />
            </div>
          </div>
          
          {/* Arms */}
          <div className="absolute -left-6 top-20 w-10 h-16 bg-[#1e88e5] rounded-full transform -rotate-12 shadow-lg" />
          <div className="absolute -right-6 top-20 w-10 h-16 bg-[#1e88e5] rounded-full transform rotate-12 shadow-lg" />
          
          {/* Cookie in hand */}
          <div className="absolute -right-2 top-28 animate-cookie-float" style={{ animationDelay: "0.3s" }}>
            <CookieIcon className="w-10 h-10 text-primary drop-shadow-lg" />
          </div>
          
          {/* Crumbs falling */}
          <div className="absolute right-0 top-36 space-y-2">
            <div className="animate-crumb-fall" style={{ animationDelay: "0s" }}>
              <div className="w-2 h-2 rounded-full bg-primary/70" />
            </div>
            <div className="animate-crumb-fall" style={{ animationDelay: "0.3s" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-secondary/70 ml-2" />
            </div>
            <div className="animate-crumb-fall" style={{ animationDelay: "0.6s" }}>
              <div className="w-2 h-2 rounded-full bg-primary/60 ml-1" />
            </div>
          </div>
          
          {/* Legs/Feet */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-6">
            <div className="w-10 h-6 bg-[#1565c0] rounded-full shadow-md" />
            <div className="w-10 h-6 bg-[#1565c0] rounded-full shadow-md" />
          </div>
        </div>
      </div>
      
      {/* Speech bubble */}
      <div className="absolute -top-2 right-0 bg-white rounded-2xl px-4 py-2 shadow-lg border border-border">
        <p className="text-sm font-medium text-foreground">Me love cookies!</p>
        <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white border-l border-b border-border transform rotate-45" />
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
  
  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Left side - Domain list (2/3) */}
      <div className="flex-[2] space-y-4">
        {/* Header with filters */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-foreground">Cookie Jar</h2>
            <p className="text-sm text-muted-foreground">
              {domains.length} domains with cookies
            </p>
          </div>
          
          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
            {(["all", "high", "medium", "low"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  filter === level
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Domain cards list */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Icon icon="mdi:loading" className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredDomains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon icon="mdi:cookie-off" className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No cookies found</p>
            </div>
          ) : (
            filteredDomains.map((domain) => (
              <DomainCard
                key={domain.domain}
                domain={domain}
                expanded={expandedDomain === domain.domain}
                onToggle={() => handleToggle(domain.domain)}
                onSelect={() => onDomainSelect?.(domain.domain)}
                onCookieDelete={onCookieDelete ? (name) => onCookieDelete(domain.domain, name) : undefined}
              />
            ))
          )}
        </div>
      </div>
      
      {/* Right side - Cookie Monster (1/3) */}
      <div className="flex-1 hidden lg:block sticky top-24">
        <div className="bg-gradient-to-br from-muted/50 to-secondary/10 rounded-3xl p-6 h-full min-h-[500px]">
          <CookieMonsterMascot />
        </div>
      </div>
    </div>
  );
}
