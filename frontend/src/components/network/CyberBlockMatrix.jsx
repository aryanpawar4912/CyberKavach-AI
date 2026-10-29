import React from 'react';
import { EmptyState } from '../common/States';

export default function CyberBlockMatrix({ categories = [] }) {
  return (
    <section className="flex h-full flex-col rounded-lg border border-border bg-bg-secondary p-3 shadow-panel">
      <h2 className="mb-3 text-sm font-semibold text-text-primary">
        Observed Prediction Categories
      </h2>
      {categories.length ? (
        <div className="space-y-2 overflow-y-auto">
          {categories.map((category) => (
            <div key={category.name} className="flex items-center justify-between rounded-md border border-border bg-bg-card px-3 py-2">
              <span className="truncate text-xs text-text-primary">{category.name}</span>
              <span className="ml-3 font-mono text-xs text-accent-emerald">{category.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No categories recorded" description="Category counts appear after saved predictions exist." />
      )}
    </section>
  );
}
