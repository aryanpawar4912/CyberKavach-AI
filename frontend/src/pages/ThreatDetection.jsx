import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, FileText, Play, AlertTriangle, CheckCircle, X, ChevronDown,
  Download, Database, Shield, ShieldAlert, Cpu, Search, Sparkles
} from 'lucide-react';
import { LoadingState, EmptyState } from '../components/common/States';
import { PredictionBadge } from '../components/common/Badges';
import { datasetService } from '../services/datasetService';
import { detectionService } from '../services/detectionService';
import { useApp } from '../context/AppContext';

const MODELS = [
  { id: 'random_forest', name: 'Random Forest', tag: 'Baseline Recommended' },
  { id: 'decision_tree', name: 'Decision Tree', tag: 'Fast Inference' },
  { id: 'svm', name: 'Support Vector Machine', tag: 'Linear Boundary' },
];

export default function ThreatDetection() {
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [file, setFile] = useState(null);
  const [selectedModel, setSelectedModel] = useState('random_forest');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [runStep, setRunStep] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const fileRef = useRef();
  const { addNotification } = useApp();

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const data = await datasetService.list();
      const list = (data.results || data || []).filter((dataset) => dataset.status === 'ready');
      setAvailableDatasets(list);
      if (list.length > 0 && !selectedDataset) {
        setSelectedDatasetId(list[0].id);
        setSelectedDataset(list[0]);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load processed datasets.');
    }
  };

  const handleSelectExisting = (id) => {
    setSelectedDatasetId(id);
    const found = availableDatasets.find((d) => String(d.id) === String(id));
    setSelectedDataset(found || null);
    setFile(null);
    setResults(null);
    setError('');
  };

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Only CSV format flow datasets are supported.');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('File must be under 50 MB.');
      return;
    }
    setFile(f);
    setSelectedDatasetId('');
    setSelectedDataset(null);
    setError('');
    setResults(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const data = await datasetService.upload(file, setUploadProgress);
      setSelectedDataset(data);
      setSelectedDatasetId(data.id);
      await loadDatasets();
      addNotification({
        message: `Dataset "${data.name}" uploaded & parsed successfully.`,
        time: 'Just now',
      });
    } catch (e) {
      setError(e.response?.data?.error || 'Upload failed. Check backend service.');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyse = async () => {
    const targetId = selectedDatasetId || selectedDataset?.id;
    if (!targetId) {
      setError('Select or upload a dataset before running inference.');
      return;
    }

    setRunning(true);
    setError('');
    setResults(null);
    setPage(1);

    try {
      setRunStep(`Executing ${selectedModel.replace('_', ' ')} inference…`);

      const data = await detectionService.predict(targetId, selectedModel);
      setResults(data);

      addNotification({
        message: `Analysis completed: ${data.suspicious_count} suspicious attack vectors flagged.`,
        time: 'Just now',
      });
    } catch (e) {
      setError(e.response?.data?.error || 'Threat analysis failed.');
    } finally {
      setRunning(false);
      setRunStep('');
    }
  };

  // Export current predictions as CSV
  const handleExportCSV = () => {
    if (!results || !results.predictions) return;
    const headers = ['#', 'Prediction', 'Confidence', 'Model', 'Source IP', 'Destination IP', 'Timestamp'];
    const rows = results.predictions.map((p, idx) => [
      idx + 1,
      p.prediction,
      p.confidence != null ? (p.confidence * 100).toFixed(1) + '%' : 'N/A',
      p.model_name || selectedModel,
      p.source_ip || 'N/A',
      p.destination_ip || 'N/A',
      p.timestamp || 'N/A',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cyberkavach_predictions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPredictions = (results?.predictions || []).filter((p) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (p.prediction || '').toLowerCase().includes(q) ||
      (p.source_ip || '').toLowerCase().includes(q) ||
      (p.destination_ip || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredPredictions.length / pageSize) || 1;
  const paginatedPredictions = filteredPredictions.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-primary text-text-primary">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-shrink-0 bg-bg-secondary/30">
        <div>
          <h1 className="text-base font-semibold text-text-primary flex items-center gap-2">
            Threat Detection Engine
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
          </h1>
          <p className="text-2xs text-text-muted">
            Batch ML classifier evaluating network flow telemetry against trained decision boundaries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded text-2xs bg-bg-card border border-border text-accent-cyan flex items-center gap-1 font-mono">
            <Cpu size={12} /> BATCH INFERENCE
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Step 1: Dataset Selection */}
        <div className="ck-card p-4 border-[#1E2E28]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="ck-section-title flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-accent-emerald text-bg-primary font-bold text-2xs flex items-center justify-center">
                1
              </span>
              Select Target Dataset
            </h2>
            {availableDatasets.length > 0 && (
              <span className="text-2xs text-text-muted font-mono">
                {availableDatasets.length} dataset(s) available in repository
              </span>
            )}
          </div>

          {/* Quick select from existing repository */}
          {availableDatasets.length > 0 && (
            <div className="mb-3 p-3 bg-bg-secondary rounded border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                  <Database size={13} className="text-accent-emerald" /> Choose Pre-Loaded Benchmark:
                </span>
                <span className="text-2xs text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/30 px-1.5 py-0.5 rounded font-mono">
                  VERIFIED FORMAT
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {availableDatasets.map((ds) => (
                  <button
                    key={ds.id}
                    type="button"
                    onClick={() => handleSelectExisting(ds.id)}
                    className={`p-2.5 rounded text-left border transition-all flex items-center justify-between ${
                      String(selectedDatasetId) === String(ds.id)
                        ? 'border-accent-emerald bg-accent-glow shadow-glow-sm'
                        : 'border-border bg-bg-card hover:border-accent-emerald/40'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="text-xs font-semibold text-text-primary truncate">{ds.name}</div>
                      <div className="text-2xs text-text-muted font-mono mt-0.5">
                        {ds.rows != null ? ds.rows.toLocaleString() : 'N/A'} records · {ds.columns ?? 'N/A'} columns
                      </div>
                    </div>
                    {String(selectedDatasetId) === String(ds.id) && (
                      <CheckCircle size={15} className="text-accent-emerald flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Or Drag & Drop Custom CSV */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center gap-2 cursor-pointer transition-all ${
              dragOver
                ? 'border-accent-emerald bg-accent-glow'
                : 'border-border hover:border-accent-emerald/50 bg-bg-secondary/40'
            }`}
          >
            <Upload size={22} className="text-text-muted" strokeWidth={1.5} />
            <div className="text-center">
              <span className="text-xs text-text-secondary font-medium">
                Upload Custom CSV Stream (Optional)
              </span>
              <p className="text-2xs text-text-muted mt-0.5">
                Supports CICIDS2017, NSL-KDD, UNSW-NB15 flow exports up to 50 MB
              </p>
            </div>
            {file && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 mt-2 px-3 py-1 bg-bg-card border border-accent-emerald/30 rounded text-xs text-text-primary font-mono"
              >
                <FileText size={12} className="text-accent-emerald" />
                <span>{file.name}</span>
                <span className="text-text-muted text-2xs">({(file.size / 1024).toFixed(1)} KB)</span>
                <button
                  onClick={() => setFile(null)}
                  className="text-text-muted hover:text-status-critical ml-1.5"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />

          {file && !selectedDatasetId && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="ck-btn-primary mt-3 flex items-center gap-2 text-xs"
            >
              {uploading ? (
                <>
                  <div className="w-3 h-3 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                  <span>Parsing Dataset… {uploadProgress}%</span>
                </>
              ) : (
                <>
                  <Upload size={13} />
                  <span>Ingest & Parse File</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Step 2: Classifier Selection */}
        <div className="ck-card p-4 border-[#1E2E28]">
          <h2 className="ck-section-title mb-3 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-accent-emerald text-bg-primary font-bold text-2xs flex items-center justify-center">
              2
            </span>
            Choose Detection Algorithm
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {MODELS.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelectedModel(m.id)}
                className={`p-3 rounded border cursor-pointer transition-all ${
                  selectedModel === m.id
                    ? 'border-accent-emerald bg-accent-glow shadow-glow-sm'
                    : 'border-border bg-bg-card hover:border-accent-emerald/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-text-primary">{m.name}</span>
                  {selectedModel === m.id && <CheckCircle size={13} className="text-accent-emerald" />}
                </div>
                <div className="text-2xs text-text-muted font-mono">{m.tag}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: Run Inference */}
        <div className="ck-card p-4 border-[#1E2E28]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="ck-section-title flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-accent-emerald text-bg-primary font-bold text-2xs flex items-center justify-center">
                  3
                </span>
                Run Machine Learning Classification
              </h2>
              <p className="text-2xs text-text-muted mt-0.5">
                Evaluates features, flags anomalous packets, and pushes high-risk alerts to the SOC queue.
              </p>
            </div>

            <button
              onClick={handleAnalyse}
              disabled={(!selectedDatasetId && !selectedDataset) || running}
              className="ck-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-glow-sm cursor-pointer"
            >
              {running ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                  <span>Processing Flow…</span>
                </>
              ) : (
                <>
                  <Play size={13} fill="currentColor" />
                  <span>Execute Analysis</span>
                </>
              )}
            </button>
          </div>

          {running && (
            <div className="mt-4 p-3 bg-bg-secondary rounded border border-accent-emerald/30">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-accent-emerald font-medium flex items-center gap-2">
                  <Cpu size={14} className="animate-spin" /> {runStep}
                </span>
                <span className="text-text-muted font-mono text-2xs">ACTIVE EVALUATION</span>
              </div>
              <div className="w-full bg-bg-card h-1.5 rounded-full overflow-hidden">
                <div className="bg-accent-emerald h-full w-2/3 animate-pulse" />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 text-xs text-status-critical bg-status-critical-dim border border-status-critical/30 rounded p-2.5">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results Deck */}
        {results && (
          <div className="ck-card border-[#1E2E28] overflow-hidden">
            {/* Results Summary Header */}
            <div className="p-4 bg-[#101714] border-b border-border flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="ck-section-title">Inference Results & Classification Breakdown</span>
                <div className="text-2xs text-text-muted font-mono mt-0.5">
                  Algorithm: {results.model_name} · Samples Evaluated: {results.total_analyzed}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-status-safe" />
                  <span className="text-text-muted">Benign:</span>
                  <span className="font-mono font-semibold text-status-safe">{results.benign_count}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-status-critical" />
                  <span className="text-text-muted">Suspicious / Attacks:</span>
                  <span className="font-mono font-semibold text-status-critical">{results.suspicious_count}</span>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="ck-btn flex items-center gap-1.5 text-xs hover:border-accent-emerald"
                  title="Download CSV"
                >
                  <Download size={12} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Filter Search */}
            <div className="px-4 py-2.5 bg-bg-secondary/40 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 bg-bg-card border border-border rounded px-2.5 py-1 text-xs w-64">
                <Search size={12} className="text-text-muted" />
                <input
                  value={searchFilter}
                  onChange={(e) => {
                    setSearchFilter(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter by label or IP address…"
                  className="bg-transparent text-xs text-text-primary placeholder-text-muted outline-none w-full"
                />
              </div>
              <span className="text-2xs text-text-muted font-mono">
                Showing {paginatedPredictions.length} of {filteredPredictions.length} records
              </span>
            </div>

            {/* Predictions Table */}
            <div className="overflow-x-auto">
              <table className="ck-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Predicted Category</th>
                    <th>Confidence Probability</th>
                    <th>Source Endpoint</th>
                    <th>Destination IP</th>
                    <th>Port</th>
                    <th>Detection Time</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPredictions.map((p, i) => (
                    <tr key={p.id || i}>
                      <td className="text-text-muted font-mono text-2xs">
                        {(page - 1) * pageSize + i + 1}
                      </td>
                      <td>
                        <PredictionBadge prediction={p.prediction} />
                      </td>
                      <td className="font-mono text-xs">
                        <span
                          className={
                            p.confidence > 0.85
                              ? 'text-accent-emerald font-semibold'
                              : 'text-text-secondary'
                          }
                        >
                          {p.confidence != null ? `${(p.confidence * 100).toFixed(1)}%` : 'N/A'}
                        </span>
                      </td>
                      <td className="font-mono text-2xs text-accent-cyan">
                        {p.source_ip || 'N/A'}
                      </td>
                      <td className="font-mono text-2xs text-text-muted">
                        {p.destination_ip || 'N/A'}
                      </td>
                      <td className="font-mono text-2xs text-text-muted">{p.destination_port ?? 'N/A'}</td>
                      <td className="text-text-muted font-mono text-2xs">
                        {p.timestamp ? new Date(p.timestamp).toLocaleTimeString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-2 border-t border-border flex items-center justify-between text-xs text-text-muted">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="ck-btn px-2 py-0.5 text-2xs disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="ck-btn px-2 py-0.5 text-2xs disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
