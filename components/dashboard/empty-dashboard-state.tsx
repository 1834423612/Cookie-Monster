"use client";

import { Icon } from "@iconify/react";

interface EmptyDashboardStateProps {
  isExtensionInstalled: boolean;
  onImportClick: () => void;
  onOpenExtension: () => void;
  onDevModeToggle: () => void;
  isDevMode: boolean;
  message?: string | null;
}

export function EmptyDashboardState({
  isExtensionInstalled,
  onImportClick,
  onOpenExtension,
  onDevModeToggle,
  isDevMode,
  message,
}: EmptyDashboardStateProps) {
  const title = isExtensionInstalled
    ? "Extension Connected, Scan Needed"
    : "Extension Not Detected";
  const body = isExtensionInstalled
    ? "The extension is installed, but there is no cached summary report yet. Open the extension, run a scan, then refresh this dashboard."
    : "To view live cookie analysis, install the Cookie Monster browser extension or import a previously exported summary report.";

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Icon
            icon={isExtensionInstalled ? "mdi:radar" : "mdi:puzzle-remove"}
            className="w-10 h-10 text-primary"
          />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-3">{title}</h2>
        <p className="text-muted-foreground mb-4">{body}</p>

        {message ? (
          <div className="mb-8 rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            {message}
          </div>
        ) : (
          <div className="mb-8" />
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <button
            onClick={onOpenExtension}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            <Icon icon="mdi:puzzle" className="w-5 h-5" />
            {isExtensionInstalled ? "Open Extension" : "Open Install Guide"}
          </button>
          <button
            onClick={onImportClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-muted text-foreground px-6 py-3 rounded-xl font-medium hover:bg-muted/80 transition-colors"
          >
            <Icon icon="mdi:file-upload" className="w-5 h-5" />
            Import Report
          </button>
        </div>

        {!isExtensionInstalled && (
          <div className="border-t border-border pt-6">
            <p className="text-xs text-muted-foreground mb-3">Development Mode</p>
            <button
              onClick={onDevModeToggle}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <div
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  isDevMode ? "bg-primary" : "bg-muted"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-card shadow transition-transform ${
                    isDevMode ? "left-5" : "left-1"
                  }`}
                />
              </div>
              <span>Use mock data for testing</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
