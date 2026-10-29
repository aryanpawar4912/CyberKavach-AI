import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const COLORS = {
  emerald: '#526b50',
  cyan: '#788875',
  unclassified: '#99917f',
  critical: '#a25548',
  warning: '#a77b43',
  muted: '#ddd7c8',
  text: '#68685c',
};

const CustomTooltipStyle = {
  contentStyle: { background: '#fbf9f2', border: '1px solid #d3cebf', borderRadius: 8, fontSize: 11, boxShadow: '0 8px 24px rgba(48,46,37,0.12)' },
  labelStyle: { color: '#596055', fontWeight: 600 },
  itemStyle: { color: '#292d27' },
};

// ── Activity Line/Area Chart ──────────────────────────────────────────────────
export function ActivityChart({ data = [], height = 120 }) {
  if (!data.length) return <div className="flex items-center justify-center h-24 text-2xs text-text-muted">No activity data</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradEmerald" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.critical} stopOpacity={0.25} />
            <stop offset="95%" stopColor={COLORS.critical} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradUnclassified" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.unclassified} stopOpacity={0.2} />
            <stop offset="95%" stopColor={COLORS.unclassified} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={COLORS.muted} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: COLORS.text, fontSize: 9 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: COLORS.text, fontSize: 9 }} tickLine={false} axisLine={false} />
        <Tooltip {...CustomTooltipStyle} />
        <Area type="monotone" dataKey="benign" stroke={COLORS.emerald} fill="url(#gradEmerald)" strokeWidth={1.5} dot={false} name="Benign" />
        <Area type="monotone" dataKey="suspicious" stroke={COLORS.critical} fill="url(#gradCritical)" strokeWidth={1.5} dot={false} name="Suspicious" />
        <Area type="monotone" dataKey="unclassified" stroke={COLORS.unclassified} fill="url(#gradUnclassified)" strokeWidth={1.5} dot={false} name="Unclassified" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Bar Chart ────────────────────────────────────────────────────────────────
export function ThreatBarChart({ data = [], height = 120 }) {
  if (!data.length) return <div className="flex items-center justify-center h-24 text-2xs text-text-muted">No data</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.muted} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="category" tick={{ fill: COLORS.text, fontSize: 9 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: COLORS.text, fontSize: 9 }} tickLine={false} axisLine={false} />
        <Tooltip {...CustomTooltipStyle} />
        <Bar dataKey="count" fill={COLORS.emerald} radius={[2, 2, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Donut / Pie ───────────────────────────────────────────────────────────────
export function ThreatDonut({ data = [], height = 120 }) {
  const PIE_COLORS = [COLORS.emerald, COLORS.critical, COLORS.warning, COLORS.cyan, '#747461', '#b29b6c'];
  if (!data.length) return <div className="flex items-center justify-center h-24 text-2xs text-text-muted">No data</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%"
          dataKey="value" nameKey="name" paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />)}
        </Pie>
        <Tooltip {...CustomTooltipStyle} />
        <Legend
          iconType="circle" iconSize={6}
          formatter={(v) => <span style={{ color: COLORS.text, fontSize: 10 }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Mini sparkline ──────────────────────────────────────────────────────────
export function MiniSparkline({ data = [], color = COLORS.emerald, height = 40 }) {
  if (!data.length) return null;
  const points = data.map((v, i) => ({ v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Alert Intensity histogram ─────────────────────────────────────────────────
export function AlertIntensityChart({ data = [], height = 80 }) {
  if (!data.length) return <div className="flex items-center justify-center h-16 text-2xs text-text-muted">No alerts</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 2, right: 2, left: -28, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fill: COLORS.text, fontSize: 8 }} tickLine={false} axisLine={false} />
        <YAxis hide />
        <Tooltip {...CustomTooltipStyle} />
        <Bar dataKey="value" fill={COLORS.critical} radius={[1, 1, 0, 0]} maxBarSize={8}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.value > 10 ? COLORS.critical : entry.value > 5 ? COLORS.warning : COLORS.emerald} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
