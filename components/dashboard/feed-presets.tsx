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
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Monster Feed Queue</h3>
          <p className="text-sm text-slate-500">
            {cleanup.totalCandidates.toLocaleString()} cookies currently look safe enough
            to route through extension-controlled cleanup presets.
          </p>
        </div>
        <div className="text-sm text-slate-500">
          Preset batches ask the extension for confirmation. Domain and cookie-level actions can run directly from the website console.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {cleanup.presets.map((preset) => (
          <div
            key={preset.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold text-slate-800">{preset.label}</h4>
                <p className="text-sm text-slate-500 mt-1">
                  {preset.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-slate-800">
                  {preset.cookieCount.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">
                  {preset.domainCount.toLocaleString()} domains
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {preset.sampleDomains.map((domain) => (
                <span
                  key={domain}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white text-slate-500 border border-slate-200"
                >
                  {domain}
                </span>
              ))}
            </div>

            <button
              onClick={() => onRequestFeed?.(preset.id)}
              disabled={disabled || !onRequestFeed}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2.5 text-sm font-medium hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon icon="mdi:cookie-outline" className="w-4 h-4" />
              Request Feed
            </button>
          </div>
        ))}
      </div>

      {cleanup.recommendations.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="font-semibold text-slate-800 mb-3">Recommended Order</h4>
          <div className="space-y-3">
            {cleanup.recommendations.map((recommendation) => (
              <div
                key={recommendation.id}
                className="flex items-start justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-slate-700">{recommendation.title}</p>
                  <p className="text-sm text-slate-500">
                    {recommendation.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">
                    {recommendation.cookieCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">{recommendation.presetId}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
