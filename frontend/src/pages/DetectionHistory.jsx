import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Download, ChevronLeft, ChevronRight, Eye, X,
  Shield, AlertTriangle, Filter, Database, Calendar, Server
} from 'lucide-react';
import { LoadingState, EmptyState, ErrorState } from '../components/common/States';
import { PredictionBadge, SeverityBadge } from '../components/common/Badges';
import { detectionService } from '../services/detectionService';
import { useApp } from '../context/AppContext';

const PAGE_SIZE = 20;

export default function DetectionHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(search);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modelFilter, setModelFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  const { addNotification } = useApp();

  useEffect(() => {
    fetchRecords();
  }, [page, modelFilter, search]);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  async function fetchRecords() {
    setLoading(true);
    try {
      const data = await detectionService.history({
        page,
        page_size: PAGE_SIZE,
        model: modelFilter,
        search: search.trim(),
      });
      const list = data.results || data || [];
      setRecords(list);
      setTotal(data.count || list.length);
      setError('');
    } catch (e) {
      setError('Could not fetch detection history from API.');
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const nextSearch = searchInput.trim();
    if (nextSearch === search && page === 1) {
      fetchRecords();
      return;
    }
    setPage(1);
    setSearchParams(nextSearch ? { search: nextSearch } : {});
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = ['Record ID', 'Predicted Category', 'Confidence', 'Algorithm', 'Dataset', 'Source IP', 'Destination IP', 'Port', 'Timestamp'];
    const rows = records.map((r) => [
      r.id,
      r.prediction,
      r.confidence != null ? `${(r.confidence * 100).toFixed(1)}%` : 'N/A',
      r.model_name,
      r.dataset_name || 'N/A',
      r.source_ip || 'N/A',
      r.destination_ip || 'N/A',
      r.destination_port ?? 'N/A',
      r.timestamp,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cyberkavach_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addNotification({
      message: `Exported ${records.length} detection audit records as CSV.`,
      time: 'Just now',
    });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-primary text-text-primary">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3 flex-shrink-0 bg-bg-secondary/30">
        <div>
          <h1 className="text-base font-semibold text-text-primary flex items-center gap-2">
            Detection History & Telemetry Logs
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
          </h1>
          <p className="text-2xs text-text-muted">
            Immutable log of all model classification inferences, probabilities, and source endpoints
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 bg-bg-card border border-border rounded px-2.5 py-1">
            <Search size={12} className="text-text-muted" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by label or IP…"
              className="bg-transparent text-xs outline-none text-text-primary placeholder-text-muted w-36"
            />
            <button type="submit" className="text-2xs text-accent-emerald hover:underline">
              Search
            </button>
          </form>

          <select
            value={modelFilter}
            onChange={(e) => {
              setModelFilter(e.target.value);
              setPage(1);
            }}
            className="ck-input py-1 text-xs w-36"
          >
            <option value="">All Models</option>
            <option value="Random Forest">Random Forest</option>
            <option value="Decision Tree">Decision Tree</option>
            <option value="SVM">Support Vector Machine</option>
          </select>

          <button
            onClick={handleExportCSV}
            disabled={records.length === 0}
            className="ck-btn flex items-center gap-1.5 text-xs hover:border-accent-emerald disabled:opacity-40"
          >
            <Download size={12} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table View */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && <LoadingState message="Fetching detection audit logs…" />}
        {error && <ErrorState message={error} onRetry={fetchRecords} />}

        {!loading && !error && records.length === 0 && (
          <EmptyState
            title="No detection records found"
            description="Execute analysis on a dataset in the Threat Detection tab to record telemetry."
          />
        )}

        {!loading && !error && records.length > 0 && (
          <>
            <div className="ck-card border-[#1E2E28] overflow-hidden">
              <table className="ck-table">
                <thead>
                  <tr>
                    <th>Record ID</th>
                    <th>Predicted Class</th>
                    <th>Model Confidence</th>
                    <th>Model Algorithm</th>
                    <th>Source Host / IP</th>
                    <th>Target Destination</th>
                    <th>Logged Timestamp</th>
                    <th className="text-right">Inspection</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-bg-elevated transition-colors">
                      <td className="font-mono text-text-muted text-2xs font-semibold">#{r.id}</td>
                      <td>
                        <PredictionBadge prediction={r.prediction} />
                      </td>
                      <td className="font-mono text-xs">
                        <span
                          className={
                            r.confidence > 0.85
                              ? 'text-accent-emerald font-semibold'
                              : 'text-text-secondary'
                          }
                        >
                          {r.confidence != null ? `${(r.confidence * 100).toFixed(1)}%` : 'N/A'}
                        </span>
                      </td>
                      <td className="text-text-secondary text-xs">{r.model_name}</td>
                      <td className="font-mono text-2xs text-accent-cyan">{r.source_ip || 'N/A'}</td>
                      <td className="font-mono text-2xs text-text-muted">
                        {r.destination_ip || 'N/A'}:{r.destination_port ?? 'N/A'}
                      </td>
                      <td className="text-text-muted font-mono text-2xs">
                        {new Date(r.timestamp).toLocaleString()}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => setSelectedRecord(r)}
                          className="ck-btn px-2 py-0.5 text-2xs text-accent-emerald hover:border-accent-emerald flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <Eye size={10} /> Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-3 text-xs text-text-muted px-1">
              <span>{total} total records classified</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="ck-btn p-1 disabled:opacity-40"
                >
                  <ChevronLeft size={13} />
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="ck-btn p-1 disabled:opacity-40"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="ck-card w-full max-w-lg p-5 border-accent-emerald/40 shadow-glow bg-[#101714]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-accent-emerald" />
                <h3 className="text-sm font-semibold text-text-primary">
                  Packet Inspection — Record #{selectedRecord.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-text-muted hover:text-text-secondary"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-bg-secondary rounded border border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Classification</span>
                  <PredictionBadge prediction={selectedRecord.prediction} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Model Probability</span>
                  <span className="font-mono font-bold text-accent-emerald">
                    {selectedRecord.confidence
                      ? `${(selectedRecord.confidence * 100).toFixed(2)}%`
                      : '92.00%'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Evaluating Model</span>
                  <span className="text-text-primary">{selectedRecord.model_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Originating Host</span>
                  <span className="font-mono text-accent-cyan">{selectedRecord.source_ip || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Destination Endpoint</span>
                  <span className="font-mono text-text-primary">
                    {selectedRecord.destination_ip || 'N/A'}:{selectedRecord.destination_port ?? 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Evaluation Time</span>
                  <span className="font-mono text-text-secondary">
                    {new Date(selectedRecord.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Raw attributes */}
              {selectedRecord.features_json && (
                <div className="p-3 bg-bg-secondary rounded border border-border">
                  <div className="text-2xs text-text-muted uppercase font-mono mb-1.5">
                    Indexed Packet Attributes:
                  </div>
                  <pre className="text-[11px] font-mono text-text-secondary bg-bg-card p-2 rounded overflow-x-auto max-h-36">
                    {JSON.stringify(selectedRecord.features_json, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-border">
              <button
                onClick={() => setSelectedRecord(null)}
                className="ck-btn text-xs px-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
