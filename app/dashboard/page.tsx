"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useExtensionStatus } from "@/hooks/use-extension-status";
import { useCookieManagement } from "@/hooks/use-cookie-management";
import { useReportImport } from "@/hooks/use-report-import";
import { CookieDomainList } from "@/components/dashboard/cookie-domain-list";
import { EmptyDashboardState } from "@/components/dashboard/empty-dashboard-state";
import { ImportModal } from "@/components/dashboard/import-modal";
import {
  openExtensionDashboard,
  requestExportReport,
} from "@/lib/extension-bridge";
import { downloadReportJson } from "@/lib/cookie-report";

export default function DashboardPage() {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  
  const extensionStatus = useExtensionStatus();
  const reportImport = useReportImport();
  const cookieManagement = useCookieManagement({
    enabled: extensionStatus.isInstalled && !reportImport.report,
    isDevMode: extensionStatus.isDevMode,
  });

  // Use imported report if available, otherwise use extension report
  const activeReport = reportImport.report || extensionStatus.report;
  const isLoading = extensionStatus.isLoading;
  const isImportedReport = Boolean(reportImport.report);
  const showAwaitingScan =
    !isLoading && extensionStatus.isInstalled && !activeReport;

  // Transform report data into domain list format
  const domainListData = useMemo(() => {
    if (!activeReport) return [];
    
    // Use management domains if available for more detailed data
    if (cookieManagement.management) {
      return cookieManagement.management.domains.map((domain) => ({
        domain: domain.domain,
        cookieCount: domain.cookieCount,
        riskLevel: domain.highRiskCount > 0 ? "high" as const : 
                   domain.feedableCount > domain.cookieCount / 2 ? "medium" as const : "low" as const,
        cookies: cookieManagement.domainCookies
          .filter((c) => c.domain === domain.domain || cookieManagement.selectedDomain === domain.domain)
          .map((cookie) => ({
            name: cookie.name,
            value: cookie.value || "***",
            risk: cookie.riskLevel as "high" | "medium" | "low",
            httpOnly: cookie.flags.includes("httpOnly"),
            secure: cookie.flags.includes("secure"),
            sameSite: cookie.flags.find(f => f.startsWith("sameSite"))?.replace("sameSite", "") || "None",
            expires: cookie.expiresIn,
          })),
      }));
    }
    
    // Fall back to report top domains
    return activeReport.topDomains.map((domain) => ({
      domain: domain.domain,
      cookieCount: domain.count,
      riskLevel: domain.riskLevel,
      cookies: [],
    }));
  }, [activeReport, cookieManagement.management, cookieManagement.domainCookies, cookieManagement.selectedDomain]);

  const handleClearReport = () => {
    reportImport.clearReport();
    setActionMessage(null);
    setActionError(null);
  };

  const handleOpenExtension = async () => {
    setActionMessage(null);
    setActionError(null);

    const success = await openExtensionDashboard();

    if (success) {
      setActionMessage("The extension dashboard was opened in a new tab.");
      return;
    }

    window.location.href = "/docs#chrome-install";
  };

  const handleExport = async () => {
    if (!activeReport) {
      return;
    }

    setActionMessage(null);
    setActionError(null);

    if (isImportedReport) {
      downloadReportJson(activeReport, "cookie-monster-imported-report");
      setActionMessage("The imported summary report was downloaded locally.");
      return;
    }

    const success = await requestExportReport();
    if (success) {
      setActionMessage("The extension started exporting the latest summary report.");
      return;
    }

    setActionError("Export failed. Open the extension and try again from the side panel.");
  };

  const handleDomainSelect = async (domain: string) => {
    if (!isImportedReport && cookieManagement.selectDomain) {
      await cookieManagement.selectDomain(domain);
    }
  };

  const handleCookieDelete = async (domain: string, cookieName: string) => {
    if (isImportedReport) return;
    
    setActionMessage(null);
    setActionError(null);

    // Find the cookie key for the given domain and name
    const cookie = cookieManagement.domainCookies.find(
      (c) => c.domain === domain && c.name === cookieName
    );
    
    if (cookie) {
      try {
        await cookieManagement.deleteCookies([cookie.key]);
        await extensionStatus.refresh();
        setActionMessage(`Cookie "${cookieName}" was fed to the monster.`);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Could not delete cookie.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center transition-transform group-hover:scale-105 shadow-lg shadow-blue-500/20">
                <Icon icon="mdi:cookie" className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-slate-800">
                Cookie Monster
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setImportModalOpen(true)}
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Icon icon="mdi:file-upload" className="w-4 h-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button
                onClick={() => extensionStatus.refresh()}
                disabled={isLoading}
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <Icon
                  icon="mdi:refresh"
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              {activeReport && (
                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Icon icon="mdi:download" className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              )}
              {extensionStatus.isInstalled && (
                <button
                  onClick={handleOpenExtension}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md shadow-blue-500/20"
                >
                  <Icon icon="mdi:puzzle" className="w-4 h-4" />
                  <span className="hidden sm:inline">Extension</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action messages */}
        {(actionMessage || actionError) && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm flex items-center gap-2 shadow-sm ${
              actionError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <Icon 
              icon={actionError ? "mdi:alert-circle" : "mdi:check-circle"} 
              className="w-5 h-5 shrink-0" 
            />
            {actionError || actionMessage}
          </div>
        )}

        {/* Report info bar */}
        {activeReport && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                <Icon icon="mdi:cookie-clock" className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-800">Cookie Report</h2>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                    {isImportedReport ? "Imported" : "Live"}
                  </span>
                  {extensionStatus.isDevMode && !isImportedReport && (
                    <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                      Demo
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {activeReport.totals.cookies} cookies across {activeReport.totals.domains} domains
                </p>
              </div>
            </div>
            
            {/* Stats pills */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg border border-red-100">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-semibold text-red-600">{activeReport.risk.high} High</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm font-semibold text-amber-600">{activeReport.risk.medium} Medium</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-emerald-600">{activeReport.risk.low} Low</span>
              </div>
              
              {reportImport.report && (
                <button
                  onClick={handleClearReport}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Icon icon="mdi:close" className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main content area */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mb-4">
              <Icon
                icon="mdi:loading"
                className="w-8 h-8 text-blue-500 animate-spin"
              />
            </div>
            <p className="text-slate-500">Loading cookie data...</p>
          </div>
        ) : activeReport ? (
          <CookieDomainList
            domains={domainListData}
            onDomainSelect={!isImportedReport ? handleDomainSelect : undefined}
            onCookieDelete={!isImportedReport ? handleCookieDelete : undefined}
            isLoading={cookieManagement.isDomainLoading}
          />
        ) : (
          <EmptyDashboardState
            isExtensionInstalled={showAwaitingScan}
            onImportClick={() => setImportModalOpen(true)}
            onOpenExtension={handleOpenExtension}
            onDevModeToggle={extensionStatus.toggleDevMode}
            isDevMode={extensionStatus.isDevMode}
            message={extensionStatus.error}
          />
        )}

        {/* Privacy footer */}
        {activeReport && (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-8 mt-6 border-t border-slate-200">
            <Icon icon="mdi:shield-check" className="w-5 h-5 text-emerald-500" />
            <span>
              All data stays local. Cookie details only travel through extension messaging.
            </span>
          </div>
        )}
      </main>

      {/* Import modal */}
      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={reportImport.importFromFile}
        isLoading={reportImport.isLoading}
        error={reportImport.error}
      />
    </div>
  );
}
