"use client";

import { Icon } from "@iconify/react";
import type {
  CleanupInsights,
  CleanupPresetId,
} from "@/lib/extension-bridge";

interface FeedPresetsProps {
  cleanup: CleanupInsights;
  onRequestFeed?: (presetId: CleanupPresetId) => Promise<void> | void;
  disabled?: boolean;
}

export function FeedPresets({
  cleanup,
  onRequestFeed,
  disabled,
}: FeedPresetsProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Monster Feed Queue</h3>
          <p className="text-sm text-muted-foreground">
            {cleanup.totalCandidates.toLocaleString()} cookies currently look safe enough
            to route through extension-controlled cleanup presets.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Website requests still require confirmation inside the extension.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {cleanup.presets.map((preset) => (
          <div
            key={preset.id}
            className="rounded-2xl border border-border bg-muted/40 p-4 flex flex-col gap-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold text-foreground">{preset.label}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {preset.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-foreground">
                  {preset.cookieCount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {preset.domainCount.toLocaleString()} domains
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {preset.sampleDomains.map((domain) => (
                <span
                  key={domain}
                  className="text-xs px-2.5 py-1 rounded-full bg-background text-muted-foreground border border-border"
                >
                  {domain}
                </span>
              ))}
            </div>

            <button
              onClick={() => onRequestFeed?.(preset.id)}
              disabled={disabled || !onRequestFeed}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon icon="mdi:cookie-outline" className="w-4 h-4" />
              Request Feed
            </button>
          </div>
        ))}
      </div>

      {cleanup.recommendations.length > 0 && (
        <div className="rounded-2xl border border-border bg-background/70 p-4">
          <h4 className="font-semibold text-foreground mb-3">Recommended Order</h4>
          <div className="space-y-3">
            {cleanup.recommendations.map((recommendation) => (
              <div
                key={recommendation.id}
                className="flex items-start justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-foreground">{recommendation.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {recommendation.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    {recommendation.cookieCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{recommendation.presetId}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
