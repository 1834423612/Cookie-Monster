"use client";

import { useState, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function ImportModal({
  isOpen,
  onClose,
  onImport,
  isLoading,
  error,
}: ImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/json") {
        await onImport(file);
      }
    },
    [onImport]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await onImport(file);
      }
    },
    [onImport]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl border border-border shadow-xl max-w-md w-full mx-4 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <Icon icon="mdi:close" className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Import Report
          </h2>
          <p className="text-sm text-muted-foreground">
            Import a Cookie Monster report file to view your cookie analysis.
            This file should be exported from the browser extension.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50",
            isLoading && "pointer-events-none opacity-50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />

          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Icon
                icon="mdi:loading"
                className="w-10 h-10 text-primary animate-spin"
              />
              <span className="text-sm text-muted-foreground">
                Processing...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon icon="mdi:file-upload" className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">
                  Drop your report file here
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse
                </p>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                JSON files only
              </span>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-risk-high/10 border border-risk-high/20">
            <div className="flex items-start gap-2">
              <Icon
                icon="mdi:alert-circle"
                className="w-5 h-5 text-risk-high flex-shrink-0 mt-0.5"
              />
              <p className="text-sm text-risk-high">{error}</p>
            </div>
          </div>
        )}

        {/* Privacy notice */}
        <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
          <Icon
            icon="mdi:shield-check"
            className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5"
          />
          <span>
            Your report is processed entirely in your browser. No data is
            uploaded to any server.
          </span>
        </div>
      </div>
    </div>
  );
}
