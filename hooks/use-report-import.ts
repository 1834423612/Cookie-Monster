"use client";

import { useState, useCallback } from "react";
import { parseReportFile, type CookieSummaryReport } from "@/lib/extension-bridge";

interface UseReportImportResult {
  report: CookieSummaryReport | null;
  isLoading: boolean;
  error: string | null;
  importFromFile: (file: File) => Promise<void>;
  importFromJson: (json: string) => void;
  clearReport: () => void;
}

export function useReportImport(): UseReportImportResult {
  const [report, setReport] = useState<CookieSummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importFromFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const parsed = parseReportFile(text);
      
      if (parsed) {
        setReport(parsed);
      } else {
        setError("Invalid report file format. Please use a valid Cookie Monster report.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const importFromJson = useCallback((json: string) => {
    setError(null);
    const parsed = parseReportFile(json);
    
    if (parsed) {
      setReport(parsed);
    } else {
      setError("Invalid JSON format. Please use a valid Cookie Monster report.");
    }
  }, []);

  const clearReport = useCallback(() => {
    setReport(null);
    setError(null);
  }, []);

  return {
    report,
    isLoading,
    error,
    importFromFile,
    importFromJson,
    clearReport,
  };
}
