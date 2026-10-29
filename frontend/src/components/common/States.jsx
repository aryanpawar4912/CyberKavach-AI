import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function LoadingState({ message = 'Loading…', size = 'md' }) {
  const sizes = { sm: 'py-4', md: 'py-12', lg: 'py-24' };
  return (
    <div className={`flex flex-col items-center justify-center ${sizes[size]} gap-3`}>
      <div className="w-6 h-6 border-2 border-border border-t-accent-emerald rounded-full animate-spin" />
      <span className="text-xs text-text-muted">{message}</span>
    </div>
  );
}

export function ErrorState({ message = 'An error occurred.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <AlertTriangle size={20} className="text-status-warning" />
      <span className="text-xs text-text-secondary text-center max-w-xs">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="ck-btn flex items-center gap-1.5 mt-1">
          <RefreshCw size={11} /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      {Icon && <Icon size={24} className="text-text-muted" strokeWidth={1} />}
      <div>
        <div className="text-sm font-medium text-text-secondary">{title}</div>
        {description && <div className="text-xs text-text-muted mt-1 max-w-xs">{description}</div>}
      </div>
      {action}
    </div>
  );
}
