"use client";

import { Icon } from "@iconify/react";
import { useMemo, useState } from "react";
import type {
  CleanupPresetId,
  CookieDomainCookie,
  CookieManagementState,
} from "@/lib/extension-bridge";

interface MonsterConsoleProps {
  management: CookieManagementState;
  domainCookies: CookieDomainCookie[];
  selectedDomain: string | null;
  onSelectDomain: (domain: string) => Promise<void> | void;
  onToggleDomainProtection: (domain: string, nextValue: boolean) => Promise<void> | void;
  onDeleteDomain: (domain: string) => Promise<void> | void;
  onDeleteCookies: (keys: string[]) => Promise<void> | void;
  onRestoreBatch: (batchId: string) => Promise<void> | void;
  onRequestFeed?: (presetId: CleanupPresetId) => Promise<void> | void;
  isDomainLoading?: boolean;
}

const riskClassNames: Record<string, string> = {
  high: "bg-risk-high/10 text-risk-high border-risk-high/20",
  medium: "bg-risk-medium/10 text-risk-medium border-risk-medium/20",
  low: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

export function MonsterConsole({
  management,
  domainCookies,
  selectedDomain,
  onSelectDomain,
  onToggleDomainProtection,
  onDeleteDomain,
  onDeleteCookies,
  onRestoreBatch,
  onRequestFeed,
  isDomainLoading,
}: MonsterConsoleProps) {
  const [domainQuery, setDomainQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const filteredDomains = useMemo(() => {
    const query = domainQuery.trim().toLowerCase();
    if (!query) {
      return management.domains;
    }

    return management.domains.filter((domain) =>
      domain.domain.toLowerCase().includes(query)
    );
  }, [domainQuery, management.domains]);

  const selectedDomainEntry =
    management.domains.find((domain) => domain.domain === selectedDomain) || null;

  const selectedKeySet = new Set(selectedKeys);
  const allVisibleSelected =
    domainCookies.length > 0 && domainCookies.every((cookie) => selectedKeySet.has(cookie.key));

  const feedButtons = management.domains.length
    ? management.domains
        .slice(0, 3)
        .flatMap((domain) => domain.samplePresetIds)
        .filter((presetId, index, array) => array.indexOf(presetId) === index)
        .slice(0, 3)
    : [];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(30,111,217,0.12),rgba(183,121,31,0.14),rgba(255,255,255,0.9))] p-6">
        <div className="absolute right-6 top-6 hidden lg:block">
          <div className="relative h-40 w-40">
            <div className="absolute inset-0 rounded-full bg-foreground shadow-[0_30px_80px_rgba(47,39,28,0.18)]" />
            <div className="absolute left-7 top-10 h-4 w-4 rounded-full bg-background" />
            <div className="absolute right-7 top-10 h-4 w-4 rounded-full bg-background" />
            <div className="absolute left-6 right-6 top-20 h-12 rounded-b-[999px] rounded-t-[16px] bg-risk-high/90" />
            <div className="absolute bottom-7 left-1/2 h-10 w-16 -translate-x-1/2 rounded-b-[999px] rounded-t-[12px] bg-background/90" />
          </div>
        </div>

        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm text-foreground mb-4">
            <Icon icon="mdi:cookie-open" className="h-4 w-4 text-primary" />
            <span>Website Mission Control</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground text-balance">
            Feed the monster from the website, let the extension handle the dangerous chewing.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Pick a cleanup batch, inspect cookie-by-cookie details, protect trusted domains,
            and restore anything the monster ate by mistake. The website drives the flow;
            the extension only performs local cookie access and writes.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Domains
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {management.domains.length.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Protected
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {management.protectedDomains.length.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Recycle Bin
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {management.recycleBin.length.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Pending
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {management.pendingFeedRequest ? "1" : "0"}
              </p>
            </div>
          </div>

          {management.pendingFeedRequest && (
            <div className="mt-6 rounded-2xl border border-white/70 bg-white/80 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Pending feed request: {management.pendingFeedRequest.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {management.pendingFeedRequest.cookieCount.toLocaleString()} cookies across{" "}
                    {management.pendingFeedRequest.domainCount.toLocaleString()} domains are waiting for extension confirmation.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {management.pendingFeedRequest.sampleDomains.map((domain) => (
                    <span
                      key={domain}
                      className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground"
                    >
                      {domain}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {feedButtons.length > 0 && onRequestFeed && (
            <div className="mt-6 flex flex-wrap gap-3">
              {feedButtons.map((presetId) => (
                <button
                  key={presetId}
                  onClick={() => onRequestFeed(presetId)}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity"
                >
                  <Icon icon="mdi:cookie-outline" className="h-4 w-4" />
                  Feed {presetId}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Domain Stash</h3>
                <p className="text-sm text-muted-foreground">
                  Pick a website to inspect its cookies and feed controls.
                </p>
              </div>
            </div>
            <div className="relative mb-4">
              <Icon
                icon="mdi:magnify"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={domainQuery}
                onChange={(event) => setDomainQuery(event.target.value)}
                placeholder="Search a domain"
                className="w-full rounded-xl border border-border bg-background px-10 py-2.5 text-sm text-foreground outline-none ring-0"
              />
            </div>
            <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
              {filteredDomains.map((domain) => {
                const isSelected = domain.domain === selectedDomain;

                return (
                  <button
                    key={domain.domain}
                    onClick={() => {
                      setSelectedKeys([]);
                      onSelectDomain(domain.domain);
                    }}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{domain.domain}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {domain.cookieCount.toLocaleString()} cookies,{" "}
                          {domain.feedableCount.toLocaleString()} feedable
                        </p>
                      </div>
                      {domain.protected && (
                        <span className="rounded-full border border-chart-3/20 bg-chart-3/10 px-2 py-0.5 text-[11px] font-medium text-chart-3">
                          Protected
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-semibold text-foreground mb-3">Recycle Bin History</h3>
            <div className="space-y-3">
              {management.recycleBin.map((batch) => (
                <div
                  key={batch.id}
                  className="rounded-2xl border border-border bg-background/70 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{batch.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(batch.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => onRestoreBatch(batch.id)}
                      className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
                    >
                      Restore
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {batch.cookieCount.toLocaleString()} cookies from{" "}
                    {batch.domainCount.toLocaleString()} domains
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {batch.sampleDomains.map((domain) => (
                      <span
                        key={domain}
                        className="rounded-full border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {management.recycleBin.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
                  The monster hasn&apos;t eaten anything yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {selectedDomainEntry ? (
            <>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      {selectedDomainEntry.domain}
                    </h3>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                        selectedDomainEntry.protected
                          ? "border-chart-3/20 bg-chart-3/10 text-chart-3"
                          : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {selectedDomainEntry.protected ? "Protected" : "Vulnerable"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedDomainEntry.cookieCount.toLocaleString()} cookies total,{" "}
                    {selectedDomainEntry.feedableCount.toLocaleString()} currently feedable.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      onToggleDomainProtection(
                        selectedDomainEntry.domain,
                        !selectedDomainEntry.protected
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
                  >
                    <Icon
                      icon={
                        selectedDomainEntry.protected
                          ? "mdi:shield-off-outline"
                          : "mdi:shield-check-outline"
                      }
                      className="h-4 w-4"
                    />
                    {selectedDomainEntry.protected ? "Unprotect" : "Protect"}
                  </button>
                  <button
                    onClick={() => onDeleteDomain(selectedDomainEntry.domain)}
                    disabled={selectedDomainEntry.protected}
                    className="inline-flex items-center gap-2 rounded-xl bg-risk-high text-white px-4 py-2 text-sm font-medium hover:bg-risk-high/90 transition-colors disabled:opacity-50"
                  >
                    <Icon icon="mdi:cookie-remove-outline" className="h-4 w-4" />
                    Feed Entire Domain
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    High Risk
                  </p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {selectedDomainEntry.highRiskCount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Feedable
                  </p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {selectedDomainEntry.feedableCount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Sample Names
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {selectedDomainEntry.sampleCookieNames.join(", ")}
                  </p>
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-foreground">Cookie Contents</h4>
                  <p className="text-sm text-muted-foreground">
                    Key, value, risk, reasons, and flags for the selected website.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (allVisibleSelected) {
                        setSelectedKeys([]);
                        return;
                      }

                      setSelectedKeys(domainCookies.map((cookie) => cookie.key));
                    }}
                    className="rounded-xl bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
                  >
                    {allVisibleSelected ? "Clear Picks" : "Select All"}
                  </button>
                  <button
                    onClick={() => onDeleteCookies(selectedKeys)}
                    disabled={selectedKeys.length === 0}
                    className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Feed Selected ({selectedKeys.length})
                  </button>
                </div>
              </div>

              {isDomainLoading ? (
                <div className="rounded-2xl border border-border bg-background/70 p-10 text-center text-muted-foreground">
                  Loading cookie details...
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border">
                  <div className="max-h-[620px] overflow-auto">
                    <table className="min-w-full divide-y divide-border text-sm">
                      <thead className="sticky top-0 bg-background z-10">
                        <tr className="text-left text-muted-foreground">
                          <th className="px-4 py-3 font-medium">Pick</th>
                          <th className="px-4 py-3 font-medium">Cookie</th>
                          <th className="px-4 py-3 font-medium">Key / Value</th>
                          <th className="px-4 py-3 font-medium">Signals</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {domainCookies.map((cookie) => {
                          const checked = selectedKeySet.has(cookie.key);

                          return (
                            <tr key={cookie.key} className="align-top">
                              <td className="px-4 py-4">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => {
                                    setSelectedKeys((current) => {
                                      if (event.target.checked) {
                                        return [...current, cookie.key];
                                      }

                                      return current.filter((key) => key !== cookie.key);
                                    });
                                  }}
                                  className="h-4 w-4 rounded border-border"
                                />
                              </td>
                              <td className="px-4 py-4">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-foreground">{cookie.name}</p>
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                        riskClassNames[cookie.risk]
                                      }`}
                                    >
                                      {cookie.risk}
                                    </span>
                                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                      {cookie.category}
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {cookie.path} · {cookie.storeId} · {cookie.sameSite}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="space-y-2">
                                  <code className="block break-all rounded-xl bg-background px-3 py-2 text-xs text-foreground">
                                    {cookie.key}
                                  </code>
                                  <code className="block break-all rounded-xl bg-background px-3 py-2 text-xs text-muted-foreground">
                                    {cookie.value}
                                  </code>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-2">
                                    {cookie.presetIds.map((presetId) => (
                                      <span
                                        key={presetId}
                                        className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                                      >
                                        {presetId}
                                      </span>
                                    ))}
                                    {cookie.secure && (
                                      <span className="rounded-full border border-chart-3/20 bg-chart-3/10 px-2 py-0.5 text-[11px] text-chart-3">
                                        secure
                                      </span>
                                    )}
                                    {cookie.httpOnly && (
                                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                        httpOnly
                                      </span>
                                    )}
                                  </div>
                                  <ul className="space-y-1 text-xs text-muted-foreground">
                                    {cookie.reasons.map((reason) => (
                                      <li key={reason} className="flex items-start gap-2">
                                        <Icon
                                          icon="mdi:circle-small"
                                          className="mt-0.5 h-4 w-4 flex-shrink-0"
                                        />
                                        <span>{reason}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/70 p-12 text-center text-muted-foreground">
              Select a domain from the left to inspect raw cookie details and monster actions.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
