import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function MetricPanel({ label, value, sub, trend, icon: Icon, accent = false, className = '' }) {
  const trendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-status-critical' : trend < 0 ? 'text-status-safe' : 'text-text-muted';
  const TrendIcon = trendIcon;

  return (
    <div className={`ck-card p-3 ${accent ? 'border-accent-emerald/20 shadow-glow-sm' : ''} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="ck-metric-label truncate">{label}</div>
          <div className="ck-metric-value mt-1">{value ?? '—'}</div>
          {sub && <div className="text-2xs text-text-muted mt-0.5">{sub}</div>}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {Icon && <Icon size={14} className={accent ? 'text-accent-emerald' : 'text-text-muted'} strokeWidth={1.5} />}
          {trend !== undefined && (
            <div className={`flex items-center gap-0.5 text-2xs ${trendColor}`}>
              <TrendIcon size={10} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
