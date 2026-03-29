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
  essential: "#10B981",
  functional: "#3B82F6",
  analytics: "#F59E0B",
  advertising: "#EF4444",
  unknown: "#64748B",
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
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Cookie Categories
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E2E8F0"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              type="number"
              tick={{ fill: "#64748B", fontSize: 12 }}
              axisLine={{ stroke: "#E2E8F0" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#64748B", fontSize: 12 }}
              axisLine={{ stroke: "#E2E8F0" }}
              width={80}
            />
            <Tooltip
              formatter={(value: number) => [value.toLocaleString(), "Cookies"]}
              contentStyle={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "0.5rem",
                padding: "0.75rem",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
