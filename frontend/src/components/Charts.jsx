import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatClock, formatDateTime, formatHour } from "../lib/format";

const INK = "#15191C";
const GRID = "#CBD0D4";
const ACCENT = "#E8430C";
const tickStyle = { fontSize: 12, fill: "#4B555C" };

function TooltipBox({ active, payload, title, unit }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div className="chart-tip">
      <strong>{title(row)}</strong>
      <span>
        {payload[0].value} {unit}
      </span>
    </div>
  );
}

export function CountChart({ records }) {
  const data = [...records].reverse().map((r) => ({ ...r, label: formatClock(r.timestamp) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: -8 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={28} />
        <YAxis allowDecimals={false} tick={tickStyle} tickLine={false} axisLine={false} width={40} />
        <Tooltip content={<TooltipBox title={(row) => formatDateTime(row.timestamp)} unit="people" />} />
        <Line type="stepAfter" dataKey="count" stroke={INK} strokeWidth={2} dot={{ r: 3, fill: ACCENT, stroke: INK }} activeDot={{ r: 5 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function HourlyChart({ hourly }) {
  const data = hourly.map((h) => ({ ...h, label: formatHour(h.hour) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: -8 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
        <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={40} />
        <Tooltip cursor={{ fill: "rgba(21,25,28,0.06)" }} content={<TooltipBox title={(row) => row.label} unit="people on average" />} />
        <Bar dataKey="avg_count" fill={INK} radius={[2, 2, 0, 0]} maxBarSize={64} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
