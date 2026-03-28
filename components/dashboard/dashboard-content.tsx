"use client";

import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import type { CleanupPresetId, CookieSummaryReport } from "@/lib/extension-bridge";

interface DashboardContentProps {
  report: CookieSummaryReport;
  onClearReport?: () => void;
  isDevMode?: boolean;
  onExport: () => void;
  onOpenExtension?: () => void;
  onRequestFeed?: (presetId: CleanupPresetId) => Promise<void> | void;
  source: "extension" | "imported";
}

type FilterType = "all" | "recommended" | "high";

export function DashboardContent({
  report,
  onClearReport,
  isDevMode,
  onExport,
  onOpenExtension,
  onRequestFeed,
  source,
}: DashboardContentProps) {
  const generatedDate = new Date(report.generatedAt);
  const [opened, setOpened] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const rows = useMemo(() => {
    const topFeedMap = new Map((report.cleanup?.topFeedDomains || []).map((item) => [item.domain, item]));

    return report.topDomains
      .map((domain) => {
        const feed = topFeedMap.get(domain.domain);
        return {
          domain: domain.domain,
          count: domain.count,
          risk: domain.riskLevel,
          recommended: Boolean(feed && feed.cookieCount > 0),
          analyticsCount: feed?.analyticsCount || 0,
          advertisingCount: feed?.advertisingCount || 0,
          highRiskCount: feed?.highRiskCount || 0,
        };
      })
      .filter((item) => {
        const matchesFilter =
          filter === "all" ||
          (filter === "recommended" && item.recommended) ||
          (filter === "high" && item.risk === "high");

        const matchesQuery =
          query.trim().length === 0 || item.domain.toLowerCase().includes(query.toLowerCase());

        return matchesFilter && matchesQuery;
      });
  }, [filter, query, report.cleanup?.topFeedDomains, report.topDomains]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">单页面 Cookie 工作台</h2>
            <p className="text-sm text-muted-foreground">
              Generated {generatedDate.toLocaleDateString()} at {generatedDate.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {source === "extension" ? "Live extension summary" : "Imported report"}
            </span>
            {isDevMode && (
              <span className="rounded-full bg-risk-medium/10 px-3 py-1 text-xs font-medium text-risk-medium">
                Demo Mode
              </span>
            )}
            {onClearReport && (
              <button
                onClick={onClearReport}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Clear
              </button>
            )}
            {onOpenExtension && (
              <button
                onClick={onOpenExtension}
                className="rounded-lg bg-muted px-4 py-2 text-sm text-foreground hover:bg-muted/80"
              >
                Open Extension
              </button>
            )}
            <button onClick={onExport} className="rounded-lg bg-muted px-4 py-2 text-sm text-foreground hover:bg-muted/80">
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <aside className="rounded-3xl border border-border bg-card p-5">
          <button
            onClick={() => setOpened((value) => !value)}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-muted/60 px-4 py-4 text-left"
          >
            <span className="flex items-center gap-3">
              <span className="text-3xl">🫙</span>
              <span>
                <strong className="block text-foreground">Cookie Jar</strong>
                <small className="text-muted-foreground">点击展开右侧明细</small>
              </span>
            </span>
            <Icon icon={opened ? "mdi:chevron-down" : "mdi:chevron-right"} className="h-5 w-5 text-muted-foreground" />
          </button>

          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <div><strong className="text-foreground">{report.totals.cookies.toLocaleString()}</strong> cookies</div>
            <div><strong className="text-foreground">{report.totals.domains.toLocaleString()}</strong> domains</div>
            <div><strong className="text-foreground">{report.risk.high.toLocaleString()}</strong> high risk</div>
          </div>
        </aside>

        <section className="lg:col-span-2 rounded-3xl border border-border bg-card p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">怪兽卡片容器（网站端预览）</h3>
              <p className="text-sm text-muted-foreground">网站仅显示脱敏汇总；真实删除动作仍由扩展本地确认。</p>
            </div>
            <div className="text-4xl">👾🍪</div>
          </div>

          {opened && (
            <>
              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search domain"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                {[
                  ["all", "All"],
                  ["recommended", "Recommended"],
                  ["high", "High Risk"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as FilterType)}
                    className={`rounded-xl px-3 py-2 text-sm ${filter === key ? "bg-foreground text-background" : "bg-muted text-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
                {rows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No domain matched current filter.
                  </div>
                ) : (
                  rows.map((item) => (
                    <details key={item.domain} className="rounded-2xl border border-border bg-muted/40 px-4 py-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                        <span>
                          <strong className="block text-foreground">{item.domain}</strong>
                          <small className="text-muted-foreground">{item.count.toLocaleString()} cookies</small>
                        </span>
                        <span className="flex items-center gap-2">
                          {item.recommended && (
                            <span className="rounded-full bg-risk-medium/10 px-2 py-1 text-xs font-medium text-risk-medium">Recommend</span>
                          )}
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${item.risk === "high" ? "bg-risk-high/10 text-risk-high" : item.risk === "medium" ? "bg-risk-medium/10 text-risk-medium" : "bg-chart-3/10 text-chart-3"}`}>
                            {item.risk}
                          </span>
                        </span>
                      </summary>

                      <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                        <div>High-risk: <strong className="text-foreground">{item.highRiskCount.toLocaleString()}</strong></div>
                        <div>Analytics: <strong className="text-foreground">{item.analyticsCount.toLocaleString()}</strong></div>
                        <div>Ads: <strong className="text-foreground">{item.advertisingCount.toLocaleString()}</strong></div>
                      </div>
                    </details>
                  ))
                )}
              </div>

              {report.cleanup?.presets?.length ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {report.cleanup.presets.slice(0, 4).map((preset) => (
                    <button
                      key={preset.id}
                      disabled={!onRequestFeed}
                      onClick={() => onRequestFeed?.(preset.id)}
                      className="rounded-xl border border-border bg-background px-3 py-3 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <strong className="block text-foreground">{preset.label}</strong>
                      <span className="text-muted-foreground">{preset.cookieCount.toLocaleString()} cookies · {preset.domainCount.toLocaleString()} domains</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>

      <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
        <Icon icon="mdi:shield-check" className="h-5 w-5 text-chart-3" />
        <span>隐私保证：网站侧只消费脱敏汇总，敏感 Cookie 内容始终在本地扩展处理。</span>
      </div>
    </div>
  );
}
