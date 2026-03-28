"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface RiskChartProps {
  data: {
    high: number;
    medium: number;
    low: number;
  };
}

const COLORS = {
  high: "oklch(0.55 0.2 25)",
  medium: "oklch(0.7 0.15 70)",
  low: "oklch(0.6 0.15 145)",
};

export function RiskChart({ data }: RiskChartProps) {
  const chartData = [
    { name: "High Risk", value: data.high, color: COLORS.high },
    { name: "Medium Risk", value: data.medium, color: COLORS.medium },
    { name: "Low Risk", value: data.low, color: COLORS.low },
  ];

  const total = data.high + data.medium + data.low;

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Risk Distribution
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [
                `${value.toLocaleString()} (${total > 0 ? ((value / total) * 100).toFixed(1) : "0.0"}%)`,
                "Cookies",
              ]}
              contentStyle={{
                backgroundColor: "oklch(0.995 0.001 90)",
                border: "1px solid oklch(0.88 0.02 70)",
                borderRadius: "0.75rem",
                padding: "0.75rem",
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
