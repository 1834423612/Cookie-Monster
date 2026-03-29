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
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

export function RiskChart({ data }: RiskChartProps) {
  const chartData = [
    { name: "High Risk", value: data.high, color: COLORS.high },
    { name: "Medium Risk", value: data.medium, color: COLORS.medium },
    { name: "Low Risk", value: data.low, color: COLORS.low },
  ];

  const total = data.high + data.medium + data.low;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
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
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "0.5rem",
                padding: "0.75rem",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-slate-700">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
