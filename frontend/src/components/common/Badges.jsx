import React from 'react';

const SEVERITY_MAP = {
  critical: { label: 'Critical', cls: 'ck-badge-critical' },
  high:     { label: 'High',     cls: 'ck-badge-critical' },
  medium:   { label: 'Medium',   cls: 'ck-badge-warning' },
  warning:  { label: 'Warning',  cls: 'ck-badge-warning' },
  low:      { label: 'Low',      cls: 'ck-badge-safe' },
  benign:   { label: 'Benign',   cls: 'ck-badge-safe' },
  info:     { label: 'Info',     cls: 'ck-badge-unknown' },
  unknown:  { label: 'Unknown',  cls: 'ck-badge-unknown' },
};

export function SeverityBadge({ level = 'unknown', label }) {
  const { label: defaultLabel, cls } = SEVERITY_MAP[level?.toLowerCase()] || SEVERITY_MAP.unknown;
  return <span className={cls}>{label || defaultLabel}</span>;
}

export function StatusDot({ status = 'unknown', size = 'sm' }) {
  const colors = {
    critical: 'bg-status-critical',
    high: 'bg-status-critical',
    warning: 'bg-status-warning',
    medium: 'bg-status-warning',
    safe: 'bg-status-safe',
    operational: 'bg-status-safe',
    benign: 'bg-status-safe',
    unknown: 'bg-text-muted',
    info: 'bg-accent-cyan',
  };
  const sizes = { xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-2.5 h-2.5' };
  return (
    <span className={`inline-block rounded-full flex-shrink-0 ${sizes[size]} ${colors[status?.toLowerCase()] || colors.unknown}`} />
  );
}

export function PredictionBadge({ prediction }) {
  const lower = (prediction || '').toLowerCase();
  if (lower === 'benign' || lower === 'normal') return <span className="ck-badge-safe">{prediction}</span>;
  if (lower === 'unknown') return <span className="ck-badge-unknown">{prediction}</span>;
  return <span className="ck-badge-critical">{prediction}</span>;
}
