import React from 'react';
import { Globe } from 'lucide-react';
import { EmptyState } from '../common/States';

export default function CyberParticleMap() {
  return (
    <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-border bg-bg-primary">
      <EmptyState
        icon={Globe}
        title="Geographic threat map unavailable"
        description="The application does not store verified geographic coordinates or live network telemetry. Use the observed network-flow graph instead."
      />
    </div>
  );
}
