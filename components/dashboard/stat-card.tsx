import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  iconColor?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = "text-blue-500",
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 p-5 transition-all hover:shadow-md shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center",
            iconColor.includes("primary") && "bg-blue-100",
            iconColor.includes("risk-high") && "bg-red-100",
            iconColor.includes("risk-medium") && "bg-amber-100",
            iconColor.includes("risk-low") && "bg-emerald-100",
            iconColor.includes("chart-3") && "bg-emerald-100",
            iconColor.includes("chart-1") && "bg-blue-100",
            iconColor.includes("secondary") && "bg-amber-100"
          )}
        >
          <Icon icon={icon} className={cn("w-5 h-5", iconColor)} />
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg",
              trend.positive
                ? "bg-emerald-100 text-emerald-600"
                : "bg-red-100 text-red-600"
            )}
          >
            <Icon
              icon={trend.positive ? "mdi:trending-up" : "mdi:trending-down"}
              className="w-3 h-3"
            />
            <span>{trend.value}%</span>
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-slate-800 mb-1">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-slate-600">{title}</p>
      {subtitle && (
        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
