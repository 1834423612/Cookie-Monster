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
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Security Flags
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {flagConfig.map((config) => {
          const value = flags[config.key as keyof typeof flags];
          const percentage = ((value / total) * 100).toFixed(1);

          return (
            <div
              key={config.key}
              className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                  config.positive
                    ? "bg-chart-3/10 text-chart-3"
                    : "bg-risk-medium/10 text-risk-medium"
                )}
              >
                <Icon icon={config.icon} className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {config.label}
                  </span>
                  <span className="text-sm text-muted-foreground font-mono">
                    {value.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
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
