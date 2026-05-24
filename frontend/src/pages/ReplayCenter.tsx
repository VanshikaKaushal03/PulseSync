import React, { useEffect, useState } from 'react';
import { History, Play, RotateCcw, Download, Loader2, Shield, User, ArrowRight, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

type Tab = 'events' | 'audit';

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function statusColor(status: string) {
  switch (status) {
    case 'shipped': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    case 'delivered': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'processing': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'pending': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  }
}

function getOpColor(op: string) {
  switch (op) {
    case 'insert': return 'text-green-400 bg-green-400/10 border-green-400/20';
    case 'update': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    case 'delete': return 'text-red-400 bg-red-400/10 border-red-400/20';
    default: return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
  }
}

export function ReplayCenter() {
  const [tab, setTab] = useState<Tab>('events');
  const [events, setEvents] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  const { token } = useAuthStore();

  const fetchEvents = () => {
    fetch('http://localhost:8000/replay?limit=50', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setEvents(data); })
      .catch(console.error);
  };

  const fetchAdminLogs = () => {
    fetch('http://localhost:8000/admin/logs?limit=100', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAdminLogs(data); })
      .catch(console.error);
  };

  useEffect(() => {
    fetchEvents();
    fetchAdminLogs();
    // Auto-refresh audit log every 5s
    const int = setInterval(() => {
      fetchEvents();
      fetchAdminLogs();
    }, 5000);
    return () => clearInterval(int);
  }, [token]);

  const handleExport = () => {
    const payload = tab === 'events' ? events : adminLogs;
    const dataStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulsesync_${tab}_export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReplay = () => {
    setIsReplaying(true);
    setReplayProgress(0);
    const interval = setInterval(() => {
      setReplayProgress(p => {
        if (p >= 100) { clearInterval(interval); setTimeout(() => setIsReplaying(false), 500); return 100; }
        return p + 5;
      });
    }, 100);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <History className="w-6 h-6 text-indigo-400" />
            Replay Center
          </h1>
          <p className="text-gray-400 text-sm mt-1">Immutable event log and admin audit trail for replay, recovery, and compliance.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-700"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          {tab === 'events' && (
            <button
              onClick={handleReplay}
              disabled={isReplaying}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg ${isReplaying ? 'bg-indigo-500/50 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'}`}
            >
              {isReplaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isReplaying ? 'Replaying...' : 'Start Replay Task'}
            </button>
          )}
        </div>
      </div>

      {isReplaying && (
        <div className="w-full bg-gray-900 rounded-full h-1.5 shrink-0">
          <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-100 ease-linear" style={{ width: `${replayProgress}%` }} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-xl border border-gray-800 w-fit shrink-0">
        <button
          onClick={() => setTab('events')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'events' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <History className="w-4 h-4" /> Event Store
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === 'events' ? 'bg-white/20' : 'bg-gray-800'}`}>
            {events.length}
          </span>
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'audit' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <Shield className="w-4 h-4" /> Admin Audit Log
          {adminLogs.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === 'audit' ? 'bg-white/20' : 'bg-indigo-500/20 text-indigo-300'}`}>
              {adminLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="glass-panel flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center shrink-0">
          {tab === 'events' ? (
            <div className="text-sm font-medium text-gray-400">
              Showing last {events.length} immutable CDC events
            </div>
          ) : (
            <div className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              {adminLogs.length} admin actions recorded
            </div>
          )}
          <button
            onClick={() => { fetchEvents(); fetchAdminLogs(); }}
            className="text-gray-400 hover:text-indigo-400 transition-colors p-1"
            title="Refresh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* ── Event Store Tab ── */}
        {tab === 'events' && (
          <div className="flex-1 overflow-y-auto p-0">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-950/50 text-gray-400 sticky top-0 z-10 backdrop-blur-md border-b border-gray-800">
                <tr>
                  <th className="px-6 py-3 font-medium">Timestamp</th>
                  <th className="px-6 py-3 font-medium">Operation</th>
                  <th className="px-6 py-3 font-medium">Collection</th>
                  <th className="px-6 py-3 font-medium">Document ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50 text-gray-300">
                {events.map((ev, idx) => (
                  <tr key={ev._id || idx} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">
                      {new Date(ev.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getOpColor(ev.operation)}`}>
                        {ev.operation}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs">{ev.collection}</td>
                    <td className="px-6 py-3 font-mono text-xs text-indigo-400">{ev.document_id}</td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No historical events found in the immutable store.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Admin Audit Log Tab ── */}
        {tab === 'audit' && (
          <div className="flex-1 overflow-y-auto p-0">
            {adminLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
                <Shield className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">No admin actions recorded yet</p>
                <p className="text-xs text-gray-600">Update an order status from the Dashboard to create the first entry</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {adminLogs.map((log, idx) => (
                  <div key={log._id || idx} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-800/20 transition-colors group">
                    {/* Admin Avatar */}
                    <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 text-sm font-bold uppercase">
                      {log.admin_username?.[0] || <User className="w-4 h-4" />}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{log.admin_username}</span>
                        <span className="text-xs text-gray-500">{log.admin_email}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-gray-400">changed</span>
                        <span className="text-xs font-mono text-indigo-400">#{log.order_id?.substring(0, 10)}</span>
                        <span className="text-xs text-gray-400">({log.product_name || 'unknown product'} · {log.customer_name})</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusColor(log.previous_status)}`}>
                          {log.previous_status}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-600" />
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusColor(log.new_status)}`}>
                          {log.new_status}
                        </span>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="text-right shrink-0">
                      <div className="text-xs text-gray-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</div>
                      <div className="text-[10px] text-gray-600 flex items-center gap-0.5 justify-end mt-0.5">
                        <Clock className="w-2.5 h-2.5" /> {timeAgo(log.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
