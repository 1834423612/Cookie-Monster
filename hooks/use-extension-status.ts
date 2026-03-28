"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  isExtensionInstalled, 
  getSummaryReport, 
  generateMockReport,
  type CookieSummaryReport 
} from "@/lib/extension-bridge";

interface ExtensionStatus {
  isInstalled: boolean;
  isLoading: boolean;
  isDevMode: boolean;
  report: CookieSummaryReport | null;
  error: string | null;
  refresh: () => Promise<void>;
  toggleDevMode: () => void;
}

export function useExtensionStatus(): ExtensionStatus {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [report, setReport] = useState<CookieSummaryReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkExtension = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check for dev mode skip
      if (typeof window !== "undefined") {
        const devSkip = window.localStorage.getItem("cm_dev_skip_extension") === "true";
        setIsDevMode(devSkip);
        
        if (devSkip) {
          setIsInstalled(true);
          setReport(generateMockReport());
          setIsLoading(false);
          return;
        }
      }

      const installed = await isExtensionInstalled();
      setIsInstalled(installed);

      if (installed) {
        const summaryReport = await getSummaryReport();
        if (summaryReport) {
          setReport(summaryReport);
        } else {
          // Extension installed but no report - might need to scan first
          setError("No report available. Please scan cookies in the extension first.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleDevMode = useCallback(() => {
    if (typeof window !== "undefined") {
      const newValue = !isDevMode;
      window.localStorage.setItem("cm_dev_skip_extension", String(newValue));
      setIsDevMode(newValue);
      
      if (newValue) {
        setIsInstalled(true);
        setReport(generateMockReport());
      } else {
        setReport(null);
        checkExtension();
      }
    }
  }, [isDevMode, checkExtension]);

  useEffect(() => {
    checkExtension();
  }, [checkExtension]);

  return {
    isInstalled,
    isLoading,
    isDevMode,
    report,
    error,
    refresh: checkExtension,
    toggleDevMode,
  };
}
