import React from 'react';
import { AlertTriangle, Activity, Shield } from 'lucide-react';
import { EmptyState } from '../common/States';

const metrics = [
  { key: 'total_records', label: 'Saved detection records', icon: Activity },
  { key: 'benign', label: 'Benign predictions', icon: Shield },
  { key: 'suspicious', label: 'Supported suspicious predictions', icon: AlertTriangle },
  { key: 'active_alerts', label: 'Active persisted alerts', icon: AlertTriangle },
];

export default function CyberGaugesPanel({ summary }) {
  return (
    <section className="rounded-lg border border-border bg-bg-secondary p-3.5 shadow-panel">
      <h2 className="mb-3 text-sm font-semibold text-text-primary">
        Stored Security Metrics
      </h2>
      {summary ? (
        <div className="space-y-2">
          {metrics.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg-card p-3">
              <span className="flex items-center gap-2 text-xs text-text-secondary">
                <Icon size={13} className="text-accent-emerald" />{label}
              </span>
              <span className="font-mono text-lg text-text-primary">
                {Number.isFinite(summary[key]) ? summary[key].toLocaleString() : 'N/A'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Metrics unavailable" description="Load the dashboard summary to display stored counts." />
      )}
    </section>
  );
}
