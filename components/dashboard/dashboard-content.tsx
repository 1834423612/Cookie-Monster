"use client";

import { Icon } from "@iconify/react";
import { StatCard } from "./stat-card";
import { RiskChart } from "./risk-chart";
import { CategoryChart } from "./category-chart";
import { TopDomains } from "./top-domains";
import { FlagsSummary } from "./flags-summary";
import type { CookieSummaryReport } from "@/lib/extension-bridge";

interface DashboardContentProps {
  report: CookieSummaryReport;
  onClearReport?: () => void;
  isDevMode?: boolean;
  onExport: () => void;
  onOpenExtension?: () => void;
  source: "extension" | "imported";
}

export function DashboardContent({
  report,
  onClearReport,
  isDevMode,
  onExport,
  onOpenExtension,
  source,
}: DashboardContentProps) {
  const generatedDate = new Date(report.generatedAt);
  
  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon icon="mdi:chart-box" className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Cookie Analysis Report</h2>
            <p className="text-sm text-muted-foreground">
              Generated {generatedDate.toLocaleDateString()} at{" "}
              {generatedDate.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full font-medium">
            {source === "extension" ? "Live extension summary" : "Imported report"}
          </span>
          {isDevMode && (
            <span className="text-xs bg-risk-medium/10 text-risk-medium px-3 py-1 rounded-full font-medium">
              Demo Mode
            </span>
          )}
          {onClearReport && (
            <button
              onClick={onClearReport}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <Icon icon="mdi:close" className="w-4 h-4" />
              Clear
            </button>
          )}
          {onOpenExtension && (
            <button
              onClick={onOpenExtension}
              className="inline-flex items-center gap-2 text-sm bg-muted text-foreground px-4 py-2 rounded-lg hover:bg-muted/80 transition-colors"
            >
              <Icon icon="mdi:puzzle" className="w-4 h-4" />
              Open Extension
            </button>
          )}
          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 text-sm bg-muted text-foreground px-4 py-2 rounded-lg hover:bg-muted/80 transition-colors"
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

      {/* Expiry overview */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Expiry Overview
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Expired", value: report.expiry.expired, color: "text-risk-high" },
            { label: "24 Hours", value: report.expiry.expiringWithin24h, color: "text-risk-medium" },
            { label: "This Week", value: report.expiry.expiringWithinWeek, color: "text-risk-medium" },
            { label: "This Month", value: report.expiry.expiringWithinMonth, color: "text-muted-foreground" },
            { label: "Long-lived", value: report.expiry.longLived, color: "text-chart-3" },
          ].map((item) => (
            <div key={item.label} className="text-center p-4 rounded-xl bg-muted/50">
              <p className={`text-2xl font-bold ${item.color}`}>
                {item.value.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy footer */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
        <Icon icon="mdi:shield-check" className="w-5 h-5 text-chart-3" />
        <span>
          All data shown above is processed locally. Sensitive cookie values stay inside the extension.
        </span>
      </div>
    </div>
  );
}
