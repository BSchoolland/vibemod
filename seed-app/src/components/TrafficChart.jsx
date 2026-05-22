import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  AreaChart,
  BarChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const CHART_TYPES = [
  { id: "area", label: "Area" },
  { id: "line", label: "Line" },
  { id: "bar", label: "Bar" },
];

const METRICS = {
  visitors: { color: "#6366f1", label: "Visitors" },
  pageViews: { color: "#06b6d4", label: "Page Views" },
  sessions: { color: "#f59e0b", label: "Sessions" },
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__date">{formatDate(label)}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="chart-tooltip__row">
          <span className="chart-tooltip__dot" style={{ background: entry.color }} />
          <span className="chart-tooltip__label">{METRICS[entry.name]?.label || entry.name}</span>
          <span className="chart-tooltip__value">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function TrafficChart({ data, activeMetric }) {
  const [chartType, setChartType] = useState("area");

  const visibleMetrics = activeMetric
    ? [activeMetric]
    : ["visitors", "pageViews", "sessions"];

  const formatTick = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 20, left: 0, bottom: 5 },
    };

    const axisProps = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tickFormatter={formatTick}
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
          interval={Math.floor(data.length / 6)}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
        />
        <Tooltip content={<CustomTooltip />} />
      </>
    );

    if (chartType === "bar") {
      return (
        <BarChart {...commonProps}>
          {axisProps}
          {visibleMetrics.map((metric) => (
            <Bar
              key={metric}
              dataKey={metric}
              fill={METRICS[metric].color}
              radius={[4, 4, 0, 0]}
              opacity={0.85}
            />
          ))}
        </BarChart>
      );
    }

    if (chartType === "line") {
      return (
        <LineChart {...commonProps}>
          {axisProps}
          {visibleMetrics.map((metric) => (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={METRICS[metric].color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      );
    }

    // Default: area
    return (
      <AreaChart {...commonProps}>
        {axisProps}
        {visibleMetrics.map((metric) => (
          <Area
            key={metric}
            type="monotone"
            dataKey={metric}
            stroke={METRICS[metric].color}
            fill={METRICS[metric].color}
            fillOpacity={0.1}
            strokeWidth={2}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        ))}
      </AreaChart>
    );
  };

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <h2 className="chart-card__title">Traffic Overview</h2>
        <div className="chart-type-toggle">
          {CHART_TYPES.map((type) => (
            <button
              key={type.id}
              className={`chart-type-toggle__btn ${chartType === type.id ? "chart-type-toggle__btn--active" : ""}`}
              onClick={() => setChartType(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-card__body">
        <ResponsiveContainer width="100%" height={320}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
