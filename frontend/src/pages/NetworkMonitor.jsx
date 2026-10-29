import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, Search, RefreshCw, Server, X } from 'lucide-react';
import NetworkGraph from '../components/network/NetworkGraph';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { datasetService } from '../services/datasetService';
import { networkService } from '../services/otherServices';

export default function NetworkMonitor() {
  const [search, setSearch] = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [topology, setTopology] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    datasetService.list({ signal: controller.signal })
      .then((response) => setDatasets(response.results || response || []))
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(requestError.response?.data?.error || 'Dataset options could not be loaded.');
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const result = await networkService.topology({
          ...(datasetId ? { dataset_id: datasetId } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        }, { signal: controller.signal });
        setTopology(result);
      } catch (requestError) {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(requestError.response?.data?.error || 'Network data could not be loaded.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [datasetId, search, refreshKey]);

  const nodeCount = topology?.nodes?.length || 0;
  const edgeCount = topology?.edges?.length || 0;

  return (
    <div className={`flex flex-col overflow-hidden bg-bg-primary text-text-primary ${fullscreen ? 'fixed inset-0 z-50 h-screen w-screen' : 'h-full'}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg-secondary/30 px-5 py-3">
        <div>
          <h1 className="text-base font-semibold">Network Flow Analysis</h1>
          <p className="text-2xs text-text-muted">
            Derived only from stored detections with source and destination addresses; this is not live telemetry.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-text-muted">
            Dataset
            <select
              value={datasetId}
              onChange={(event) => setDatasetId(event.target.value)}
              className="ml-2 max-w-48 rounded border border-border bg-bg-card px-2 py-1 text-xs text-text-primary"
            >
              <option value="">All datasets</option>
              {datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-2 rounded border border-border bg-bg-card px-2.5 py-1 text-xs">
            <Search size={12} className="text-text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search observed addresses"
              className="w-44 bg-transparent text-xs text-text-primary outline-none"
            />
            {search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={12} /></button>}
          </div>
          <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="ck-btn flex items-center gap-1.5 text-xs">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button type="button" onClick={() => setFullscreen(!fullscreen)} className="ck-btn p-1.5" title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between border-b border-border bg-bg-secondary/70 px-5 py-2 text-2xs text-text-muted">
        <span>
          {topology?.scope
            ? `${topology.scope.records_with_endpoints.toLocaleString()} matching records · ${nodeCount} observed entities · ${edgeCount} observed flows`
            : 'Waiting for detection records'}
        </span>
        {topology?.scope?.truncated && <span>Graph limited to the newest {topology.scope.records_in_response.toLocaleString()} matching records.</span>}
      </div>

      {error && <ErrorState message={error} onRetry={() => setRefreshKey((key) => key + 1)} />}
      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        <div className="relative flex-1 overflow-hidden rounded-lg border border-[#1E2E28] bg-[#0A100D]">
          {loading && !topology ? <LoadingState message="Loading saved network-flow data…" /> : null}
          {!loading && !error && !nodeCount ? (
            <EmptyState
              icon={Server}
              title="Network topology data unavailable"
              description="No saved detection records include both source and destination addresses. A genuine topology cannot be inferred from the current data."
            />
          ) : null}
          {topology && nodeCount > 0 && (
            <NetworkGraph
              topologyData={topology}
              height="100%"
              searchQuery={search}
              onSelectNode={setSelectedNode}
            />
          )}
        </div>

        {selectedNode && (
          <aside className="w-80 overflow-y-auto rounded-lg border border-[#1E2E28] bg-[#101714] p-4">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Server size={16} className="text-accent-emerald" />
                <div>
                  <h2 className="text-sm font-semibold">{selectedNode.data.label}</h2>
                  <span className="font-mono text-2xs text-text-muted">{selectedNode.data.ip}</span>
                </div>
              </div>
              <button onClick={() => setSelectedNode(null)} aria-label="Close entity details"><X size={15} /></button>
            </div>
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-text-muted">Detection records</dt><dd>{selectedNode.data.records}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-text-muted">Active associated alerts</dt><dd>{selectedNode.data.active_alerts}</dd></div>
              <div><dt className="mb-1 text-text-muted">Recorded prediction categories</dt><dd className="break-words">{Object.keys(selectedNode.data.categories || {}).join(', ') || 'None'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-text-muted">Alert-derived state</dt><dd className="capitalize">{selectedNode.data.status}</dd></div>
            </dl>
          </aside>
        )}
      </div>
    </div>
  );
}
