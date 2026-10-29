import React, { useState, useEffect } from 'react';
import { ScrollText, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { LoadingState, EmptyState, ErrorState } from '../components/common/States';
import { auditService } from '../services/otherServices';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const PAGE_SIZE = 30;

  useEffect(() => { fetchLogs(); }, [page]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const data = await auditService.list({ page, page_size: PAGE_SIZE, search });
      setLogs(data.results || data);
      setTotal(data.count || (data.results || data).length);
      setError('');
    } catch (e) { setError('Could not load audit logs.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Audit Logs</h1>
          <p className="text-2xs text-text-muted">System activity and access log — restricted to authorized users</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-bg-card border border-border rounded px-2 py-1">
            <Search size={11} className="text-text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              placeholder="Search actor or action…"
              className="bg-transparent text-xs outline-none text-text-primary placeholder-text-muted w-36" />
          </div>
          <button onClick={fetchLogs} className="ck-btn">Search</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={fetchLogs} />}
        {!loading && !error && logs.length === 0 && <EmptyState icon={ScrollText} title="No audit log entries" />}
        {!loading && !error && logs.length > 0 && (
          <div className="ck-card overflow-hidden">
            <table className="ck-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Object</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="font-mono text-2xs text-text-muted">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="text-text-secondary">{l.actor}</td>
                    <td className="text-text-primary">{l.action}</td>
                    <td className="text-text-muted font-mono text-2xs">{l.object_id || '—'}</td>
                    <td>
                      <span className={`text-2xs font-medium ${l.outcome === 'success' ? 'text-status-safe' : 'text-status-critical'}`}>
                        {l.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-3 text-xs text-text-muted">
            <span>{total} entries</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="ck-btn p-1 disabled:opacity-40"><ChevronLeft size={12} /></button>
              <span>Page {page} of {Math.ceil(total / PAGE_SIZE)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / PAGE_SIZE)} className="ck-btn p-1 disabled:opacity-40"><ChevronRight size={12} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
