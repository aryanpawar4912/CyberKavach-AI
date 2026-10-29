import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow, Background, Controls,
  useNodesState, useEdgesState,
  Handle, Position, Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ─── Custom Cyber Node ────────────────────────────────────────────────────────
const STATUS_COLORS = {
  safe:     { ring: '#526b50', fill: '#edf0e7', text: '#435b46', glow: 'rgba(67,91,70,0.12)' },
  warning:  { ring: '#a77b43', fill: '#f3eddf', text: '#88612f', glow: 'rgba(167,123,67,0.12)' },
  critical: { ring: '#a25548', fill: '#f2e5df', text: '#984e43', glow: 'rgba(162,85,72,0.14)' },
  unknown:  { ring: '#aaa493', fill: '#fbf9f2', text: '#68685c', glow: 'rgba(91,89,74,0.08)' },
};

const TYPE_ICONS = {
  firewall: '🛡',
  switch:   '⬡',
  server:   '▪',
  endpoint: '◦',
  iot:      '◈',
  external: '◉',
};

function CKNode({ data, selected }) {
  const colors = STATUS_COLORS[data.status] || STATUS_COLORS.unknown;
  const icon = TYPE_ICONS[data.type] || '●';
  const isHighlighted = data.isHighlighted;

  return (
    <div
      title={`${data.label}; ${data.records} associated detections; ${data.active_alerts} active alerts; categories: ${Object.entries(data.categories || {}).map(([category, count]) => `${category} (${count})`).join(', ') || 'none recorded'}`}
      style={{
        background: colors.fill,
        border: `1px solid ${selected || isHighlighted ? '#435b46' : colors.ring}`,
        borderRadius: 8,
        padding: '8px 11px',
        minWidth: 118,
        boxShadow: selected || isHighlighted
          ? `0 0 0 2px #435b46, 0 4px 14px ${colors.glow}`
          : `0 2px 8px ${colors.glow}`,
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.ring, width: 6, height: 6, border: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 10, color: colors.text }}>{icon}</span>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 600, color: colors.text, lineHeight: 1.3, letterSpacing: '0.02em' }}>
            {data.label}
          </div>
          <div style={{ fontSize: 8, color: '#68685c', fontFamily: 'monospace' }}>{data.ip}</div>
        </div>
        {data.records > 0 && (
          <div
            style={{
              marginLeft: 'auto',
              fontSize: 8,
              fontWeight: 700,
              color: colors.text,
              background: colors.glow,
              borderRadius: 3,
              padding: '1px 4px',
              minWidth: 16,
              textAlign: 'center',
            }}
          >
            {data.records}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: colors.ring, width: 6, height: 6, border: 'none' }} />
    </div>
  );
}

const nodeTypes = { ckNode: CKNode };

export default function NetworkGraph({ topologyData, height = '100%', compact = false, searchQuery = '', onSelectNode }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(topologyData?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(topologyData?.edges || []);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    setNodes(topologyData?.nodes || []);
    setEdges(topologyData?.edges || []);
    setSelectedNode(null);
  }, [topologyData, setEdges, setNodes]);

  // Search and filter highlighting
  useEffect(() => {
    if (!searchQuery.trim()) {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, isHighlighted: false },
        }))
      );
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    setNodes((nds) =>
      nds.map((n) => {
        const matches =
          (n.data.label || '').toLowerCase().includes(q) ||
          (n.data.ip || '').toLowerCase().includes(q) ||
          (n.data.type || '').toLowerCase().includes(q);
        return {
          ...n,
          data: { ...n.data, isHighlighted: matches },
        };
      })
    );
  }, [searchQuery, setNodes]);

  const filteredNodes = useMemo(() => {
    if (filterStatus === 'all') return nodes;
    return nodes.map((n) => ({
      ...n,
      hidden: n.data.status !== filterStatus,
    }));
  }, [nodes, filterStatus]);

  const handleNodeClick = useCallback(
    (_, node) => {
      setSelectedNode(node);
      if (onSelectNode) onSelectNode(node);
    },
    [onSelectNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    if (onSelectNode) onSelectNode(null);
  }, [onSelectNode]);

  return (
    <div style={{ height, width: '100%', position: 'relative' }} className="network-canvas rounded overflow-hidden">
      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.4}
        maxZoom={2}
        style={{ background: 'transparent' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#d3cebf" gap={28} size={1} />
        {!compact && (
          <Controls
            style={{
              background: '#fbf9f2',
              border: '1px solid #d3cebf',
              borderRadius: 8,
            }}
          />
        )}

        {/* Status filter panel */}
        <Panel position="top-right">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-card p-1 shadow-card">
            {['all', 'warning', 'critical', 'unknown'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2 py-0.5 rounded text-2xs font-medium transition-colors cursor-pointer ${
                  filterStatus === s
                    ? s === 'all'
                      ? 'bg-bg-elevated text-text-primary'
                      : s === 'warning'
                      ? 'bg-status-warning-dim text-status-warning'
                      : s === 'critical'
                      ? 'bg-status-critical-dim text-status-critical'
                      : 'bg-bg-elevated text-text-secondary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </Panel>

        <Panel position="bottom-right">
          <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-bg-card/95 p-3 shadow-panel backdrop-blur">
            <div className="mb-0.5 font-mono text-2xs font-medium uppercase tracking-wider text-text-secondary">
              Associated alert status
            </div>
            {[
              { color: '#a77b43', label: 'Active alert' },
              { color: '#a25548', label: 'Active high/critical alert' },
              { color: '#99917f', label: 'No active alert recorded' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: color, boxShadow: `0 0 5px ${color}` }}
                />
                <span className="font-mono text-2xs text-text-secondary">{label}</span>
              </div>
            ))}
          </div>
        </Panel>
      </ReactFlow>

      {/* Selected Node Tooltip Card */}
      {selectedNode && !onSelectNode && (
        <div className="absolute bottom-4 left-4 z-30 w-64 animate-fade-in rounded-lg border border-accent-emerald/40 bg-bg-card p-3 shadow-panel">
          <div className="flex items-center justify-between mb-2">
            <span className="truncate text-sm font-semibold text-text-primary">
              {selectedNode.data.label}
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-0.5 text-xs text-text-secondary hover:text-text-primary"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">Entity type:</span>
              <span className="text-text-primary capitalize">{selectedNode.data.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">IP Address:</span>
              <span className="font-mono text-accent-cyan font-semibold">{selectedNode.data.ip}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Alert-derived state:</span>
              <span
                className={`font-mono text-2xs uppercase font-semibold ${
                  selectedNode.data.status === 'warning'
                    ? 'text-status-warning'
                    : selectedNode.data.status === 'critical'
                    ? 'text-status-critical'
                    : 'text-text-secondary'
                }`}
              >
                {selectedNode.data.status}
              </span>
            </div>
            {selectedNode.data.records > 0 && (
              <div className="flex justify-between pt-1 border-t border-border">
                <span className="text-text-secondary">Associated records:</span>
                <span className="font-mono font-bold">{selectedNode.data.records}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
