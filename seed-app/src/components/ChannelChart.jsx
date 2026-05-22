import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__date">{d.name}</div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__label">Visitors</span>
        <span className="chart-tooltip__value">{d.visitors.toLocaleString()}</span>
      </div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__label">Conversions</span>
        <span className="chart-tooltip__value">{d.conversions}</span>
      </div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__label">Revenue</span>
        <span className="chart-tooltip__value">${d.revenue.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function ChannelChart({ data }) {
  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <h2 className="chart-card__title">Channels</h2>
      </div>
      <div className="chart-card__body">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="visitors" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
