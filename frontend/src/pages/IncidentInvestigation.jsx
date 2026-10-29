import React, { useState, useEffect } from 'react';
import {
  Microscope, Plus, ChevronLeft, ChevronRight, CheckCircle,
  AlertTriangle, X, Shield, Clock, User, FileText
} from 'lucide-react';
import { LoadingState, EmptyState, ErrorState } from '../components/common/States';
import { SeverityBadge, PredictionBadge } from '../components/common/Badges';
import { incidentService } from '../services/otherServices';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export default function IncidentInvestigation() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // New Incident Modal State
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState('high');
  const [newStatus, setNewStatus] = useState('open');
  const { user } = useAuth();
  const [newAssigned, setNewAssigned] = useState(user?.username || '');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState('');

  const { addNotification } = useApp();

  useEffect(() => {
    fetchIncidents();
  }, []);

  async function fetchIncidents() {
    setLoading(true);
    try {
      const data = await incidentService.list();
      const list = data.results || data || [];
      setIncidents(list);
      if (list.length > 0 && !selected) {
        setSelected(list[0]);
      }
      setError('');
    } catch (e) {
      setError('Could not load incidents from server.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateIncident(e) {
    e.preventDefault();
    if (!newTitle.trim()) {
      setModalError('Incident title is required.');
      return;
    }

    setCreating(true);
    setModalError('');

    try {
      const payload = {
        title: newTitle.trim(),
        severity: newSeverity,
        status: newStatus,
        assigned_to: newAssigned.trim(),
        description: newDesc.trim(),
      };

      const created = await incidentService.create(payload);
      setIncidents([created, ...incidents]);
      setSelected(created);
      setShowModal(false);
      setNewTitle('');
      setNewDesc('');

      addNotification({
        message: `Incident INC-${created.id} ("${created.title}") registered.`,
        time: 'Just now',
      });
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Failed to create incident.');
    } finally {
      setCreating(false);
    }
  }

  async function addNote() {
    if (!note.trim() || !selected) return;
    setSavingNote(true);
    try {
      const updated = await incidentService.update(selected.id, { note });
      setSelected(updated);
      setIncidents(incidents.map((i) => (i.id === selected.id ? updated : i)));
      setNote('');
    } catch (e) {
      alert('Failed to append analyst note.');
    } finally {
      setSavingNote(false);
    }
  }

  async function updateStatus(id, newSt) {
    try {
      await incidentService.update(id, { status: newSt });
      const updated = { ...selected, status: newSt };
      setSelected(updated);
      setIncidents(incidents.map((i) => (i.id === id ? updated : i)));
      addNotification({
        message: `INC-${id} marked as ${newSt.toUpperCase()}`,
        time: 'Just now',
      });
    } catch (e) {
      alert('Status update failed.');
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-primary text-text-primary">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-shrink-0 bg-bg-secondary/30">
        <div>
          <h1 className="text-base font-semibold text-text-primary flex items-center gap-2">
            Incident Investigation Workspace
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
          </h1>
          <p className="text-2xs text-text-muted">
            Formal investigation docket linking model detections, timeline events, and response actions
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="ck-btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5 cursor-pointer shadow-glow-sm"
        >
          <Plus size={13} />
          <span>New Incident</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Incident List column */}
        <div className={`flex flex-col overflow-hidden ${selected ? 'w-1/2' : 'w-full'}`}>
          <div className="flex-1 overflow-y-auto p-4">
            {loading && <LoadingState message="Loading incident tickets…" />}
            {error && <ErrorState message={error} onRetry={fetchIncidents} />}
            {!loading && !error && incidents.length === 0 && (
              <EmptyState
                icon={Microscope}
                title="No active incidents"
                description="Create an incident to coordinate SOC response."
              />
            )}
            {!loading && !error && incidents.length > 0 && (
              <div className="ck-card border-[#1E2E28] overflow-hidden">
                <table className="ck-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Incident Title</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Assigned Responder</th>
                      <th>Logged Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((inc) => (
                      <tr
                        key={inc.id}
                        onClick={() => setSelected(inc)}
                        className={`cursor-pointer transition-colors ${
                          selected?.id === inc.id
                            ? 'bg-bg-elevated border-l-2 border-accent-emerald'
                            : ''
                        }`}
                      >
                        <td className="font-mono text-text-muted text-2xs font-semibold">
                          INC-{inc.id}
                        </td>
                        <td className="font-medium text-text-primary max-w-xs truncate">
                          {inc.title}
                        </td>
                        <td>
                          <SeverityBadge level={inc.severity} />
                        </td>
                        <td>
                          <span
                            className={`text-2xs font-semibold uppercase tracking-wider font-mono ${
                              inc.status === 'open'
                                ? 'text-status-warning'
                                : inc.status === 'investigating'
                                ? 'text-accent-cyan'
                                : inc.status === 'resolved'
                                ? 'text-status-safe'
                                : 'text-text-muted'
                            }`}
                          >
                            {inc.status}
                          </span>
                        </td>
                        <td className="text-text-secondary text-xs truncate max-w-28">
                          {inc.assigned_to || 'Unassigned'}
                        </td>
                        <td className="text-text-muted text-2xs font-mono">
                          {new Date(inc.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Incident Detail Column */}
        {selected && (
          <div className="w-1/2 border-l border-border overflow-y-auto p-4 bg-bg-secondary/20 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <span className="text-2xs font-mono text-accent-emerald uppercase tracking-wider">
                  CASE FILE #INC-{selected.id}
                </span>
                <h3 className="text-base font-semibold text-text-primary mt-0.5">{selected.title}</h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-text-muted hover:text-text-secondary p-1"
              >
                <X size={15} />
              </button>
            </div>

            {/* Status and Parameters Card */}
            <div className="ck-card p-3.5 space-y-2.5 text-xs border-[#1E2E28]">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Assigned Investigator</span>
                <span className="text-text-primary font-semibold flex items-center gap-1.5">
                  <User size={12} className="text-accent-emerald" /> {selected.assigned_to || 'Unassigned'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Threat Severity</span>
                <SeverityBadge level={selected.severity} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Investigation Phase</span>
                <span className="font-mono font-semibold uppercase text-accent-cyan">
                  {selected.status}
                </span>
              </div>
              {selected.description && (
                <div className="pt-2.5 mt-2.5 border-t border-border text-text-secondary text-xs leading-relaxed">
                  <div className="text-2xs text-text-muted uppercase font-mono mb-1">Incident Summary:</div>
                  {selected.description}
                </div>
              )}
            </div>

            {/* Workflow status updater */}
            <div className="ck-card p-3 border-[#1E2E28]">
              <div className="ck-section-title mb-2">Advance Investigation Status</div>
              <div className="grid grid-cols-4 gap-1.5">
                {['open', 'investigating', 'resolved', 'closed'].map((st) => (
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

            {/* Analyst Timeline & Notes */}
            <div className="ck-card p-3.5 border-[#1E2E28]">
              <div className="ck-section-title mb-3 flex items-center justify-between">
                <span>Investigation Timeline & Notes</span>
                <span className="text-2xs text-text-muted font-mono">
                  {(selected.notes || []).length} recorded
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto mb-3 pr-1">
                {(selected.notes || []).map((n, i) => (
                  <div key={i} className="p-2.5 bg-bg-secondary rounded border border-border/70 text-xs">
                    <div className="text-text-primary leading-relaxed">{n.text}</div>
                    <div className="text-2xs text-text-muted mt-1.5 flex items-center justify-between font-mono">
                      <span className="text-accent-cyan">@{n.author || 'Unknown author'}</span>
                      <span>{n.at ? new Date(n.at).toLocaleTimeString() : 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Note Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                  placeholder="Record investigation findings or mitigation step…"
                  className="ck-input text-xs"
                />
                <button
                  onClick={addNote}
                  disabled={savingNote || !note.trim()}
                  className="ck-btn-primary px-3 text-xs disabled:opacity-40 cursor-pointer flex-shrink-0"
                >
                  {savingNote ? 'Adding…' : 'Post Note'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create New Incident Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="ck-card w-full max-w-md p-5 border-accent-emerald/40 shadow-glow bg-[#101714]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Shield size={16} className="text-accent-emerald" /> Create Incident Docket
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-text-muted hover:text-text-secondary"
              >
                <X size={15} />
              </button>
            </div>

            {modalError && (
              <div className="mb-3 p-2 bg-status-critical-dim border border-status-critical/30 rounded text-xs text-status-critical">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateIncident} className="space-y-3">
              <div>
                <label className="ck-label block mb-1">Incident Headline / Target</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Distributed SYN Flood targeting Substation B"
                  className="ck-input text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ck-label block mb-1">Severity Level</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value)}
                    className="ck-input text-xs"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="ck-label block mb-1">Assigned Investigator</label>
                  <input
                    type="text"
                    value={newAssigned}
                    onChange={(e) => setNewAssigned(e.target.value)}
                    placeholder="Optional username"
                    className="ck-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="ck-label block mb-1">Initial Scope & Description</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Detail anomalous indicators, flow volume, or suspected lateral movement…"
                  className="ck-input text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="ck-btn text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="ck-btn-primary text-xs px-4 flex items-center gap-1.5 cursor-pointer"
                >
                  {creating ? 'Registering…' : 'Open Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
