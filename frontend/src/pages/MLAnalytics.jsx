import React, { useState, useEffect } from 'react';
import {
  Cpu, Play, AlertTriangle, RefreshCw, Database
} from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { ThreatBarChart } from '../components/charts/Charts';
import { modelService } from '../services/otherServices';
import { datasetService } from '../services/datasetService';
import { StatusDot } from '../components/common/Badges';
import { useApp } from '../context/AppContext';

const ALGORITHMS = [
  { key: 'random_forest', label: 'Random Forest', type: 'Ensemble Bagging', desc: '50 Estimators, max-depth 12' },
  { key: 'decision_tree', label: 'Decision Tree', type: 'Single Tree Partition', desc: 'Gini Impurity, max-depth 12' },
  { key: 'svm', label: 'Support Vector Machine', type: 'Linear Support Vector', desc: 'Max-iter 2000, L2 penalty' },
];

function MetricRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 text-xs">
      <span className="text-text-muted">{label}</span>
      <span className={`font-semibold font-mono ${color || 'text-text-primary'}`}>{value ?? '—'}</span>
    </div>
  );
}

export default function MLAnalytics() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [trainingModel, setTrainingModel] = useState(null);
  const { addNotification } = useApp();

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const dList = await datasetService.list();
      const readyDatasets = (dList.results || dList || []).filter((dataset) => dataset.status === 'ready');
      setDatasets(readyDatasets);
      const datasetId = selectedDatasetId || (readyDatasets.length ? String(readyDatasets[0].id) : '');
      setSelectedDatasetId(datasetId);
      if (datasetId) {
        const mMetrics = await modelService.metrics({ params: { dataset_id: datasetId } });
        setMetrics(mMetrics.results || mMetrics || []);
      } else {
        setMetrics([]);
      }
      setLoadError('');
    } catch (requestError) {
      setDatasets([]);
      setMetrics([]);
      setLoadError(requestError.response?.data?.error || 'Could not load ML analytics data. Please check backend status.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDatasetChange(datasetId) {
    setSelectedDatasetId(datasetId);
    setMetrics([]);
    setLoadError('');
    if (!datasetId) return;
    setLoading(true);
    try {
      const response = await modelService.metrics({ params: { dataset_id: datasetId } });
      setMetrics(response.results || response || []);
      setLoadError('');
    } catch (requestError) {
      setMetrics([]);
      setLoadError(requestError.response?.data?.error || 'Could not load evaluation results for the selected dataset.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTrain(modelKey) {
    if (!selectedDatasetId) {
      setError('Please choose a dataset to train on.');
      return;
    }

    setTrainingModel(modelKey);
    setError('');

    try {
      const res = await modelService.train(selectedDatasetId, modelKey);
      addNotification({
        message: `${res.model_name_display || modelKey} trained successfully (${(res.accuracy * 100).toFixed(1)}% accuracy).`,
        time: 'Just now',
      });
      // Refresh metrics
      const freshMetrics = await modelService.metrics({ params: { dataset_id: selectedDatasetId } });
      setMetrics(freshMetrics.results || freshMetrics || []);
    } catch (e) {
      setError(e.response?.data?.error || `Failed to train ${modelKey}.`);
    } finally {
      setTrainingModel(null);
    }
  }

  const fmt = (v) => (v !== undefined && v !== null ? `${(v * 100).toFixed(1)}%` : '—');

  const datasetMetrics = metrics.filter((model) =>
    String(model.dataset) === String(selectedDatasetId)
  );
  const rfModel = datasetMetrics.find((model) => model.model_name === 'random_forest');
  const rfEvaluationAvailable = rfModel?.evaluation_available === true;
  const activeFeatureImportance = rfEvaluationAvailable ? (rfModel?.feature_importance || []) : [];
  const perClassRows = (rfModel?.target_classes || [])
    .map((label) => ({ label, ...(rfModel?.per_class_metrics?.[label] || {}) }));

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-primary text-text-primary">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3 flex-shrink-0 bg-bg-secondary/30">
        <div>
          <h1 className="text-base font-semibold text-text-primary flex items-center gap-2">
            ML Model Benchmark & Analytics
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
          </h1>
          <p className="text-2xs text-text-muted">
            Evaluation metrics computed strictly on held-out test splits (20%) with zero data leakage
          </p>
        </div>

        {/* Dataset selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted flex items-center gap-1">
            <Database size={12} className="text-accent-emerald" /> Target Dataset:
          </span>
          <select
            value={selectedDatasetId}
            onChange={(e) => handleDatasetChange(e.target.value)}
            className="ck-input py-1 text-xs font-mono max-w-xs"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.rows != null ? d.rows.toLocaleString() : 'N/A'} rows)
              </option>
            ))}
          </select>
          <button
            onClick={fetchInitialData}
            className="ck-btn p-1.5"
            title="Refresh Metrics"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-xs text-status-critical bg-status-critical-dim border border-status-critical/30 rounded p-3">
            <AlertTriangle size={14} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Algorithm Comparison Deck */}
        {loading ? (
          <div className="ck-card border-[#1E2E28]">
            <LoadingState message="Loading model and evaluation data…" size="sm" />
          </div>
        ) : loadError ? (
          <div className="ck-card border-[#1E2E28]">
            <ErrorState message={loadError} onRetry={fetchInitialData} />
          </div>
        ) : !selectedDatasetId ? (
          <div className="ck-card border-[#1E2E28]">
            <EmptyState
              icon={Database}
              title="No processed datasets available"
              description="Upload and successfully process a dataset before training or viewing model evaluations."
            />
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ALGORITHMS.map(({ key, label, type, desc }) => {
            const m = datasetMetrics.find((x) => x.model_name === key) || null;
            const evaluationAvailable = m?.evaluation_available === true;
            const artifactAvailable = m?.artifact_available === true;
            const isTraining = trainingModel === key;

            return (
              <div key={key} className="ck-card p-4 border-[#1E2E28] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-text-primary">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={artifactAvailable ? 'operational' : 'unknown'} size="xs" />
                      <span className="text-2xs text-text-muted font-mono">{artifactAvailable ? 'ARTIFACT AVAILABLE' : 'ARTIFACT UNAVAILABLE'}</span>
                    </div>
                  </div>
                  <div className="text-2xs text-text-muted font-mono mb-3">{type} · {desc}</div>

                  {m && evaluationAvailable ? (
                    <div className="space-y-1 mb-4 bg-bg-secondary p-2.5 rounded border border-border">
                      <MetricRow label="Test Accuracy" value={fmt(m.accuracy)} color="text-accent-emerald" />
                      <MetricRow label="Weighted Precision" value={fmt(m.precision)} />
                      <MetricRow label="Weighted Recall" value={fmt(m.recall)} />
                      <MetricRow label="F1-Score" value={fmt(m.f1_score)} />
                      <MetricRow
                        label="Macro one-vs-rest FPR"
                        value={fmt(m.false_positive_rate)}
                        color="text-status-warning"
                      />
                      <div className="pt-1.5 mt-1 border-t border-border/50 text-[10px] text-text-muted font-mono flex justify-between">
                        <span>Classes: {m.target_classes?.length ?? 'N/A'}</span>
                        <span>{m.evaluation_type === 'held_out_test' ? 'Held-out test' : 'N/A'}</span>
                      </div>
                      <div className="pt-1 text-[10px] text-text-muted">
                        Dataset: {m.dataset_name || 'N/A'} · Version: {m.model_version || 'N/A'} · Evaluated: {m.evaluation_timestamp ? new Date(m.evaluation_timestamp).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center bg-bg-secondary rounded border border-border mb-4">
                      <Cpu size={24} className="text-text-muted mx-auto mb-2 opacity-50" strokeWidth={1.5} />
                      <p className="text-xs text-text-secondary">{m ? 'Evaluation not available' : 'Model not trained on this dataset'}</p>
                      <p className="text-2xs text-text-muted mt-0.5">Training requires at least two labelled classes with held-out examples.</p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleTrain(key)}
                  disabled={isTraining || !selectedDatasetId}
                  className="ck-btn-primary w-full py-2 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-glow-sm"
                >
                  {isTraining ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                      <span>Training {label}…</span>
                    </>
                  ) : (
                    <>
                      <Play size={12} fill="currentColor" />
                      <span>{m ? 'Re-Train Model' : 'Train Model'}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
        )}

        {/* Feature Importance Panel */}
        <div className="ck-card p-4 border-[#1E2E28]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="ck-section-title">Random Forest Feature Importance</h2>
              <p className="text-2xs text-text-muted mt-0.5">
                Relative Gini importance of individual packet attributes in classifying attack vectors
              </p>
            </div>
            {activeFeatureImportance.length > 0 && (
              <span className="text-2xs text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/30 px-2 py-0.5 rounded font-mono">
                TOP {Math.min(10, activeFeatureImportance.length)} FEATURES
              </span>
            )}
          </div>

          {activeFeatureImportance.length > 0 ? (
            <ThreatBarChart
              data={activeFeatureImportance.slice(0, 10).map((f) => ({
                category: f.feature,
                count: parseFloat((f.importance * 100).toFixed(2)),
              }))}
              height={170}
            />
          ) : (
            <div className="py-8 text-center text-xs text-text-muted">
              {selectedDatasetId
                ? 'Train the Random Forest baseline model above to display real calculated feature importances.'
                : 'Feature importance is unavailable until a dataset has been processed and evaluated.'}
            </div>
          )}
        </div>

        {rfEvaluationAvailable && perClassRows.length > 0 && (
          <div className="ck-card p-4 border-[#1E2E28]">
            <h2 className="ck-section-title mb-2">Random Forest Per-class Performance</h2>
            <p className="text-2xs text-text-muted mb-3">
              Metrics calculated from the model's held-out labeled test records.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-text-muted border-b border-border">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Actual class</th>
                    <th className="py-2 px-2 font-medium">Precision</th>
                    <th className="py-2 px-2 font-medium">Recall</th>
                    <th className="py-2 px-2 font-medium">F1-score</th>
                    <th className="py-2 px-2 font-medium">Support</th>
                  </tr>
                </thead>
                <tbody>
                  {perClassRows.map((row) => (
                    <tr key={row.label} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-4 font-mono text-text-primary">{row.label}</td>
                      <td className="py-2 px-2 font-mono">{fmt(row.precision)}</td>
                      <td className="py-2 px-2 font-mono">{fmt(row.recall)}</td>
                      <td className="py-2 px-2 font-mono">{fmt(row['f1-score'])}</td>
                      <td className="py-2 px-2 font-mono">{row.support ?? 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Confusion Matrix Visualizer if available */}
        {rfEvaluationAvailable && rfModel?.confusion_matrix?.length > 0 && (
          <div className="ck-card p-4 border-[#1E2E28]">
            <h2 className="ck-section-title mb-2">Confusion Matrix (Held-out Test Split)</h2>
            <p className="text-2xs text-text-muted mb-3 font-mono">
              Rows: Ground Truth Target · Columns: Predicted Label
            </p>
            <div className="overflow-x-auto">
              <div className="inline-block bg-bg-secondary p-3 rounded border border-border">
                <table className="font-mono text-xs text-center">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 text-text-muted">Actual \ Predicted</th>
                      {(rfModel.target_classes || []).map((label) => (
                        <th key={label} className="px-2 py-1 text-text-muted">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                  {rfModel.confusion_matrix.map((row, rIdx) => (
                    <tr key={rIdx}>
                      <th className="px-2 py-1 text-text-muted font-medium">
                        {rfModel.target_classes?.[rIdx] || `Class ${rIdx + 1}`}
                      </th>
                      {row.map((val, cIdx) => (
                        <td
                          key={cIdx}
                          className={`min-w-16 px-3 py-2 rounded text-xs font-semibold ${
                            rIdx === cIdx
                              ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/40'
                              : val > 0
                              ? 'bg-status-critical-dim text-status-critical border border-status-critical/30'
                              : 'bg-bg-card text-text-muted'
                          }`}
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 bg-bg-secondary rounded border border-border text-2xs text-text-muted flex items-center gap-2">
          <AlertTriangle size={13} className="text-status-warning flex-shrink-0" />
          <span>
            Model artifacts are stored securely in backend/trained_models/ as validated Joblib bundles. Only application-generated weights are executed.
          </span>
        </div>
      </div>
    </div>
  );
}
