"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useExtensionStatus } from "@/hooks/use-extension-status";
import { useReportImport } from "@/hooks/use-report-import";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
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

  // Use imported report if available, otherwise use extension report
  const activeReport = reportImport.report || extensionStatus.report;
  const isLoading = extensionStatus.isLoading;
  const isImportedReport = Boolean(reportImport.report);
  const showAwaitingScan =
    !isLoading && extensionStatus.isInstalled && !activeReport;

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
                <Icon icon="mdi:cookie" className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg text-foreground">
                Cookie Monster
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setImportModalOpen(true)}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Icon icon="mdi:file-upload" className="w-4 h-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button
                onClick={() => extensionStatus.refresh()}
                disabled={isLoading}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Icon
                  icon="mdi:refresh"
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              {extensionStatus.isInstalled && (
                <button
                  onClick={handleOpenExtension}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Icon icon="mdi:open-in-new" className="w-4 h-4" />
                  <span className="hidden sm:inline">Open Extension</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(actionMessage || actionError) && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              actionError
                ? "border-risk-high/20 bg-risk-high/10 text-risk-high"
                : "border-chart-3/20 bg-chart-3/10 text-foreground"
            }`}
          >
            {actionError || actionMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Icon
              icon="mdi:loading"
              className="w-10 h-10 text-primary animate-spin mb-4"
            />
            <p className="text-muted-foreground">Loading extension status...</p>
          </div>
        ) : activeReport ? (
          <DashboardContent
            report={activeReport}
            onClearReport={reportImport.report ? handleClearReport : undefined}
            isDevMode={extensionStatus.isDevMode && !reportImport.report}
            onExport={handleExport}
            onOpenExtension={!isImportedReport ? handleOpenExtension : undefined}
            source={isImportedReport ? "imported" : "extension"}
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
