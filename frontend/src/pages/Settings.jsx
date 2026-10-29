import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Shield, Database, Activity, CheckCircle, RefreshCw } from 'lucide-react';
import { healthService } from '../services/otherServices';

export default function Settings() {
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    checkHealth();
  }, []);

  async function checkHealth() {
    setChecking(true);
    try {
      const data = await healthService.check();
      setHealth(data);
    } catch (e) {
      setHealth({ status: 'error', message: 'Backend service unreachable' });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-primary text-text-primary">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-shrink-0 bg-bg-secondary/30">
        <div>
          <h1 className="text-base font-semibold text-text-primary flex items-center gap-2">
            System Settings & Service Diagnostics
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
          </h1>
          <p className="text-2xs text-text-muted">
            Environment parameters, active database connection, and API connectivity status
          </p>
        </div>
        <button
          onClick={checkHealth}
          disabled={checking}
          className="ck-btn flex items-center gap-1.5 text-xs"
        >
          <RefreshCw size={12} className={checking ? 'animate-spin' : ''} />
          <span>Sync Status</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 max-w-3xl">
        {/* System Health */}
        <div className="ck-card p-4 border-[#1E2E28] bg-[#101714]">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-accent-emerald" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                Live Backend Diagnostics
              </h2>
            </div>
            {health && (
              <span
                className={`px-2 py-0.5 rounded text-2xs font-mono font-semibold uppercase ${
                  health.status === 'healthy'
                    ? 'bg-status-safe-dim text-status-safe border border-status-safe/30'
                    : 'bg-status-warning-dim text-status-warning border border-status-warning/30'
                }`}
              >
                {health.status}
              </span>
            )}
          </div>

          {health ? (
            <div className="space-y-2 text-xs">
              {Object.entries(health).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0"
                >
                  <span className="text-text-muted capitalize font-mono text-2xs">
                    {k.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`font-mono ${
                      typeof v === 'boolean'
                        ? v
                          ? 'text-status-safe font-semibold'
                          : 'text-status-critical font-semibold'
                        : 'text-text-primary font-medium'
                    }`}
                  >
                    {typeof v === 'boolean' ? (v ? 'ONLINE' : 'FAILED') : String(v)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-text-muted">
              Querying backend service diagnostics…
            </div>
          )}
        </div>

        {/* API config */}
        <div className="ck-card p-4 border-[#1E2E28] bg-[#101714]">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
            <Shield size={15} className="text-accent-emerald" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
              API & Environment Configuration
            </h2>
          </div>
          <div className="text-xs space-y-2.5 font-mono">
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-text-muted">API Target Base URL:</span>
              <span className="text-accent-cyan">
                {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-text-muted">App Environment:</span>
              <span className="text-text-primary">
                {import.meta.env.DEV ? 'Development (Local Workspace)' : 'Production'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-text-muted">Model Weight Storage:</span>
              <span className="text-text-secondary">backend/trained_models/ (trusted server-side artifacts)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-muted">Session Token Standard:</span>
              <span className="text-accent-emerald">JWT (RFC 7519 / SimpleJWT)</span>
            </div>
          </div>
        </div>

        {/* Dataset guidelines */}
        <div className="ck-card p-4 border-[#1E2E28] bg-[#101714]">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
            <Database size={15} className="text-accent-emerald" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
              Benchmark Dataset Schema Mappings
            </h2>
          </div>
          <div className="text-xs text-text-muted space-y-2 leading-relaxed">
            <p>
              <strong className="text-text-primary font-mono">CICIDS2017:</strong> Network flow metrics
              featuring 80+ packet duration, backward/forward flow rates, and multi-class attack categories
              (DDoS, PortScan, Infiltration, Brute Force).
            </p>
            <p>
              <strong className="text-text-primary font-mono">NSL-KDD:</strong> Refined network intrusion
              dataset with 41 core attributes mapping DoS, Probe, R2L, and U2R vectors.
            </p>
            <p>
              <strong className="text-text-primary font-mono">UNSW-NB15:</strong> Modern intrusion features
              incorporating synthetic contemporary attacks across 49 features.
            </p>
          </div>
        </div>

        <div className="p-3 bg-bg-secondary rounded border border-border text-2xs text-text-muted font-mono">
          CyberKavach AI SOC Command Platform · Release v1.0.0
        </div>
      </div>
    </div>
  );
}
