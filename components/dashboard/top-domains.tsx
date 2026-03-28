import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

interface TopDomainsProps {
  domains: Array<{
    domain: string;
    count: number;
    riskLevel: "high" | "medium" | "low";
  }>;
}

const riskConfig = {
  high: {
    color: "text-risk-high",
    bg: "bg-risk-high/10",
    icon: "mdi:alert-circle",
    label: "High Risk",
  },
  medium: {
    color: "text-risk-medium",
    bg: "bg-risk-medium/10",
    icon: "mdi:alert",
    label: "Medium Risk",
  },
  low: {
    color: "text-risk-low",
    bg: "bg-risk-low/10",
    icon: "mdi:check-circle",
    label: "Low Risk",
  },
};

export function TopDomains({ domains }: TopDomainsProps) {
  const maxCount = Math.max(...domains.map((d) => d.count));

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Top Domains</h3>
        <span className="text-sm text-muted-foreground">
          {domains.length} domains
        </span>
      </div>
      <div className="space-y-3">
        {domains.map((domain) => {
          const risk = riskConfig[domain.riskLevel];
          const percentage = (domain.count / maxCount) * 100;

          return (
            <div key={domain.domain} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon
                    icon="mdi:web"
                    className="w-4 h-4 text-muted-foreground"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {domain.domain}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                      risk.bg,
                      risk.color
                    )}
                  >
                    <Icon icon={risk.icon} className="w-3 h-3" />
                    {domain.riskLevel}
                  </span>
                  <span className="text-sm text-muted-foreground font-mono">
                    {domain.count}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    domain.riskLevel === "high" && "bg-risk-high",
                    domain.riskLevel === "medium" && "bg-risk-medium",
                    domain.riskLevel === "low" && "bg-risk-low"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
