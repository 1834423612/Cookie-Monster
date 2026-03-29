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
  openExtensionPopup,
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
          .filter((c) => c.domain === domain.domain)
          .map((cookie) => ({
            name: cookie.name,
            size: cookie.size,
            risk: cookie.risk,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite || "None",
            expires: cookie.expirationDate
              ? new Date(cookie.expirationDate * 1000).toLocaleDateString()
              : "Session",
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

    const success = await openExtensionPopup();

    if (success) {
      setActionMessage("The extension popup was opened. Approve or manage actions there.");
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

  const handleCookieQueue = async (domain: string, cookieName: string) => {
    if (isImportedReport) return;
    
    setActionMessage(null);
    setActionError(null);

    // Find the cookie key for the given domain and name
    const cookie = cookieManagement.domainCookies.find(
      (c) => c.domain === domain && c.name === cookieName
    );
    
    if (cookie) {
      try {
        const pending = await cookieManagement.queueCookieFeed([cookie.key], {
          label: `Cookie review: ${cookieName}`,
          description: `The extension will review the selected ${domain} cookie locally before cleanup.`,
        });

        if (!pending) {
          setActionError("Could not create a pending cookie review request.");
          return;
        }

        await extensionStatus.refresh();
        setActionMessage(
          `Cookie "${cookieName}" was queued. Confirm "${pending.label}" inside the extension to finish cleanup.`
        );
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Could not create a pending cookie review request."
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-secondary flex items-center justify-center transition-transform group-hover:scale-105 shadow-md">
                <Icon icon="mdi:cookie" className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-foreground">
                Cookie Monster
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setImportModalOpen(true)}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl hover:bg-muted transition-colors"
              >
                <Icon icon="mdi:file-upload" className="w-4 h-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button
                onClick={() => extensionStatus.refresh()}
                disabled={isLoading}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
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
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl hover:bg-muted transition-colors"
                >
                  <Icon icon="mdi:download" className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              )}
              {extensionStatus.isInstalled && (
                <button
                  onClick={handleOpenExtension}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
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
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm flex items-center gap-2 ${
              actionError
                ? "border-risk-high/20 bg-risk-high/10 text-risk-high"
                : "border-chart-3/20 bg-chart-3/10 text-foreground"
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
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Icon icon="mdi:cookie-clock" className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-foreground">Cookie Report</h2>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {isImportedReport ? "Imported" : "Live"}
                  </span>
                  {extensionStatus.isDevMode && !isImportedReport && (
                    <span className="text-xs bg-risk-medium/10 text-risk-medium px-2 py-0.5 rounded-full">
                      Demo
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {activeReport.totals.cookies} cookies across {activeReport.totals.domains} domains
                </p>
              </div>
            </div>
            
            {/* Stats pills */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-risk-high/10 rounded-full">
                <span className="w-2 h-2 rounded-full bg-risk-high" />
                <span className="text-sm font-medium text-risk-high">{activeReport.risk.high} High</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-risk-medium/10 rounded-full">
                <span className="w-2 h-2 rounded-full bg-risk-medium" />
                <span className="text-sm font-medium text-risk-medium">{activeReport.risk.medium} Medium</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-risk-low/10 rounded-full">
                <span className="w-2 h-2 rounded-full bg-risk-low" />
                <span className="text-sm font-medium text-risk-low">{activeReport.risk.low} Low</span>
              </div>
              
              {reportImport.report && (
                <button
                  onClick={handleClearReport}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full hover:bg-muted transition-colors"
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
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
              <Icon
                icon="mdi:loading"
                className="w-8 h-8 text-primary animate-spin"
              />
            </div>
            <p className="text-muted-foreground">Loading cookie data...</p>
          </div>
        ) : activeReport ? (
          <CookieDomainList
            domains={domainListData}
            onDomainSelect={!isImportedReport ? handleDomainSelect : undefined}
            onCookieQueue={!isImportedReport ? handleCookieQueue : undefined}
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
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-8 mt-6 border-t border-border">
            <Icon icon="mdi:shield-check" className="w-5 h-5 text-chart-3" />
            <span>
              All data stays local. The website only receives cookie metadata through extension messaging, while raw values stay inside the extension.
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
