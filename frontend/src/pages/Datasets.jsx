import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Upload, Trash2, Eye, Database, AlertTriangle, CheckCircle,
  X, Play, FileText, Layers, Tag, ChevronRight
} from 'lucide-react';
import { LoadingState, EmptyState, ErrorState } from '../components/common/States';
import { datasetService } from '../services/datasetService';
import { useApp } from '../context/AppContext';

const STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  ready: 'Processed & Ready',
  error: 'Format Error',
};

export default function Datasets() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const { addNotification } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDatasets();
  }, []);

  async function fetchDatasets() {
    try {
      setLoading(true);
      const data = await datasetService.list();
      setDatasets(data.results || data || []);
      setError('');
    } catch (e) {
      setError('Could not connect to repository service. Please ensure backend is running.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Are you sure you want to delete dataset "${name}"?`)) return;
    try {
      await datasetService.delete(id);
      setDatasets(datasets.filter((d) => d.id !== id));
      if (selected?.id === id) setSelected(null);
      addNotification({
        message: `Dataset "${name}" removed from repository.`,
        time: 'Just now',
      });
    } catch (e) {
      alert('Failed to delete dataset.');
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-primary text-text-primary">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-shrink-0 bg-bg-secondary/30">
        <div>
          <h1 className="text-base font-semibold text-text-primary flex items-center gap-2">
            Dataset Repository & Schema Detection
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
          </h1>
          <p className="text-2xs text-text-muted">
            Uploaded CSV metadata and processing status from the backend
          </p>
        </div>
        <Link
          to="/threat-detection"
          className="ck-btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5 cursor-pointer shadow-glow-sm"
        >
          <Upload size={13} />
          <span>Ingest New Dataset</span>
        </Link>
      </div>

      {/* Advisory Note */}
      <div className="px-5 py-2 bg-bg-secondary/70 border-b border-border text-2xs text-text-muted flex items-center justify-between flex-shrink-0">
        <span className="flex items-center gap-2">
          <Database size={13} className="text-accent-emerald" />
          Recognized schema families: <strong className="text-text-primary">CICIDS2017</strong> ·{' '}
          <strong className="text-text-primary">NSL-KDD</strong> · <strong className="text-text-primary">UNSW-NB15</strong>
        </span>
        <span className="font-mono text-text-secondary">{datasets.length} Active Records</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && <LoadingState message="Fetching dataset catalog…" />}
        {error && <ErrorState message={error} onRetry={fetchDatasets} />}

        {!loading && !error && datasets.length === 0 && (
          <EmptyState
            icon={Database}
            title="No datasets found"
            description="Upload a CSV dataset from the Threat Detection engine to populate repository."
          />
        )}

        {!loading && !error && datasets.length > 0 && (
          <div className="ck-card border-[#1E2E28] overflow-hidden">
            <table className="ck-table">
              <thead>
                <tr>
                  <th>Dataset File</th>
                  <th>Total Rows</th>
                  <th>Feature Dimension</th>
                  <th>Detected Schema</th>
                  <th>Ingestion Date</th>
                  <th>Processing Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((d) => (
                  <tr key={d.id} className="hover:bg-bg-elevated transition-colors">
                    <td className="font-medium text-text-primary flex items-center gap-2">
                      <FileText size={14} className="text-accent-emerald flex-shrink-0" />
                      <span className="truncate max-w-xs">{d.name}</span>
                    </td>
                    <td className="font-mono text-text-secondary text-xs">
                      {d.rows != null ? d.rows.toLocaleString() : 'N/A'}
                    </td>
                    <td className="font-mono text-text-muted text-xs">
                      {d.columns != null ? `${d.columns} cols` : 'N/A'}
                    </td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-2xs uppercase font-mono bg-bg-secondary border border-border text-accent-cyan">
                        {d.schema_type || 'N/A'}
                      </span>
                    </td>
                    <td className="text-text-muted font-mono text-2xs">
                      {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td>
                      <span
                        className={`text-2xs font-semibold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                          d.status === 'ready'
                            ? 'text-status-safe'
                            : d.status === 'error'
                            ? 'text-status-critical'
                            : 'text-status-warning'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            d.status === 'ready' ? 'bg-status-safe' : 'bg-status-warning'
                          }`}
                        />
                        {STATUS_LABELS[d.status] || d.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelected(d)}
                          className="ck-btn px-2 py-1 text-2xs text-accent-emerald hover:border-accent-emerald flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={11} /> View Schema
                        </button>
                        <button
                          onClick={() => handleDelete(d.id, d.name)}
                          className="ck-btn px-2 py-1 text-2xs text-status-critical hover:border-status-critical flex items-center gap-1 cursor-pointer"
                          title="Delete Dataset"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dataset Details Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="ck-card w-full max-w-2xl p-6 border-accent-emerald/40 shadow-glow bg-[#101714]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-accent-emerald" />
                <div>
                  <h3 className="text-base font-semibold text-text-primary">{selected.name}</h3>
                  <span className="text-2xs text-text-muted font-mono">
                    ID: #{selected.id} · Schema: {selected.schema_type?.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-text-muted hover:text-text-secondary p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-2.5">
                <div className="p-3 bg-bg-secondary rounded border border-border">
                  <div className="text-2xs text-text-muted uppercase font-mono">Total Records</div>
                  <div className="text-lg font-bold font-mono text-text-primary mt-1">
                    {selected.rows != null ? selected.rows.toLocaleString() : 'N/A'}
                  </div>
                </div>
                <div className="p-3 bg-bg-secondary rounded border border-border">
                  <div className="text-2xs text-text-muted uppercase font-mono">Columns</div>
                  <div className="text-lg font-bold font-mono text-accent-cyan mt-1">
                    {selected.columns ?? 'N/A'}
                  </div>
                </div>
                <div className="p-3 bg-bg-secondary rounded border border-border">
                  <div className="text-2xs text-text-muted uppercase font-mono">File Volume</div>
                  <div className="text-lg font-bold font-mono text-text-primary mt-1">
                    {selected.file_size_bytes != null
                      ? `${(selected.file_size_bytes / 1024).toFixed(1)} KB`
                      : 'N/A'}
                  </div>
                </div>
                <div className="p-3 bg-bg-secondary rounded border border-border">
                  <div className="text-2xs text-text-muted uppercase font-mono">Status</div>
                  <div className="text-sm font-semibold font-mono text-status-safe mt-1">
                  {STATUS_LABELS[selected.status] || selected.status || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Label Distribution */}
              {selected.label_distribution && Object.keys(selected.label_distribution).length > 0 && (
                <div className="p-3.5 bg-bg-secondary rounded border border-border">
                  <div className="text-2xs font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5 font-mono">
                    <Tag size={12} className="text-accent-emerald" /> Ground Truth Label Distribution:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selected.label_distribution).map(([lbl, cnt]) => (
                      <div
                        key={lbl}
                        className="px-2.5 py-1 bg-bg-card border border-border rounded flex items-center gap-2 text-xs"
                      >
                        <span className="font-medium text-text-primary">{lbl}:</span>
                        <span className="font-mono text-accent-emerald font-semibold">{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(!selected.label_distribution || Object.keys(selected.label_distribution).length === 0) && (
                <p className="text-xs text-text-muted">No supported label column was found in this dataset.</p>
              )}

              {selected.missing_values && Object.keys(selected.missing_values).length > 0 && (
                <div className="p-3.5 bg-bg-secondary rounded border border-border">
                  <div className="text-2xs font-semibold text-text-secondary uppercase tracking-wider mb-2 font-mono">
                    Missing values by column
                  </div>
                  {Object.entries(selected.missing_values).map(([column, count]) => (
                    <div key={column} className="flex justify-between gap-3 text-xs">
                      <span className="truncate">{column}</span><span className="font-mono">{count}</span>
                    </div>
                  ))}
                </div>
              )}

              {selected.feature_summary && Object.keys(selected.feature_summary).length > 0 && (
                <div className="p-3.5 bg-bg-secondary rounded border border-border">
                  <div className="text-2xs font-semibold text-text-secondary uppercase tracking-wider mb-2 font-mono">
                    Numeric feature summaries
                  </div>
                  <div className="overflow-x-auto">
                    <table className="ck-table">
                      <thead><tr><th>Feature</th><th>Count</th><th>Mean</th><th>Min</th><th>Max</th></tr></thead>
                      <tbody>{Object.entries(selected.feature_summary).map(([feature, values]) => (
                        <tr key={feature}>
                          <td>{feature}</td><td>{values.count}</td>
                          <td>{Number(values.mean).toLocaleString()}</td>
                          <td>{Number(values.min).toLocaleString()}</td>
                          <td>{Number(values.max).toLocaleString()}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Feature List */}
              {selected.features_list && selected.features_list.length > 0 && (
                <div className="p-3.5 bg-bg-secondary rounded border border-border">
                  <div className="text-2xs font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5 font-mono">
                    <Layers size={12} className="text-accent-cyan" /> Features Indexed ({selected.features_list.length}):
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {selected.features_list.map((feat, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-2xs font-mono bg-bg-card border border-border/80 text-text-secondary"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
              <span className="text-2xs text-text-muted font-mono">
                Ingested: {selected.uploaded_at ? new Date(selected.uploaded_at).toLocaleString() : 'N/A'}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="ck-btn text-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    navigate('/threat-detection');
                  }}
                  className="ck-btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Play size={12} fill="currentColor" />
                  <span>Run Inference with this Dataset</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
