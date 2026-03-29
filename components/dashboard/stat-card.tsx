"use client";

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
  iconColor = "text-primary",
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-2xl border border-border p-5 transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center",
            iconColor.includes("primary") && "bg-primary/10",
            iconColor.includes("risk-high") && "bg-risk-high/10",
            iconColor.includes("risk-medium") && "bg-risk-medium/10",
            iconColor.includes("risk-low") && "bg-risk-low/10",
            iconColor.includes("chart-3") && "bg-chart-3/10",
            iconColor.includes("chart-1") && "bg-chart-1/10",
            iconColor.includes("secondary") && "bg-secondary/10"
          )}
        >
          <Icon icon={icon} className={cn("w-5 h-5", iconColor)} />
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              trend.positive
                ? "bg-chart-3/10 text-chart-3"
                : "bg-risk-high/10 text-risk-high"
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
      <p className="text-3xl font-bold text-foreground mb-1">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-muted-foreground">{title}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
