"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isExtensionInstalled,
  getSummaryReport,
  generateMockReport,
  type CookieSummaryReport,
} from "@/lib/extension-bridge";

type DevDataSource = "auto" | "mock";

interface ExtensionStatus {
  isInstalled: boolean;
  isLoading: boolean;
  isDevMode: boolean;
  report: CookieSummaryReport | null;
  error: string | null;
  usingMockData: boolean;
  canChooseMockData: boolean;
  dataSource: DevDataSource;
  setDataSource: (source: DevDataSource) => void;
  refresh: () => Promise<void>;
  toggleDevMode: () => void;
}

export function useExtensionStatus(): ExtensionStatus {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [report, setReport] = useState<CookieSummaryReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [dataSource, setDataSourceState] = useState<DevDataSource>("auto");

  const canChooseMockData = process.env.NODE_ENV === "development";

  const setDataSource = useCallback((source: DevDataSource) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cm_dev_data_source", source);
    }
    setDataSourceState(source);
  }, []);

  const checkExtension = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setReport(null);

    try {
      if (typeof window !== "undefined") {
        const devSkip = window.localStorage.getItem("cm_dev_skip_extension") === "true";
        const savedSource =
          window.localStorage.getItem("cm_dev_data_source") === "mock" ? "mock" : "auto";

        setDataSourceState(savedSource);
        setIsDevMode(devSkip);

        if (canChooseMockData && savedSource === "mock") {
          setIsInstalled(true);
          setUsingMockData(true);
          setReport(generateMockReport());
          setIsLoading(false);
          return;
        }

        if (devSkip) {
          setIsInstalled(true);
          setUsingMockData(true);
          setReport(generateMockReport());
          setIsLoading(false);
          return;
        }
      }

      const installed = await isExtensionInstalled();
      setIsInstalled(installed);
      setUsingMockData(false);

      if (installed) {
        const summaryReport = await getSummaryReport();
        if (summaryReport) {
          setReport(summaryReport);
        } else {
          setError("No report available. Please scan cookies in the extension first.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [canChooseMockData]);

  const toggleDevMode = useCallback(() => {
    if (typeof window !== "undefined") {
      const newValue = !isDevMode;
      window.localStorage.setItem("cm_dev_skip_extension", String(newValue));
      setIsDevMode(newValue);

      if (newValue) {
        setError(null);
        setIsInstalled(true);
        setUsingMockData(true);
        setReport(generateMockReport());
      } else {
        setReport(null);
        checkExtension();
      }
    }
  }, [isDevMode, checkExtension]);

  useEffect(() => {
    checkExtension();
  }, [checkExtension, dataSource]);

  return {
    isInstalled,
    isLoading,
    isDevMode,
    report,
    error,
    usingMockData,
    canChooseMockData,
    dataSource,
    setDataSource,
    refresh: checkExtension,
    toggleDevMode,
  };
}
