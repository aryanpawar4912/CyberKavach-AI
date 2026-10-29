import React from 'react';
import { EmptyState } from '../common/States';

export default function CyberIntensitySpectrum({ data = [] }) {
  const maximum = Math.max(0, ...data.map((item) => Number(item.value) || 0));

  return (
    <section className="flex w-full flex-col rounded-lg border border-border bg-bg-secondary p-3.5 shadow-panel">
      <h2 className="mb-2 text-sm font-semibold text-text-primary">
        Detection Activity
      </h2>
      {data.length ? (
        <>
          <div className="flex h-16 items-end gap-1 overflow-x-auto border-b border-border/70 py-1">
            {data.map((item, index) => {
              const value = Number(item.value) || 0;
              const height = maximum ? (value / maximum) * 100 : 0;
              return (
                <div
                  key={`${item.label}-${index}`}
                  className="min-w-1 flex-1 rounded-t-sm bg-accent-emerald/80"
                  style={{ height: `${height}%` }}
                  title={`${item.label}: ${value} detections`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-mono text-text-secondary">
            <span>{data[0].label}</span>
            <span>{maximum.toLocaleString()} max in returned data</span>
            <span>{data[data.length - 1].label}</span>
          </div>
        </>
      ) : (
        <EmptyState title="No activity data" description="Saved detection counts are required to draw this chart." />
      )}
    </section>
  );
}
