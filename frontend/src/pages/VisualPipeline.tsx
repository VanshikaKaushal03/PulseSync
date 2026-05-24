import React, { useCallback, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Workflow } from 'lucide-react';

const initialNodes = [
  { id: '1', position: { x: 50, y: 250 }, data: { label: 'MongoDB Replica Set' }, style: { background: '#0a0a0b', color: '#ffffff', border: '1px solid #71717a', borderRadius: '8px', padding: '15px' } },
  { id: '2', position: { x: 300, y: 250 }, data: { label: 'CDC Listener (Motor)' }, style: { background: '#0a0a0b', color: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '15px' } },
  { id: '3', position: { x: 550, y: 150 }, data: { label: 'Filter Engine' }, style: { background: '#0a0a0b', color: '#ffffff', border: '1px solid #a1a1aa', borderRadius: '8px', padding: '15px' } },
  { id: '4', position: { x: 550, y: 350 }, data: { label: 'Event Store (Replay)' }, style: { background: '#0a0a0b', color: '#ffffff', border: '1px solid #a1a1aa', borderRadius: '8px', padding: '15px' } },
  { id: '5', position: { x: 800, y: 150 }, data: { label: 'Delivery Router' }, style: { background: '#0a0a0b', color: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '15px' } },
  { id: '6', position: { x: 1050, y: 50 }, data: { label: 'WebSocket Clients' }, style: { background: '#0a0a0b', color: '#ffffff', border: '1px solid #71717a', borderRadius: '8px', padding: '15px' } },
  { id: '7', position: { x: 1050, y: 250 }, data: { label: 'SSE Clients' }, style: { background: '#0a0a0b', color: '#ffffff', border: '1px solid #71717a', borderRadius: '8px', padding: '15px' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#71717a' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#e4e4e7' } },
  { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: '#e4e4e7' } },
  { id: 'e3-5', source: '3', target: '5', animated: true, style: { stroke: '#a1a1aa' } },
  { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: '#e4e4e7' } },
  { id: 'e5-7', source: '5', target: '7', animated: true, style: { stroke: '#e4e4e7' } },
];

export function VisualPipeline() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Workflow className="w-6 h-6 text-indigo-400" />
            Visual Architecture Pipeline
          </h1>
          <p className="text-gray-400 text-sm mt-1">Interactive diagram of the realtime push delivery flow.</p>
        </div>
      </div>

      <div className="glass-panel flex-1 overflow-hidden relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          colorMode="dark"
        >
          <Controls className="bg-gray-900 border-gray-800 fill-white" />
          <MiniMap nodeStrokeColor="#a1a1aa" nodeColor="#1c1c1f" maskColor="rgba(0,0,0,0.7)" />
          <Background color="#27272a" gap={16} />
        </ReactFlow>
      </div>
    </div>
  );
}
