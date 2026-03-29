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
    color: "text-red-600",
    bg: "bg-red-50 border-red-100",
    icon: "mdi:alert-circle",
    label: "High Risk",
  },
  medium: {
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-100",
    icon: "mdi:alert",
    label: "Medium Risk",
  },
  low: {
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-100",
    icon: "mdi:check-circle",
    label: "Low Risk",
  },
};

export function TopDomains({ domains }: TopDomainsProps) {
  const maxCount = domains.length > 0 ? Math.max(...domains.map((d) => d.count)) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Top Domains</h3>
        <span className="text-sm text-slate-500">
          {domains.length} domains
        </span>
      </div>
      <div className="space-y-3">
        {domains.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            No domain activity is available yet.
          </div>
        )}
        {domains.map((domain) => {
          const risk = riskConfig[domain.riskLevel];
          const percentage = maxCount > 0 ? (domain.count / maxCount) * 100 : 0;

          return (
            <div key={domain.domain} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon
                    icon="mdi:web"
                    className="w-4 h-4 text-slate-400"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {domain.domain}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg border",
                      risk.bg,
                      risk.color
                    )}
                  >
                    <Icon icon={risk.icon} className="w-3 h-3" />
                    {domain.riskLevel}
                  </span>
                  <span className="text-sm text-slate-500 font-mono">
                    {domain.count}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    domain.riskLevel === "high" && "bg-red-500",
                    domain.riskLevel === "medium" && "bg-amber-500",
                    domain.riskLevel === "low" && "bg-emerald-500"
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
