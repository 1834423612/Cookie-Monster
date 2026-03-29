"use client";

import { Icon } from "@iconify/react";
import { StatCard } from "./stat-card";
import { RiskChart } from "./risk-chart";
import { CategoryChart } from "./category-chart";
import { TopDomains } from "./top-domains";
import { FlagsSummary } from "./flags-summary";
import { FeedPresets } from "./feed-presets";
import { MonsterConsole } from "./monster-console";
import type {
  CleanupPresetId,
  CookieDomainCookie,
  CookieManagementState,
  CookieSummaryReport,
} from "@/lib/extension-bridge";

interface DashboardContentProps {
  report: CookieSummaryReport;
  onClearReport?: () => void;
  isDevMode?: boolean;
  onExport: () => void;
  onOpenExtension?: () => void;
  onRequestFeed?: (presetId: CleanupPresetId) => Promise<void> | void;
  management?: CookieManagementState | null;
  domainCookies?: CookieDomainCookie[];
  selectedDomain?: string | null;
  onSelectDomain?: (domain: string) => Promise<void> | void;
  onToggleDomainProtection?: (domain: string, nextValue: boolean) => Promise<void> | void;
  onDeleteDomain?: (domain: string) => Promise<void> | void;
  onDeleteCookies?: (keys: string[]) => Promise<void> | void;
  onRestoreBatch?: (batchId: string) => Promise<void> | void;
  isDomainLoading?: boolean;
  source: "extension" | "imported";
}

export function DashboardContent({
  report,
  onClearReport,
  isDevMode,
  onExport,
  onOpenExtension,
  onRequestFeed,
  management,
  domainCookies,
  selectedDomain,
  onSelectDomain,
  onToggleDomainProtection,
  onDeleteDomain,
  onDeleteCookies,
  onRestoreBatch,
  isDomainLoading,
  source,
}: DashboardContentProps) {
  const generatedDate = new Date(report.generatedAt);
  
  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
            <Icon icon="mdi:cookie-open" className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Monster Feeding Report</h2>
            <p className="text-sm text-slate-500">
              Website-side control shell with extension-powered local cookie execution.
              Updated {generatedDate.toLocaleDateString()} at {generatedDate.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-medium">
            {source === "extension" ? "Live extension summary" : "Imported report"}
          </span>
          {isDevMode && (
            <span className="text-xs bg-amber-100 text-amber-600 px-3 py-1 rounded-full font-medium">
              Demo Mode
            </span>
          )}
          {onClearReport && (
            <button
              onClick={onClearReport}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Icon icon="mdi:close" className="w-4 h-4" />
              Clear
            </button>
          )}
          {onOpenExtension && (
            <button
              onClick={onOpenExtension}
              className="inline-flex items-center gap-2 text-sm bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Icon icon="mdi:puzzle" className="w-4 h-4" />
              Open Extension
            </button>
          )}
          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 text-sm bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <Icon icon="mdi:download" className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cookies"
          value={report.totals.cookies}
          icon="mdi:cookie"
          iconColor="text-primary"
          subtitle={`Across ${report.totals.domains} domains`}
        />
        <StatCard
          title="High Risk"
          value={report.risk.high}
          icon="mdi:alert-circle"
          iconColor="text-risk-high"
          subtitle="Require attention"
        />
        <StatCard
          title="Medium Risk"
          value={report.risk.medium}
          icon="mdi:alert"
          iconColor="text-risk-medium"
          subtitle="Monitor these"
        />
        <StatCard
          title="Low Risk"
          value={report.risk.low}
          icon="mdi:check-circle"
          iconColor="text-chart-3"
          subtitle="Safe cookies"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskChart data={report.risk} />
        <CategoryChart data={report.categories} />
      </div>

      {/* Details row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopDomains domains={report.topDomains} />
        <FlagsSummary flags={report.flags} total={report.totals.cookies} />
      </div>

      {report.cleanup && (
        <FeedPresets
          cleanup={report.cleanup}
          onRequestFeed={source === "extension" ? onRequestFeed : undefined}
          disabled={source !== "extension"}
        />
      )}

      {source === "extension" &&
        management &&
        domainCookies &&
        onSelectDomain &&
        onToggleDomainProtection &&
        onDeleteDomain &&
        onDeleteCookies &&
        onRestoreBatch && (
          <MonsterConsole
            management={management}
            domainCookies={domainCookies}
            selectedDomain={selectedDomain || null}
            onSelectDomain={onSelectDomain}
            onToggleDomainProtection={onToggleDomainProtection}
            onDeleteDomain={onDeleteDomain}
            onDeleteCookies={onDeleteCookies}
            onRestoreBatch={onRestoreBatch}
            onRequestFeed={onRequestFeed}
            isDomainLoading={isDomainLoading}
          />
        )}

      {/* Expiry overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Expiry Overview
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Expired", value: report.expiry.expired, color: "text-red-600", bg: "bg-red-50 border-red-100" },
            { label: "24 Hours", value: report.expiry.expiringWithin24h, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
            { label: "This Week", value: report.expiry.expiringWithinWeek, color: "text-amber-500", bg: "bg-amber-50/50 border-amber-100" },
            { label: "This Month", value: report.expiry.expiringWithinMonth, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
            { label: "Long-lived", value: report.expiry.longLived, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          ].map((item) => (
            <div key={item.label} className={`text-center p-4 rounded-xl border ${item.bg}`}>
              <p className={`text-2xl font-bold ${item.color}`}>
                {item.value.toLocaleString()}
              </p>
              <p className="text-sm text-slate-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy footer */}
      <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-4">
        <Icon icon="mdi:shield-check" className="w-5 h-5 text-emerald-500" />
        <span>
          All data shown above stays local to the browser. Raw cookie details only move from the extension to this page through local extension messaging.
        </span>
      </div>
    </div>
  );
}
