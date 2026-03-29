import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

interface FlagsSummaryProps {
  flags: {
    secure: number;
    httpOnly: number;
    sameSiteStrict: number;
    sameSiteLax: number;
    sameSiteNone: number;
    session: number;
    persistent: number;
  };
  total: number;
}

const flagConfig = [
  {
    key: "secure",
    label: "Secure",
    icon: "mdi:lock",
    description: "Transmitted over HTTPS only",
    positive: true,
  },
  {
    key: "httpOnly",
    label: "HttpOnly",
    icon: "mdi:shield",
    description: "Not accessible via JavaScript",
    positive: true,
  },
  {
    key: "sameSiteStrict",
    label: "SameSite Strict",
    icon: "mdi:shield-check",
    description: "Strictest cross-site protection",
    positive: true,
  },
  {
    key: "sameSiteLax",
    label: "SameSite Lax",
    icon: "mdi:shield-half-full",
    description: "Moderate cross-site protection",
    positive: true,
  },
  {
    key: "sameSiteNone",
    label: "SameSite None",
    icon: "mdi:shield-off",
    description: "No cross-site protection",
    positive: false,
  },
  {
    key: "session",
    label: "Session",
    icon: "mdi:clock-outline",
    description: "Deleted when browser closes",
    positive: true,
  },
  {
    key: "persistent",
    label: "Persistent",
    icon: "mdi:calendar-clock",
    description: "Stored until expiry date",
    positive: false,
  },
] as const;

export function FlagsSummary({ flags, total }: FlagsSummaryProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Security Flags
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {flagConfig.map((config) => {
          const value = flags[config.key as keyof typeof flags];
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";

          return (
            <div
              key={config.key}
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100"
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                  config.positive
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-amber-100 text-amber-600"
                )}
              >
                <Icon icon={config.icon} className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    {config.label}
                  </span>
                  <span className="text-sm text-slate-500 font-mono">
                    {value.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {percentage}% of total
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
