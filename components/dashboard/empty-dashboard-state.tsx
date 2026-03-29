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

// Cookie icon SVG component
function CookieIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.9" />
      <circle cx="8" cy="8" r="1.5" fill="#5C4033" />
      <circle cx="14" cy="7" r="1.2" fill="#5C4033" />
      <circle cx="16" cy="12" r="1.4" fill="#5C4033" />
      <circle cx="10" cy="14" r="1.3" fill="#5C4033" />
      <circle cx="6" cy="12" r="1.1" fill="#5C4033" />
      <circle cx="13" cy="16" r="1.2" fill="#5C4033" />
    </svg>
  );
}

// Animated Cookie Monster for empty state
function EmptyStateMascot() {
  return (
    <div className="relative w-32 h-32 mx-auto mb-6">
      {/* Floating cookies */}
      <div className="absolute -top-2 -left-2 animate-bounce" style={{ animationDelay: "0s", animationDuration: "2s" }}>
        <CookieIcon className="w-6 h-6 text-secondary opacity-60" />
      </div>
      <div className="absolute -top-1 -right-3 animate-bounce" style={{ animationDelay: "0.5s", animationDuration: "2.5s" }}>
        <CookieIcon className="w-5 h-5 text-primary opacity-50" />
      </div>
      
      {/* Monster face */}
      <div className="w-24 h-24 mx-auto rounded-full bg-[#1e88e5] shadow-xl relative">
        {/* Eyes */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2">
          <div className="w-6 h-7 bg-white rounded-full relative">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-black rounded-full">
              <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full" />
            </div>
          </div>
          <div className="w-6 h-7 bg-white rounded-full relative">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-black rounded-full">
              <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full" />
            </div>
          </div>
        </div>
        
        {/* Sad mouth */}
        <div className="absolute top-14 left-1/2 -translate-x-1/2 w-8 h-4 border-b-4 border-[#c62828] rounded-b-full" />
      </div>
      
      {/* Question marks */}
      <div className="absolute -bottom-1 right-0 text-2xl text-muted-foreground/50 animate-pulse">?</div>
    </div>
  );
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
    ? "Hungry for Cookies!"
    : "Where are the Cookies?";
  const body = isExtensionInstalled
    ? "The extension is connected but the cookie jar is empty. Open the extension, run a scan, and let the monster feast!"
    : "Install the Cookie Monster browser extension to start analyzing cookies, or import a previously exported report.";

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="max-w-md text-center">
        <EmptyStateMascot />

        <h2 className="text-2xl font-bold text-foreground mb-3">{title}</h2>
        <p className="text-muted-foreground mb-4">{body}</p>

        {message ? (
          <div className="mb-8 rounded-2xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            {message}
          </div>
        ) : (
          <div className="mb-8" />
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <button
            onClick={onOpenExtension}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-md"
          >
            <Icon icon="mdi:puzzle" className="w-5 h-5" />
            {isExtensionInstalled ? "Open Extension" : "Get Extension"}
          </button>
          <button
            onClick={onImportClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground px-6 py-3 rounded-xl font-medium hover:bg-muted transition-colors"
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
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  isDevMode ? "bg-primary" : "bg-muted border border-border"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-md transition-all ${
                    isDevMode ? "left-5" : "left-0.5"
                  }`}
                />
              </div>
              <span>Use demo data for testing</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
