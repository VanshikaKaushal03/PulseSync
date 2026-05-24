import React from 'react';
import { useStore, type CDCEvent } from '../store';
import { Activity, Database, Trash2, Code2, Play, Shield } from 'lucide-react';

export default function LiveFeed() {
  const { events, clearEvents } = useStore();

  const getOperationColor = (op: string) => {
    switch (op) {
      case 'insert': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'update': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'delete': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'replace': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <div className="glass-panel overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
      <div className="bg-gray-900/80 p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold">
          <Activity className="w-5 h-5" />
          <h2>Live Telemetry Stream</h2>
          <span className="bg-indigo-500/20 text-indigo-300 py-0.5 px-2 rounded-full text-xs ml-2 border border-indigo-500/30">
            {events.length} events
          </span>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors">
            <Play className="w-3 h-3" /> Listening
          </button>
          <button
            onClick={clearEvents}
            className="text-gray-400 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-gray-800"
            title="Clear Stream"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-950/50">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
            <Database className="w-12 h-12 opacity-20" />
            <p className="font-medium text-sm">Listening for real-time CDC deltas...</p>
          </div>
        ) : (
          events.map((ev, i) => (
            <EventCard key={ev._id || ev.event_id || i} event={ev} colorClass={getOperationColor(ev.operation)} />
          ))
        )}
      </div>
    </div>
  );
}

function EventCard({ event, colorClass }: { event: CDCEvent; colorClass: string }) {
  const isAdminAction = event.event_type === 'admin_action';
  const isUpdate = event.operation === 'update';
  const hasUpdates = event.updated_fields && Object.keys(event.updated_fields).length > 0;

  return (
    <div className={`bg-gray-900 border rounded-xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300 shrink-0 ${isAdminAction ? 'border-indigo-500/30' : 'border-gray-800'}`}>
      <div className={`flex justify-between items-center p-3 border-b border-gray-800 ${isAdminAction ? 'bg-indigo-950/40' : 'bg-gray-950/30'}`}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${colorClass}`}>
            {event.operation}
          </span>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="font-mono text-gray-300">{event.collection}</span>
            <span>&rarr;</span>
            <span className="font-mono text-indigo-400 truncate max-w-[180px]">{event.document_id}</span>
          </div>
          {/* Admin action badge */}
          {isAdminAction && event.admin_username && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
              <Shield className="w-2.5 h-2.5" />
              {event.admin_username}
            </span>
          )}
        </div>
        <span className="text-gray-500 text-xs font-mono shrink-0">{new Date(event.timestamp).toLocaleTimeString()}</span>
      </div>

      {/* Summary line for admin actions */}
      {isAdminAction && event.summary && (
        <div className="px-4 py-2 bg-indigo-500/5 border-b border-indigo-500/10 text-xs text-indigo-300">
          {event.summary}
        </div>
      )}

      <div className="p-0">
        {isUpdate ? (
          <div className="flex flex-col">
            {hasUpdates && (
              <div className="border-b border-gray-800 last:border-0">
                <div className="px-4 py-1.5 bg-blue-500/5 text-blue-400 text-[10px] font-bold tracking-widest uppercase border-b border-gray-800">
                  Field Diffs (Modified)
                </div>
                <div className="bg-[#1e1e1e] overflow-auto">
                  <pre className="p-4 text-gray-300 text-xs font-mono">
                    {JSON.stringify(event.updated_fields, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            {event.removed_fields && event.removed_fields.length > 0 && (
              <div>
                <div className="px-4 py-1.5 bg-red-500/5 text-red-400 text-[10px] font-bold tracking-widest uppercase border-b border-gray-800">
                  Removed Fields
                </div>
                <div className="p-4 bg-gray-950 text-red-400/80 text-xs font-mono">
                  {event.removed_fields.join(', ')}
                </div>
              </div>
            )}
          </div>
        ) : (
          event.full_document && (
            <div className="flex flex-col">
              <div className="px-4 py-1.5 bg-gray-800/30 text-gray-400 text-[10px] font-bold tracking-widest uppercase border-b border-gray-800 flex items-center gap-2">
                <Code2 className="w-3 h-3" /> Full Document Snapshot
              </div>
              <div className="h-48 bg-[#1e1e1e] overflow-auto">
                <pre className="p-4 text-gray-300 text-xs font-mono">
                  {JSON.stringify(event.full_document, null, 2)}
                </pre>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
