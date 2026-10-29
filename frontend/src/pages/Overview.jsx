import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Database, RefreshCw, Shield, Cpu } from 'lucide-react';
import { ActivityChart, ThreatBarChart, ThreatDonut } from '../components/charts/Charts';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { dashboardService } from '../services/dashboardService';
import { datasetService } from '../services/datasetService';

const cardClass = 'ck-card p-4';

function formatCount(value) {
  return Number.isFinite(value) ? value.toLocaleString() : 'N/A';
}

function DataPanel({ title, children }) {
  return (
    <section className={cardClass}>
      <h2 className="mb-3 text-sm font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

export default function Overview() {
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [categories, setCategories] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [recent, setRecent] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [datasetId, setDatasetId] = useState('');
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const query = useMemo(() => datasetId ? { dataset_id: datasetId } : {}, [datasetId]);
  const loadDashboard = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    setSummary(null);
    setActivity([]);
    setDistribution([]);
    setCategories([]);
    setAlerts(null);
    setRecent(null);
    try {
      const [summaryData, activityData, distributionData, categoryData, alertData, recentData] =
        await Promise.all([
          dashboardService.getSummary({ params: query, signal }),
          dashboardService.getActivity(days, { params: query, signal }),
          dashboardService.getPredictionDistribution({ params: query, signal }),
          dashboardService.getThreatCategories(query, { signal }),
          dashboardService.getAlertStatistics({ params: query, signal }),
          dashboardService.getRecentDetections({ ...query, limit: 10 }, { signal }),
        ]);
      setSummary(summaryData);
      setActivity(activityData);
      setDistribution(distributionData);
      setCategories(categoryData);
      setAlerts(alertData);
      setRecent(recentData);
    } catch (requestError) {
      if (requestError.code !== 'ERR_CANCELED') {
        setSummary(null);
        setActivity([]);
        setDistribution([]);
        setCategories([]);
        setAlerts(null);
        setRecent(null);
        setError(requestError.response?.data?.error || 'Dashboard data could not be loaded.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [days, query, refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard]);

  useEffect(() => {
    const controller = new AbortController();
    datasetService.list({ signal: controller.signal })
      .then((response) => setDatasets(response.results || response || []))
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(requestError.response?.data?.error || 'Dataset filter options could not be loaded.');
        }
      });
    return () => controller.abort();
  }, []);

  const metricCards = summary ? [
    { label: 'Records analysed', value: summary.total_records, icon: Activity, definition: 'Persisted detection records in the selected dataset scope.' },
    { label: 'Benign predictions', value: summary.benign, icon: Shield, definition: 'Saved predictions labelled benign, normal, or 0.' },
    { label: 'Suspicious predictions', value: summary.suspicious, icon: AlertTriangle, definition: 'Saved labels supported by a trained model target class; unknown labels are not included.' },
    { label: 'Unclassified predictions', value: summary.unclassified, icon: Activity, definition: 'Saved predictions not classified as benign or as a supported threat class.' },
    { label: 'Active alerts', value: summary.active_alerts, icon: AlertTriangle, definition: 'Persisted alerts whose status is new or investigating.' },
    { label: 'Datasets processed', value: summary.datasets_processed, icon: Database, definition: 'Successfully processed datasets in the selected scope.' },
    { label: 'Available model artifacts', value: summary.available_models, icon: Cpu, definition: 'Stored models whose artifact file exists; this does not mean the model is loaded.' },
  ] : [];

  const categoryChartData = categories.map(({ name, value }) => ({ category: name, count: value }));
  const alertChartData = (alerts?.by_severity || []).map(({ severity, count }) => ({
    category: severity,
    count,
  }));
  const alertStatusChartData = (alerts?.by_status || []).map(({ status, count }) => ({
    category: status,
    count,
  }));
  const updatedAt = summary?.last_updated
    ? new Date(summary.last_updated).toLocaleString()
    : null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg-primary text-text-primary">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg-secondary px-5 py-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Security Operations Overview</h1>
          <p className="mt-1 text-[10px] text-text-secondary">
            Aggregates are calculated from stored detections, alerts, datasets, and model artifacts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-text-secondary">
            Detection window
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="ml-2 rounded-md border border-border bg-bg-card px-2 py-1 text-xs text-text-primary"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </label>
          <label className="text-xs text-text-secondary">
            Dataset
            <select
              value={datasetId}
              onChange={(event) => setDatasetId(event.target.value)}
              className="ml-2 max-w-48 rounded-md border border-border bg-bg-card px-2 py-1 text-xs text-text-primary"
            >
              <option value="">All datasets</option>
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>{dataset.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
            className="ck-btn flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto p-4">
        {updatedAt && (
          <p className="text-right text-[10px] text-text-secondary">Data as of {updatedAt}</p>
        )}
        {error && <ErrorState message={error} onRetry={() => setRefreshKey((key) => key + 1)} />}
        {loading && !summary && <LoadingState message="Loading stored security data…" />}
        {!loading && !error && !summary && (
          <EmptyState title="Dashboard data unavailable" description="The API returned no dashboard summary." />
        )}

        {summary && (
          <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
              {metricCards.map(({ label, value, icon: Icon, definition }) => (
                <article key={label} title={definition} className={cardClass}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-text-secondary">{label}</span>
                    <Icon size={14} className="shrink-0 text-accent-emerald" />
                  </div>
                  <div className="mt-2 font-mono text-xl font-semibold">{formatCount(value)}</div>
                </article>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DataPanel title={`Detection activity · ${days} days`}>
                {loading ? <LoadingState size="sm" /> : activity.length
                  ? <ActivityChart data={activity} height={220} />
                  : <EmptyState title="No detections in this interval" description="Activity appears after prediction results are stored." />}
              </DataPanel>
              <DataPanel title="Prediction distribution">
                {loading ? <LoadingState size="sm" /> : distribution.some((item) => item.value > 0)
                  ? <ThreatDonut data={distribution} height={220} />
                  : <EmptyState title="No detections available" description="Distribution is based on saved prediction labels." />}
              </DataPanel>
              <DataPanel title="Observed threat categories">
                {loading ? <LoadingState size="sm" /> : categoryChartData.length
                  ? <ThreatBarChart data={categoryChartData} height={220} />
                  : <EmptyState title="No threat categories recorded" description="Only categories present in stored detections are shown." />}
              </DataPanel>
              <DataPanel title="Persisted alerts by severity and status">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="mb-1 text-[10px] uppercase tracking-wide text-text-secondary">By severity</h3>
                    {loading ? <LoadingState size="sm" /> : alertChartData.length
                      ? <ThreatBarChart data={alertChartData} height={180} />
                      : <EmptyState title="No alerts recorded" description="Severity counts use persisted alerts." />}
                  </div>
                  <div>
                    <h3 className="mb-1 text-[10px] uppercase tracking-wide text-text-secondary">By status</h3>
                    {loading ? <LoadingState size="sm" /> : alertStatusChartData.length
                      ? <ThreatBarChart data={alertStatusChartData} height={180} />
                      : <EmptyState title="No alerts recorded" description="Status counts use persisted alerts." />}
                  </div>
                </div>
                {alerts && (
                  <p className="mt-2 text-[10px] text-text-secondary">
                    {formatCount(alerts.total)} total · {formatCount(alerts.active)} active · grouped by stored severity
                  </p>
                )}
              </DataPanel>
            </section>

            <DataPanel title="Recent detection records">
              {loading ? <LoadingState size="sm" /> : recent?.results?.length ? (
                <div className="overflow-x-auto">
                  <table className="ck-table">
                    <thead>
                      <tr><th>Prediction</th><th>Model</th><th>Dataset</th><th>Source</th><th>Destination</th><th>Timestamp</th></tr>
                    </thead>
                    <tbody>
                      {recent.results.map((record) => (
                        <tr key={record.id}>
                          <td>{record.prediction}</td>
                          <td>{record.model_name}</td>
                          <td>{record.dataset_name || 'N/A'}</td>
                          <td className="font-mono">{record.source_ip || 'N/A'}</td>
                          <td className="font-mono">{record.destination_ip || 'N/A'}</td>
                          <td>{new Date(record.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-[10px] text-text-secondary">
                    Showing {recent.results.length} of {formatCount(recent.count)} records.
                  </p>
                </div>
              ) : (
                <EmptyState title="No detections available" description="Saved prediction records will appear here." />
              )}
            </DataPanel>
          </>
        )}
      </main>
    </div>
  );
}
