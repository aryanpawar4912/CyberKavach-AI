import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Search, ChevronLeft, ChevronRight, Filter, Shield,
  AlertTriangle, ArrowUpRight, CheckCircle, RefreshCw, X
} from 'lucide-react';
import { LoadingState, EmptyState, ErrorState } from '../components/common/States';
import { SeverityBadge, PredictionBadge, StatusDot } from '../components/common/Badges';
import { alertService, incidentService } from '../services/otherServices';
import { useApp } from '../context/AppContext';

const SEVERITIES = ['', 'critical', 'high', 'medium', 'warning', 'low'];
const STATUSES = ['', 'new', 'investigating', 'resolved', 'dismissed'];

export default function SecurityAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [escalating, setEscalating] = useState(false);

  const PAGE_SIZE = 20;
  const navigate = useNavigate();
  const { addNotification } = useApp();

  useEffect(() => {
    fetchAlerts();
  }, [page, severity, status]);

  async function fetchAlerts() {
    setLoading(true);
    try {
      const data = await alertService.list({ page, page_size: PAGE_SIZE, severity, status, search: search.trim() });
      const list = data.results || data || [];
      setAlerts(list);
      setTotal(data.count || list.length);
      setError('');
    } catch (e) {
      setError('Could not fetch security alerts from backend.');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, newStatus) {
    try {
      await alertService.update(id, { status: newStatus });
      setAlerts(alerts.map((a) => (a.id === id ? { ...a, status: newStatus } : a)));
      if (selected?.id === id) setSelected({ ...selected, status: newStatus });
      addNotification({
        message: `Alert #${id} status changed to ${newStatus.toUpperCase()}`,
        time: 'Just now',
      });
    } catch (e) {
      alert('Status update failed.');
    }
  }

  async function handleEscalate() {
    if (!selected) return;
    setEscalating(true);
    try {
      const newInc = await incidentService.create({
        title: `Suspected ${selected.prediction} targeting ${selected.source_ip || 'internal endpoint'}`,
        severity: selected.severity || 'high',
        status: 'investigating',
        assigned_to: '',
        description: `Escalated directly from ML alert #${selected.id}. Model detected suspicious traffic pattern from ${selected.source_ip || 'host'}.`,
      });

      // Mark alert as investigating
      await updateStatus(selected.id, 'investigating');

      addNotification({
        message: `Escalated to Case Incident INC-${newInc.id}.`,
        time: 'Just now',
      });

      navigate('/incidents');
    } catch (e) {
      alert('Failed to escalate alert.');
    } finally {
      setEscalating(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-primary text-text-primary">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3 flex-shrink-0 bg-bg-secondary/30">
        <div>
          <h1 className="text-base font-semibold text-text-primary flex items-center gap-2">
            Security Alerts & Anomaly Queue
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
          </h1>
          <p className="text-2xs text-text-muted">
            Model-flagged suspicious packets requiring operational triage and analyst confirmation
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-bg-card border border-border rounded px-2.5 py-1 text-xs">
            <Search size={12} className="text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAlerts()}
              placeholder="Search alert, IP…"
              className="bg-transparent text-xs outline-none text-text-primary placeholder-text-muted w-32"
            />
          </div>

          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="ck-input py-1 text-xs w-32"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s ? s.toUpperCase() : 'All Severity'}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="ck-input py-1 text-xs w-32"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s ? s.toUpperCase() : 'All Status'}
              </option>
            ))}
          </select>

          <button onClick={fetchAlerts} className="ck-btn p-1.5" title="Refresh">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Table column */}
        <div className={`flex flex-col overflow-hidden ${selected ? 'w-1/2' : 'w-full'}`}>
          <div className="flex-1 overflow-y-auto p-4">
            {loading && <LoadingState message="Fetching security alerts queue…" />}
            {error && <ErrorState message={error} onRetry={fetchAlerts} />}
            {!loading && !error && alerts.length === 0 && (
              <EmptyState icon={Bell} title="No security alerts match filters" />
            )}
            {!loading && !error && alerts.length > 0 && (
              <div className="ck-card border-[#1E2E28] overflow-hidden">
                <table className="ck-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Attack Vector</th>
                      <th>Originating IP</th>
                      <th>Classifying Model</th>
                      <th>Detected At</th>
                      <th>Triage Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((a) => (
                      <tr
                        key={a.id}
                        onClick={() => setSelected(a)}
                        className={`cursor-pointer transition-colors ${
                          selected?.id === a.id ? 'bg-bg-elevated border-l-2 border-accent-emerald' : ''
                        }`}
                      >
                        <td>
                          <SeverityBadge level={a.severity} />
                        </td>
                        <td>
                          <PredictionBadge prediction={a.prediction} />
                        </td>
                        <td className="font-mono text-2xs text-accent-cyan">{a.source_ip || 'N/A'}</td>
                        <td className="text-text-muted text-xs">{a.model_name || 'N/A'}</td>
                        <td className="text-text-muted font-mono text-2xs">
                          {new Date(a.created_at).toLocaleTimeString()}
                        </td>
                        <td>
                          <span
                            className={`text-2xs font-semibold uppercase tracking-wider font-mono ${
                              a.status === 'new'
                                ? 'text-status-warning'
                                : a.status === 'investigating'
                                ? 'text-accent-cyan'
                                : a.status === 'resolved'
                                ? 'text-status-safe'
                                : 'text-text-muted'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-text-muted">
              <span>{total} total alerts in queue</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="ck-btn p-1 disabled:opacity-40"
                >
                  <ChevronLeft size={12} />
                </button>
                <span>Page {page} of {Math.ceil(total / PAGE_SIZE)}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / PAGE_SIZE)}
                  className="ck-btn p-1 disabled:opacity-40"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-1/2 border-l border-border overflow-y-auto p-4 bg-bg-secondary/20 space-y-4 animate-slide-in">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <span className="text-2xs font-mono text-accent-emerald uppercase tracking-wider">
                  ALERT #{selected.id}
                </span>
                <h3 className="text-base font-semibold text-text-primary mt-0.5">
                  {selected.prediction} Threat Flag
                </h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-text-muted hover:text-text-secondary p-1"
              >
                <X size={15} />
              </button>
            </div>

            {/* Alert Parameters */}
            <div className="ck-card p-3.5 space-y-2.5 text-xs border-[#1E2E28]">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Threat Classification</span>
                <PredictionBadge prediction={selected.prediction} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Assigned Severity</span>
                <SeverityBadge level={selected.severity} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Detection Model</span>
                <span className="text-text-primary font-medium">{selected.model_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Originating Host IP</span>
                <span className="font-mono text-accent-cyan font-semibold">{selected.source_ip || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Detected Timestamp</span>
                <span className="font-mono text-text-secondary">
                  {new Date(selected.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Workflow Action: Update Status */}
            <div className="ck-card p-3 border-[#1E2E28]">
              <div className="ck-section-title mb-2">Update Triage Status</div>
              <div className="grid grid-cols-4 gap-1.5">
                {['new', 'investigating', 'resolved', 'dismissed'].map((st) => (
                  <button
                    key={st}
                    onClick={() => updateStatus(selected.id, st)}
                    className={`px-2 py-1.5 rounded text-2xs uppercase font-mono font-semibold border transition-all cursor-pointer ${
                      selected.status === st
                        ? 'border-accent-emerald bg-accent-glow text-accent-emerald shadow-glow-sm'
                        : 'border-border bg-bg-card text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Escalate to Incident Docket */}
            <div className="p-3.5 bg-bg-secondary rounded border border-border space-y-2">
              <div className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Shield size={14} className="text-accent-emerald" /> Escalate to Incident Response Docket
              </div>
              <p className="text-2xs text-text-muted leading-relaxed">
                Promote this unconfirmed alert to an official case incident for root-cause analysis and threat containment.
              </p>
              <button
                onClick={handleEscalate}
                disabled={escalating}
                className="ck-btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-glow-sm mt-2"
              >
                <span>{escalating ? 'Opening Incident Docket…' : 'Escalate to Formal Incident'}</span>
                <ArrowUpRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
