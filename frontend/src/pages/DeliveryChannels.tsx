import React, { useEffect, useState, useCallback } from 'react';
import { Network, Server, ArrowDownToLine, ZapOff, Activity, AlertTriangle, Filter, Plus, Save, Play, Code, CheckCircle, Database, Trash2, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

// ─── Smart Subscriptions schema ───────────────────────────────────────────────

const DB_SCHEMAS: Record<string, { label: string; collections: string[]; fields: string[] }> = {
  'fastapi_cdc': {
    label: 'Global Orders DB',
    collections: ['orders', 'events', 'users'],
    fields: ['status', 'customer_name', 'product_name', 'price', 'priority', 'customer_email'],
  },
  'inventory': {
    label: 'Inventory US DB',
    collections: ['products', 'stock', 'warehouses'],
    fields: ['status', 'product_name', 'quantity', 'category', 'supplier'],
  },
  'users': {
    label: 'User Auth DB',
    collections: ['profiles', 'sessions', 'roles'],
    fields: ['role', 'email', 'username', 'active', 'customer_name'],
  },
  'analytics': {
    label: 'Analytics Cluster',
    collections: ['customer_metrics', 'sessions', 'events'],
    fields: ['event_type', 'customer_id', 'region', 'score', 'channel'],
  },
};

interface Rule { field: string; operator: string; value: string; }
interface Subscription { id: string; name: string; database: string; collection: string; rules: Rule[]; }

const DEFAULT_SUBS: Subscription[] = [{
  id: 'sub_1', name: 'Shipped Orders', database: 'fastapi_cdc', collection: 'orders',
  rules: [{ field: 'status', operator: 'equals', value: 'shipped' }],
}];

const LS_SUBS_KEY = 'smart_subscriptions_v2';
const LS_ACTIVE_KEY = 'smart_subscriptions_active_v2';

function loadSubs(): Subscription[] {
  try { const r = localStorage.getItem(LS_SUBS_KEY); if (r) return JSON.parse(r); } catch {}
  return DEFAULT_SUBS;
}
function saveSubs(subs: Subscription[]) {
  try { localStorage.setItem(LS_SUBS_KEY, JSON.stringify(subs)); } catch {}
}
function loadActiveId(subs: Subscription[]): string {
  try { const id = localStorage.getItem(LS_ACTIVE_KEY); if (id && subs.find(s => s.id === id)) return id; } catch {}
  return subs[0]?.id || '';
}
function buildMongoFilter(rules: Rule[]) {
  const f: Record<string, any> = {};
  for (const rule of rules) {
    const val = rule.value.trim();
    if (!rule.field || !val) continue;
    if (rule.operator === 'equals') f[rule.field] = val;
    else if (rule.operator === 'not_equals') f[rule.field] = { $ne: val };
    else if (rule.operator === 'contains') f[rule.field] = { $regex: val, $options: 'i' };
    else if (rule.operator === 'greater_than') f[rule.field] = { $gt: parseFloat(val) || val };
  }
  return f;
}

// ─── Main merged component ─────────────────────────────────────────────────────

export function DeliveryChannels() {
  // ── Delivery metrics state ──
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const fetch_ = () =>
      fetch('http://localhost:8000/metrics').then(r => r.json()).then(setMetrics).catch(console.error);
    fetch_();
    const int = setInterval(fetch_, 2000);
    return () => clearInterval(int);
  }, []);

  const queueData = [
    { name: 'WebSocket Buffer', size: 0, capacity: 1000 },
    { name: 'SSE Queues', size: metrics?.real?.avg_queue_depth || 0, capacity: 100 },
    { name: 'Retry Queue', size: metrics?.real?.dropped_events || 0, capacity: 500 },
  ];

  // ── Smart Subscriptions state ──
  const [sources, setSources] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => loadSubs());
  const [activeSubId, setActiveSubId] = useState<string>(() => loadActiveId(loadSubs()));
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('http://localhost:8000/sources').then(r => r.json()).then(setSources).catch(console.error);
  }, []);
  useEffect(() => { saveSubs(subscriptions); }, [subscriptions]);
  useEffect(() => { try { localStorage.setItem(LS_ACTIVE_KEY, activeSubId); } catch {} }, [activeSubId]);

  const activeSub = subscriptions.find(s => s.id === activeSubId) ?? subscriptions[0];
  const schema = DB_SCHEMAS[activeSub?.database] || { label: activeSub?.database, collections: [], fields: [] };

  const updateActiveSub = useCallback((patch: Partial<Subscription>) => {
    setSubscriptions(prev => prev.map(s => s.id === activeSubId ? { ...s, ...patch } : s));
  }, [activeSubId]);

  const addRule = () => updateActiveSub({ rules: [...activeSub.rules, { field: '', operator: 'equals', value: '' }] });
  const removeRule = (idx: number) => {
    const newRules = activeSub.rules.filter((_, i) => i !== idx);
    updateActiveSub({ rules: newRules.length ? newRules : [{ field: '', operator: 'equals', value: '' }] });
  };
  const updateRule = (idx: number, patch: Partial<Rule>) =>
    updateActiveSub({ rules: activeSub.rules.map((r, i) => i === idx ? { ...r, ...patch } : r) });

  const addSubscription = () => {
    const newSub: Subscription = {
      id: `sub_${Date.now()}`, name: 'New Subscription',
      database: 'fastapi_cdc', collection: 'orders',
      rules: [{ field: 'status', operator: 'equals', value: '' }],
    };
    setSubscriptions(prev => { const u = [...prev, newSub]; saveSubs(u); return u; });
    setActiveSubId(newSub.id);
    setPreviewData(null);
  };

  const deleteSubscription = (id: string) => {
    setSubscriptions(prev => {
      const rem = prev.filter(s => s.id !== id);
      const result = rem.length ? rem : DEFAULT_SUBS;
      saveSubs(result);
      if (activeSubId === id) setActiveSubId(result[0]?.id || '');
      return result;
    });
    setPreviewData(null);
  };

  const handleTestConnection = async () => {
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const filterObj = buildMongoFilter(activeSub.rules);
      const params = new URLSearchParams({
        db_name: activeSub.database, collection: activeSub.collection,
        filters: JSON.stringify(filterObj),
      });
      const res = await fetch(`http://localhost:8000/query?${params}`);
      if (!res.ok) throw new Error(`Server error ${res.status}: ${await res.text()}`);
      const result = await res.json();
      setPreviewData(result.data ?? []);
    } catch (e: any) {
      setPreviewData({ error: e.message || 'Failed to connect' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = () => { saveSubs(subscriptions); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const compiledFilter = activeSub ? buildMongoFilter(activeSub.rules) : {};

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* ── Section 1: Delivery Channel Metrics ── */}
      <div>
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Network className="w-6 h-6 text-indigo-400" />
            Delivery Channels &amp; Smart Subscriptions
          </h1>
          <p className="text-gray-400 text-sm mt-1">Monitor live channel health, queue depth, and build event subscription filters — all in one place.</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard title="WebSocket Clients" value={metrics?.real?.websocket_clients || 0} icon={ZapOff} color="text-blue-400" />
          <MetricCard title="SSE Clients" value={metrics?.real?.sse_clients || 0} icon={Server} color="text-emerald-400" />
          <MetricCard title="Dropped Events" value={metrics?.real?.dropped_events || 0} icon={ArrowDownToLine} color="text-red-400" />
          <MetricCard title="Client Reconnects" value={metrics?.real?.reconnects || 0} icon={Activity} color="text-amber-400" />
        </div>

        {/* Queue Depth Chart */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Queue Depth (Backpressure)</h2>
            {metrics?.real?.avg_queue_depth > 50 && (
              <span className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">
                <AlertTriangle className="w-3 h-3" /> High Backpressure
              </span>
            )}
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={queueData} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" stroke="#52525b" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#e4e4e7" fontSize={12} width={110} />
                <Tooltip
                  cursor={{ fill: '#27272a', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#121214', borderColor: '#27272a', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="size" name="Current Depth" fill="#ffffff" radius={[0, 4, 4, 0]} />
                <Bar dataKey="capacity" name="Max Capacity" fill="#27272a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-800" />
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest">
          <Filter className="w-3.5 h-3.5 text-indigo-400" />
          Smart Subscriptions
        </div>
        <div className="flex-1 h-px bg-gray-800" />
      </div>

      {/* ── Section 2: Smart Subscriptions ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <p className="text-gray-400 text-sm">Select a database and build JSON filters to route specific events to your clients.</p>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg ${saved ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'}`}
          >
            {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Subscription'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Subscription List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Subscriptions</h2>
              <button onClick={addSubscription} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-xs font-medium">
                <Plus className="w-3 h-3" /> New
              </button>
            </div>
            {subscriptions.map(sub => (
              <div
                key={sub.id}
                onClick={() => { setActiveSubId(sub.id); setPreviewData(null); }}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all group ${
                  activeSubId === sub.id
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                    : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-700'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{sub.name}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                    <Database className="w-2.5 h-2.5" />
                    {DB_SCHEMAS[sub.database]?.label || sub.database} · {sub.collection}
                  </div>
                </div>
                {subscriptions.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSubscription(sub.id); }}
                    className="ml-2 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Center: Filter Builder */}
          <div className="lg:col-span-2 space-y-4">
            {activeSub && (
              <>
                <div className="glass-panel p-5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Subscription Name</label>
                  <input
                    type="text"
                    value={activeSub.name}
                    onChange={e => updateActiveSub({ name: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="glass-panel p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Database className="w-3 h-3" /> Target Database
                    </label>
                    <div className="relative">
                      <select
                        value={activeSub.database}
                        onChange={e => {
                          const db = e.target.value;
                          updateActiveSub({ database: db, collection: DB_SCHEMAS[db]?.collections[0] || '', rules: [{ field: '', operator: 'equals', value: '' }] });
                          setPreviewData(null);
                        }}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none appearance-none pr-8"
                      >
                        {Object.entries(DB_SCHEMAS).map(([key, val]) => (
                          <option key={key} value={key}>{val.label} ({key})</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                    {sources.find(s => s.db_name === activeSub.database) ? (
                      <p className="text-[10px] text-emerald-400 mt-1.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Live CDC source connected
                      </p>
                    ) : (
                      <p className="text-[10px] text-yellow-500 mt-1.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" /> Using replay fallback
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Collection</label>
                    <div className="relative">
                      <select
                        value={activeSub.collection}
                        onChange={e => updateActiveSub({ collection: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none appearance-none pr-8"
                      >
                        {schema.collections.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-200 text-sm">Filter Rules</h2>
                    <button onClick={addRule} className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium">
                      <Plus className="w-4 h-4" /> Add Condition
                    </button>
                  </div>
                  <div className="space-y-3">
                    {activeSub.rules.map((rule, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-950 p-3 rounded-lg border border-gray-800">
                        <div className="text-[10px] font-bold text-gray-600 w-10 text-center shrink-0">{idx === 0 ? 'WHERE' : 'AND'}</div>
                        <select
                          className="bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 px-2.5 py-1.5 focus:border-indigo-500 outline-none flex-1"
                          value={rule.field}
                          onChange={e => updateRule(idx, { field: e.target.value })}
                        >
                          <option value="">Select field...</option>
                          {schema.fields.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <select
                          className="bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 px-2.5 py-1.5 focus:border-indigo-500 outline-none"
                          value={rule.operator}
                          onChange={e => updateRule(idx, { operator: e.target.value })}
                        >
                          <option value="equals">equals</option>
                          <option value="not_equals">not equals</option>
                          <option value="contains">contains</option>
                          <option value="greater_than">greater than</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Value"
                          className="bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 px-2.5 py-1.5 focus:border-indigo-500 outline-none flex-1"
                          value={rule.value}
                          onChange={e => updateRule(idx, { value: e.target.value })}
                          onBlur={e => updateRule(idx, { value: e.target.value.trim() })}
                        />
                        {activeSub.rules.length > 1 && (
                          <button onClick={() => removeRule(idx)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right: Compiled JSON + Live Preview */}
          <div className="space-y-4">
            <div className="glass-panel p-5">
              <h2 className="font-semibold text-gray-200 flex items-center gap-2 mb-3 text-sm">
                <Code className="w-4 h-4 text-gray-400" /> Compiled Filter
              </h2>
              <pre className="bg-gray-950 p-4 rounded-lg border border-gray-800 text-xs font-mono text-indigo-300 overflow-x-auto max-h-56">
                {JSON.stringify(compiledFilter, null, 2) || '{}'}
              </pre>
              <div className="mt-3 pt-3 border-t border-gray-800 text-[10px] text-gray-500 space-y-1">
                <div>Database: <span className="text-gray-300 font-mono">{activeSub?.database}</span></div>
                <div>Collection: <span className="text-gray-300 font-mono">{activeSub?.collection}</span></div>
              </div>
            </div>

            <div className="glass-panel p-5 bg-indigo-900/10 border-indigo-500/20">
              <h2 className="font-semibold text-indigo-200 flex items-center gap-2 mb-1 text-sm">
                <Play className="w-4 h-4 text-indigo-400" /> Live Preview
              </h2>
              <p className="text-xs text-indigo-300/60 mb-3">Fetch matching documents from the selected database and collection.</p>
              <button
                onClick={handleTestConnection}
                disabled={previewLoading}
                className="w-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 py-2 rounded-lg text-sm font-medium hover:bg-indigo-600/30 transition-colors disabled:opacity-50"
              >
                {previewLoading ? 'Querying...' : 'Test Connection'}
              </button>
              {previewData && !previewData.error && (
                <div className="mt-3">
                  <div className="text-[10px] font-bold tracking-wider text-emerald-400 mb-2 uppercase">
                    Matching Results ({Array.isArray(previewData) ? previewData.length : 0})
                  </div>
                  <pre className="bg-gray-950 p-3 rounded-lg border border-gray-800 text-[10px] font-mono text-gray-300 overflow-auto max-h-52">
                    {JSON.stringify(previewData, null, 2)}
                  </pre>
                </div>
              )}
              {previewData?.error && (
                <div className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  {previewData.error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared UI sub-components ───────────────────────────────────────────────────

function MetricCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg bg-gray-950 border border-gray-800 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">{title}</h3>
        <div className="text-2xl font-bold text-white">{value}</div>
      </div>
    </div>
  );
}
