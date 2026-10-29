import React, { useEffect, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { ThreatBarChart } from '../components/charts/Charts';
import { PredictionBadge } from '../components/common/Badges';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { detectionService } from '../services/detectionService';
import { modelService } from '../services/otherServices';

export default function Explainability() {
  const [records, setRecords] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      detectionService.history({ page_size: 25 }, { signal: controller.signal }),
      modelService.metrics({ signal: controller.signal }),
    ]).then(([detectionResponse, modelResponse]) => {
      const savedRecords = detectionResponse.results || detectionResponse || [];
      setRecords(savedRecords);
      setModels(modelResponse.results || modelResponse || []);
      setSelectedRecord(savedRecords[0] || null);
    }).catch((requestError) => {
      if (requestError.code !== 'ERR_CANCELED') {
        setError(requestError.response?.data?.error || 'Detection and model data could not be loaded.');
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  const matchingModel = useMemo(() => models.find((model) =>
    String(model.dataset) === String(selectedRecord?.dataset)
    && (
      model.model_name_display === selectedRecord?.model_name
      || model.model_name === selectedRecord?.model_name
    )
  ), [models, selectedRecord]);

  const featureData = useMemo(() => Object.entries(selectedRecord?.features_json || {})
    .map(([feature, value]) => ({ feature, value: String(value) })), [selectedRecord]);

  const globalImportance = (matchingModel?.feature_importance || []).map((item) => ({
    category: item.feature,
    count: Number((item.importance * 100).toFixed(2)),
  }));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Detection Evidence</h1>
          <p className="text-2xs text-text-muted">Stored prediction inputs and model-level feature importance; no per-record SHAP values are generated.</p>
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-border bg-bg-secondary px-4 py-2 text-2xs text-text-muted">
        <Info size={12} className="shrink-0 text-accent-cyan" />
        Model feature importance is global model metadata, not a causal explanation for an individual prediction.
      </div>

      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
      {loading && <LoadingState message="Loading saved detection evidence…" />}
      {!loading && !error && records.length === 0 && (
        <EmptyState title="No detections available" description="Saved predictions and their stored input features will appear here." />
      )}

      {!loading && !error && records.length > 0 && (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="w-1/3 overflow-y-auto border-r border-border bg-bg-secondary/40">
            <div className="border-b border-border px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-text-secondary">
              Detection records · {records.length}
            </div>
            {records.map((record) => (
              <button
                type="button"
                key={record.id}
                onClick={() => setSelectedRecord(record)}
                className={`block w-full border-b border-border/40 p-3 text-left ${selectedRecord?.id === record.id ? 'border-l-2 border-l-accent-emerald bg-bg-elevated' : 'hover:bg-bg-card'}`}
              >
                <div className="flex items-center justify-between">
                  <PredictionBadge prediction={record.prediction} />
                  <span className="font-mono text-2xs text-text-muted">#{record.id}</span>
                </div>
                <div className="mt-2 flex justify-between text-2xs text-text-secondary">
                  <span className="font-mono">{record.source_ip || 'Source N/A'}</span>
                  <span>{record.confidence == null ? 'Confidence N/A' : `${(record.confidence * 100).toFixed(1)}%`}</span>
                </div>
                <div className="mt-1 flex justify-between text-2xs text-text-muted">
                  <span>{record.model_name || 'Model N/A'}</span>
                  <span>{record.timestamp ? new Date(record.timestamp).toLocaleString() : 'Time N/A'}</span>
                </div>
              </button>
            ))}
          </aside>

          <main className="flex-1 space-y-4 overflow-y-auto p-4">
            {selectedRecord && (
              <>
                <section className="ck-card p-4">
                  <h2 className="mb-3 text-sm font-semibold">Saved prediction record #{selectedRecord.id}</h2>
                  <dl className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                    <div><dt className="text-text-muted">Predicted category</dt><dd className="mt-1"><PredictionBadge prediction={selectedRecord.prediction} /></dd></div>
                    <div><dt className="text-text-muted">Model</dt><dd className="mt-1">{selectedRecord.model_name || 'N/A'}</dd></div>
                    <div><dt className="text-text-muted">Confidence</dt><dd className="mt-1">{selectedRecord.confidence == null ? 'Not available' : `${(selectedRecord.confidence * 100).toFixed(1)}%`}</dd></div>
                    <div><dt className="text-text-muted">Dataset</dt><dd className="mt-1">{selectedRecord.dataset_name || 'N/A'}</dd></div>
                    <div><dt className="text-text-muted">Source address</dt><dd className="mt-1 font-mono">{selectedRecord.source_ip || 'N/A'}</dd></div>
                    <div><dt className="text-text-muted">Destination address</dt><dd className="mt-1 font-mono">{selectedRecord.destination_ip || 'N/A'}</dd></div>
                    <div><dt className="text-text-muted">Recorded at</dt><dd className="mt-1">{selectedRecord.timestamp ? new Date(selectedRecord.timestamp).toLocaleString() : 'N/A'}</dd></div>
                  </dl>
                </section>

                <section className="ck-card p-4">
                  <h2 className="mb-3 text-sm font-semibold">Stored input features</h2>
                  {featureData.length ? (
                    <div className="overflow-x-auto">
                      <table className="ck-table">
                        <thead><tr><th>Feature</th><th>Recorded value</th></tr></thead>
                        <tbody>{featureData.map(({ feature, value }) => (
                          <tr key={feature}><td>{feature}</td><td className="font-mono">{value}</td></tr>
                        ))}</tbody>
                      </table>
                    </div>
                  ) : <EmptyState title="Input features unavailable" description="This record does not contain stored feature values." />}
                </section>

                <section className="ck-card p-4">
                  <h2 className="mb-1 text-sm font-semibold">Global model feature importance</h2>
                  <p className="mb-3 text-2xs text-text-muted">
                    {matchingModel
                      ? `${matchingModel.model_name_display || matchingModel.model_name} · ${matchingModel.dataset_name || 'Evaluation dataset N/A'} · ${matchingModel.trained_at ? new Date(matchingModel.trained_at).toLocaleString() : 'Evaluation time N/A'}`
                      : 'No matching trained-model evaluation is recorded.'}
                  </p>
                  {globalImportance.length
                    ? <ThreatBarChart data={globalImportance} height={180} />
                    : <EmptyState title="Model importance unavailable" description="No measured global feature importance is stored for this record's model." />}
                </section>
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
