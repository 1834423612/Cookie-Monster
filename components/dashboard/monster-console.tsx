"use client";

import { Icon } from "@iconify/react";
import { useEffect, useMemo, useState } from "react";
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
  high: "bg-red-50 text-red-600 border-red-200",
  medium: "bg-amber-50 text-amber-600 border-amber-200",
  low: "bg-emerald-50 text-emerald-600 border-emerald-200",
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

  useEffect(() => {
    const visibleKeys = new Set(domainCookies.map((cookie) => cookie.key));
    setSelectedKeys((current) => current.filter((key) => visibleKeys.has(key)));
  }, [domainCookies]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50/80 via-white to-cyan-50/60 p-6 shadow-sm">
        <div className="absolute right-6 top-6 hidden lg:block">
          <div className="relative h-40 w-40">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 shadow-xl shadow-blue-500/20" />
            <div className="absolute left-7 top-10 h-4 w-4 rounded-full bg-white" />
            <div className="absolute right-7 top-10 h-4 w-4 rounded-full bg-white" />
            <div className="absolute left-6 right-6 top-20 h-12 rounded-b-[999px] rounded-t-[16px] bg-red-400" />
            <div className="absolute bottom-7 left-1/2 h-10 w-16 -translate-x-1/2 rounded-b-[999px] rounded-t-[12px] bg-white" />
          </div>
        </div>

        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm text-slate-700 mb-4 shadow-sm">
            <Icon icon="mdi:cookie-open" className="h-4 w-4 text-blue-500" />
            <span className="font-medium">Website Mission Control</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 text-balance">
            Feed the monster from the website, let the extension handle the dangerous chewing.
          </h2>
          <p className="mt-3 max-w-2xl text-slate-500">
            Pick a cleanup batch, inspect cookie-by-cookie details, protect trusted domains,
            and restore anything the monster ate by mistake. The website drives the flow;
            the extension only performs local cookie access and writes.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                Domains
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {management.domains.length.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                Protected
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {management.protectedDomains.length.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                Recycle Bin
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {management.recycleBin.length.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                Pending
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {management.pendingFeedRequest ? "1" : "0"}
              </p>
            </div>
          </div>

          {management.pendingFeedRequest && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Pending feed request: {management.pendingFeedRequest.label}
                  </p>
                  <p className="text-sm text-slate-500">
                    {management.pendingFeedRequest.cookieCount.toLocaleString()} cookies across{" "}
                    {management.pendingFeedRequest.domainCount.toLocaleString()} domains are waiting for extension confirmation.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {management.pendingFeedRequest.sampleDomains.map((domain) => (
                    <span
                      key={domain}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500"
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
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-sm font-medium text-white hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md shadow-blue-500/20"
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
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold text-slate-800">Domain Stash</h3>
                <p className="text-sm text-slate-500">
                  Pick a website to inspect its cookies and feed controls.
                </p>
              </div>
            </div>
            <div className="relative mb-4">
              <Icon
                icon="mdi:magnify"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                value={domainQuery}
                onChange={(event) => setDomainQuery(event.target.value)}
                placeholder="Search a domain"
                className="w-full rounded-lg border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
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
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                      isSelected
                        ? "border-blue-300 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-800">{domain.domain}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {domain.cookieCount.toLocaleString()} cookies,{" "}
                          {domain.feedableCount.toLocaleString()} feedable
                        </p>
                      </div>
                      {domain.protected && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                          Protected
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-3">Recycle Bin History</h3>
            <div className="space-y-3">
              {management.recycleBin.map((batch) => (
                <div
                  key={batch.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800">{batch.label}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(batch.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => onRestoreBatch(batch.id)}
                      className="rounded-lg bg-white border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Restore
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {batch.cookieCount.toLocaleString()} cookies from{" "}
                    {batch.domainCount.toLocaleString()} domains
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {batch.sampleDomains.map((domain) => (
                      <span
                        key={domain}
                        className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {management.recycleBin.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  The monster hasn&apos;t eaten anything yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {selectedDomainEntry ? (
            <>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold text-slate-800">
                      {selectedDomainEntry.domain}
                    </h3>
                    <span
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                        selectedDomainEntry.protected
                          ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {selectedDomainEntry.protected ? "Protected" : "Vulnerable"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
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
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
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
                    className="inline-flex items-center gap-2 rounded-lg bg-red-500 text-white px-4 py-2 text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    <Icon icon="mdi:cookie-remove-outline" className="h-4 w-4" />
                    Feed Entire Domain
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                <div className="rounded-lg bg-red-50 border border-red-100 p-4">
                  <p className="text-xs uppercase tracking-wider text-red-500 font-medium">
                    High Risk
                  </p>
                  <p className="mt-2 text-2xl font-bold text-red-600">
                    {selectedDomainEntry.highRiskCount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
                  <p className="text-xs uppercase tracking-wider text-blue-500 font-medium">
                    Feedable
                  </p>
                  <p className="mt-2 text-2xl font-bold text-blue-600">
                    {selectedDomainEntry.feedableCount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Sample Names
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    {selectedDomainEntry.sampleCookieNames.join(", ") || "No sample names yet"}
                  </p>
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-slate-800">Cookie Contents</h4>
                  <p className="text-sm text-slate-500">
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
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    {allVisibleSelected ? "Clear Picks" : "Select All"}
                  </button>
                  <button
                    onClick={() => onDeleteCookies(selectedKeys)}
                    disabled={selectedKeys.length === 0}
                    className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-sm font-medium text-white hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 shadow-md shadow-blue-500/20"
                  >
                    Feed Selected ({selectedKeys.length})
                  </button>
                </div>
              </div>

              {isDomainLoading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
                  Loading cookie details...
                </div>
              ) : domainCookies.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
                  No cookies are currently available for this domain.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="max-h-[620px] overflow-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="sticky top-0 bg-slate-50 z-10">
                        <tr className="text-left text-slate-500">
                          <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Pick</th>
                          <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Cookie</th>
                          <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Key / Value</th>
                          <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Signals</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
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
