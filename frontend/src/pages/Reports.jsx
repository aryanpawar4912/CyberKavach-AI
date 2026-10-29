import React, { useState, useEffect } from 'react';
import { Download, Calendar } from 'lucide-react';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { ActivityChart, ThreatDonut } from '../components/charts/Charts';
import { reportService } from '../services/otherServices';

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => { fetchSummary(); }, []);

  async function fetchSummary() {
    setLoading(true);
    try {
      const data = await reportService.summary({ start_date: startDate, end_date: endDate });
      setSummary(data);
      setError('');
    } catch (e) { setError('Could not generate report.'); }
    finally { setLoading(false); }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await reportService.export({ start_date: startDate, end_date: endDate });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `cyberkavach_report_${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e) { alert('Export failed.'); }
    finally { setExporting(false); }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Reports</h1>
          <p className="text-2xs text-text-muted">Dataset and detection summaries</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="ck-input py-1 w-36" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="ck-input py-1 w-36" />
          <button onClick={fetchSummary} className="ck-btn">Apply</button>
          <button onClick={handleExport} disabled={exporting} className="ck-btn-primary flex items-center gap-1.5 disabled:opacity-40">
            <Download size={11} />{exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={fetchSummary} />}

        {summary && (
          <>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total Records', value: summary.total_records?.toLocaleString() },
                { label: 'Benign', value: summary.benign?.toLocaleString() },
                { label: 'Suspicious', value: summary.suspicious?.toLocaleString() },
                { label: 'Datasets Used', value: summary.datasets_count },
              ].map(({ label, value }) => (
                <div key={label} className="ck-card p-3">
                  <div className="ck-metric-label">{label}</div>
                  <div className="ck-metric-value mt-1">{value ?? '—'}</div>
                </div>
              ))}
            </div>

            {summary.activity && (
              <div className="ck-card p-4">
                <h2 className="ck-section-title mb-3">Detection Activity</h2>
                <ActivityChart data={summary.activity} height={140} />
              </div>
            )}

            {summary.categories && (
              <div className="ck-card p-4">
                <h2 className="ck-section-title mb-3">Threat Category Distribution</h2>
                <ThreatDonut data={summary.categories} height={180} />
              </div>
            )}
          </>
        )}

        {!loading && !error && !summary && (
          <EmptyState title="No report data" description="Apply a date range and refresh to generate a report." />
        )}
      </div>
    </div>
  );
}
