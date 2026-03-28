"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isExtensionInstalled,
  getSummaryReport,
  generateMockReport,
  type CookieSummaryReport,
} from "@/lib/extension-bridge";

type DataMode = "auto" | "mock";

interface ExtensionStatus {
  isInstalled: boolean;
  isLoading: boolean;
  isDevMode: boolean;
  isUsingMockData: boolean;
  dataMode: DataMode;
  report: CookieSummaryReport | null;
  error: string | null;
  refresh: () => Promise<void>;
  toggleDevMode: () => void;
  setDataMode: (mode: DataMode) => void;
}

const DEV_SKIP_KEY = "cm_dev_skip_extension";
const DATA_MODE_KEY = "cm_data_mode";

export function useExtensionStatus(): ExtensionStatus {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [dataMode, setDataModeState] = useState<DataMode>("auto");
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [report, setReport] = useState<CookieSummaryReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkExtension = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setReport(null);
    setIsUsingMockData(false);

    try {
      const isDevEnv = process.env.NODE_ENV === "development";
      let devEnabled = false;
      let mode: DataMode = "auto";

      if (typeof window !== "undefined") {
        devEnabled = window.localStorage.getItem(DEV_SKIP_KEY) === "true";
        const storedMode = window.localStorage.getItem(DATA_MODE_KEY);
        if (storedMode === "mock" || storedMode === "auto") {
          mode = storedMode;
        }
      }

      setIsDevMode(devEnabled);
      setDataModeState(mode);

      if (isDevEnv && devEnabled && mode === "mock") {
        setIsInstalled(true);
        setReport(generateMockReport());
        setIsUsingMockData(true);
        setIsLoading(false);
        return;
      }

      const installed = await isExtensionInstalled();
      setIsInstalled(installed);

      if (!installed) {
        if (isDevEnv && devEnabled) {
          setReport(generateMockReport());
          setIsUsingMockData(true);
          setError("Extension not detected. Running in mock data mode.");
        }
        setIsLoading(false);
        return;
      }

      const summaryReport = await getSummaryReport();
      if (summaryReport) {
        setReport(summaryReport);
        return;
      }

      if (isDevEnv && devEnabled) {
        setReport(generateMockReport());
        setIsUsingMockData(true);
        setError("Extension detected but no report exists yet. Falling back to mock data.");
        return;
      }

      setError("No report available. Please scan cookies in the extension first.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setDataMode = useCallback((mode: DataMode) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DATA_MODE_KEY, mode);
      setDataModeState(mode);
      checkExtension();
    }
  }, [checkExtension]);

  const toggleDevMode = useCallback(() => {
    if (typeof window !== "undefined") {
      const next = !isDevMode;
      window.localStorage.setItem(DEV_SKIP_KEY, String(next));
      if (!next) {
        window.localStorage.setItem(DATA_MODE_KEY, "auto");
      }
      setIsDevMode(next);
      checkExtension();
    }
  }, [isDevMode, checkExtension]);

  useEffect(() => {
    checkExtension();
  }, [checkExtension]);

  return {
    isInstalled,
    isLoading,
    isDevMode,
    isUsingMockData,
    dataMode,
    report,
    error,
    refresh: checkExtension,
    toggleDevMode,
    setDataMode,
  };
}
