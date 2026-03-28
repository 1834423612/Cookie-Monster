"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CategoryChartProps {
  data: {
    essential: number;
    functional: number;
    analytics: number;
    advertising: number;
    unknown: number;
  };
}

const COLORS = {
  essential: "oklch(0.6 0.15 145)",
  functional: "oklch(0.55 0.18 240)",
  analytics: "oklch(0.7 0.15 70)",
  advertising: "oklch(0.55 0.2 25)",
  unknown: "oklch(0.5 0.05 240)",
};

export function CategoryChart({ data }: CategoryChartProps) {
  const chartData = [
    { name: "Essential", value: data.essential, fill: COLORS.essential },
    { name: "Functional", value: data.functional, fill: COLORS.functional },
    { name: "Analytics", value: data.analytics, fill: COLORS.analytics },
    { name: "Advertising", value: data.advertising, fill: COLORS.advertising },
    { name: "Unknown", value: data.unknown, fill: COLORS.unknown },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Cookie Categories
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.88 0.02 70)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              type="number"
              tick={{ fill: "oklch(0.45 0.02 50)", fontSize: 12 }}
              axisLine={{ stroke: "oklch(0.88 0.02 70)" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "oklch(0.45 0.02 50)", fontSize: 12 }}
              axisLine={{ stroke: "oklch(0.88 0.02 70)" }}
              width={80}
            />
            <Tooltip
              formatter={(value: number) => [value.toLocaleString(), "Cookies"]}
              contentStyle={{
                backgroundColor: "oklch(0.995 0.001 90)",
                border: "1px solid oklch(0.88 0.02 70)",
                borderRadius: "0.75rem",
                padding: "0.75rem",
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
