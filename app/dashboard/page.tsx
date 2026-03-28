"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useExtensionStatus } from "@/hooks/use-extension-status";
import {
  openExtensionDashboard,
  requestCookieFeed,
  requestExportReport,
  type CleanupPresetId,
} from "@/lib/extension-bridge";

const PRESET_LABELS: Array<{ id: CleanupPresetId; title: string; desc: string }> = [
  { id: "balanced", title: "平衡清理", desc: "先删低后悔项" },
  { id: "trackers", title: "追踪器优先", desc: "优先 analytics / ads" },
  { id: "expired", title: "过期碎屑", desc: "清理已过期" },
  { id: "highRisk", title: "高风险", desc: "高风险批次" },
  { id: "longLived", title: "长期留存", desc: "清理长寿命非关键项" },
];

export default function DashboardPage() {
  const { report, isLoading, isInstalled, refresh } = useExtensionStatus();
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const domains = useMemo(() => {
    const source = report?.cleanup?.topFeedDomains || [];
    return source.filter((item) => {
      const riskOk =
        riskFilter === "all" ||
        (riskFilter === "high" && item.highRiskCount > 0) ||
        (riskFilter === "medium" && item.highRiskCount === 0 && item.cookieCount > 3) ||
        (riskFilter === "low" && item.cookieCount <= 3);
      const queryOk = !query || item.domain.toLowerCase().includes(query.toLowerCase());
      return riskOk && queryOk;
    });
  }, [report?.cleanup?.topFeedDomains, query, riskFilter]);

  const runFeedRequest = async (presetId: CleanupPresetId) => {
    setMessage(null);
    setError(null);
    const pending = await requestCookieFeed({ presetId });
    if (!pending) {
      setError("请求失败：请在扩展中先执行扫描。删除仍需在扩展内确认。");
      return;
    }
    setMessage(`已发送到扩展：${pending.label}。请在扩展内本地确认后才会删除。`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary inline-flex items-center justify-center">🍪</span>
            Cookie Monster
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={() => refresh()} className="px-3 py-2 rounded-lg bg-muted text-sm">刷新</button>
            <button onClick={() => openExtensionDashboard()} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm">打开扩展</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {message && <div className="rounded-xl border border-chart-3/30 bg-chart-3/10 px-4 py-3 text-sm">{message}</div>}
        {error && <div className="rounded-xl border border-risk-high/30 bg-risk-high/10 px-4 py-3 text-sm text-risk-high">{error}</div>}

        {!isInstalled && (
          <div className="rounded-2xl border border-risk-medium/30 bg-risk-medium/10 p-4 text-sm">
            未检测到扩展。请先安装扩展后使用单页管理工作台。
          </div>
        )}

        <section className="rounded-3xl border border-border bg-card p-5">
          <h1 className="text-2xl font-semibold">单页面 Cookie 工作台</h1>
          <p className="text-muted-foreground mt-2">
            左侧饼干罐触发展开；右侧巨型卡片展示分组列表、筛选、推荐删除批次。所有敏感 cookie 值都只在本地扩展处理。
          </p>
        </section>

        <section className="grid lg:grid-cols-3 gap-4">
          <aside className="rounded-3xl border border-border bg-card p-4 space-y-4">
            <button
              onClick={() => refresh()}
              className="w-full rounded-2xl border border-primary/30 bg-primary/10 p-4 flex items-center gap-3 text-left"
            >
              <span className="text-4xl">🍯</span>
              <span>
                <strong className="block">点击罐子刷新列表</strong>
                <small className="text-muted-foreground">拉取本地摘要并更新右侧卡片</small>
              </span>
            </button>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-muted p-2"><p className="text-xs text-muted-foreground">Cookies</p><p className="font-semibold">{report?.totals.cookies ?? 0}</p></div>
              <div className="rounded-xl bg-muted p-2"><p className="text-xs text-muted-foreground">Domains</p><p className="font-semibold">{report?.totals.domains ?? 0}</p></div>
              <div className="rounded-xl bg-muted p-2"><p className="text-xs text-muted-foreground">可删候选</p><p className="font-semibold">{report?.cleanup?.totalCandidates ?? 0}</p></div>
            </div>

            <div className="rounded-xl border border-chart-3/30 bg-chart-3/10 p-3 text-xs text-foreground">
              <strong>隐私保证</strong>
              <p className="mt-1 text-muted-foreground">网站仅接收摘要，不接收原始 cookie 值；删除动作只能在扩展中本地确认。</p>
            </div>
          </aside>

          <section className="lg:col-span-2 rounded-3xl border border-border bg-card p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="筛选域名" className="flex-1 min-w-48 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as "all" | "high" | "medium" | "low")} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="all">全部风险</option><option value="high">高风险</option><option value="medium">中风险</option><option value="low">低风险</option>
              </select>
            </div>

            {isLoading ? (
              <div className="py-14 text-center text-muted-foreground">加载中...</div>
            ) : (
              <div className="space-y-2">
                {domains.map((domain) => (
                  <details key={domain.domain} className="rounded-xl border border-border bg-background p-3">
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{domain.domain}</p>
                        <p className="text-xs text-muted-foreground">{domain.cookieCount} cookies · 高风险 {domain.highRiskCount}</p>
                      </div>
                      <Icon icon="mdi:chevron-down" className="w-5 h-5 text-muted-foreground" />
                    </summary>
                    <div className="mt-3 text-sm text-muted-foreground space-y-1">
                      <p>analytics: {domain.analyticsCount} · advertising: {domain.advertisingCount}</p>
                      <p>推荐批次：{domain.samplePresetIds.join(" / ") || "无"}</p>
                    </div>
                  </details>
                ))}
                {!domains.length && <div className="text-sm text-muted-foreground py-8 text-center">暂无匹配域名</div>}
              </div>
            )}

            <div className="pt-2 border-t border-border">
              <p className="text-sm font-medium mb-2">自动推荐可删分组（支持多选）</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {PRESET_LABELS.map((preset) => (
                  <button key={preset.id} onClick={() => runFeedRequest(preset.id)} className="rounded-xl border border-border bg-muted/50 hover:bg-muted p-3 text-left">
                    <p className="font-medium text-sm">{preset.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{preset.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </section>

        <section className="flex justify-end">
          <button onClick={() => requestExportReport()} className="inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
            <Icon icon="mdi:download" className="w-4 h-4" />导出摘要
          </button>
        </section>
      </main>
    </div>
  );
}
