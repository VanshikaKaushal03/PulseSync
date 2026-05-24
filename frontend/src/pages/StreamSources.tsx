import React, { useEffect, useState } from 'react';
import { 
  Database, 
  Plus, 
  RefreshCw, 
  Server, 
  Activity, 
  ShieldCheck, 
  Power, 
  X, 
  Table, 
  Code, 
  Eye, 
  AlertCircle,
  Clock
} from 'lucide-react';

export function StreamSources() {
  const [sources, setSources] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', uri: '', db_name: 'test' });
  const [loadingAdd, setLoadingAdd] = useState(false);
  
  // Selected source for data inspector modal
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [sourceData, setSourceData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'grid' | 'json'>('grid');

  const fetchSources = () => {
    fetch('http://localhost:8000/sources')
      .then(r => r.json())
      .then(setSources)
      .catch(console.error);
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAdd(true);
    try {
      const res = await fetch('http://localhost:8000/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSource.name,
          uri: newSource.uri,
          db_name: newSource.db_name,
          type: "mongodb"
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewSource({ name: '', uri: '', db_name: 'test' });
        fetchSources();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdd(false);
    }
  };

  const handleInspectSource = async (source: any) => {
    setSelectedSource(source);
    setLoadingData(true);
    setDataError(null);
    setSourceData(null);
    setInspectorTab('grid');
    
    try {
      const res = await fetch(`http://localhost:8000/sources/${source.id}/data`);
      if (!res.ok) throw new Error("Failed to retrieve collection data");
      const data = await res.json();
      setSourceData(data);
    } catch (err: any) {
      console.error(err);
      setDataError(err.message || "Could not read from target database");
    } finally {
      setLoadingData(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Database className="w-6 h-6 text-indigo-400" />
            Stream Sources
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage and monitor active CDC connections to your databases. Click any database to inspect its live contents.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" /> Add Source
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sources.map(source => (
          <SourceCard 
            key={source.id} 
            source={source} 
            onInspect={() => handleInspectSource(source)} 
          />
        ))}
        
        {/* Placeholder for adding new source */}
        <div 
          onClick={() => setShowAddModal(true)}
          className="glass-panel border-dashed border-gray-700 hover:border-indigo-500/50 flex flex-col items-center justify-center p-8 text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all cursor-pointer group h-full min-h-[280px]"
        >
          <div className="w-12 h-12 rounded-full bg-gray-800 group-hover:bg-indigo-500/20 flex items-center justify-center mb-4 transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <p className="font-medium">Connect Database</p>
          <p className="text-xs mt-1 text-center max-w-[200px]">MongoDB Replica Sets Only</p>
        </div>
      </div>

      {/* --- ADD SOURCE MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Add Stream Source</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSource} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Source Name</label>
                <input 
                  type="text" 
                  required
                  value={newSource.name}
                  onChange={e => setNewSource({...newSource, name: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Production Inventory"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">MongoDB Connection URI</label>
                <input 
                  type="text" 
                  required
                  value={newSource.uri}
                  onChange={e => setNewSource({...newSource, uri: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="mongodb://localhost:27018/?replicaSet=rs0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Database Name</label>
                <input 
                  type="text" 
                  required
                  value={newSource.db_name}
                  onChange={e => setNewSource({...newSource, db_name: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="test"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loadingAdd}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loadingAdd ? 'Connecting...' : 'Connect Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- LIVE DATABASE DATA INSPECTOR MODAL --- */}
      {selectedSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <Server className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {selectedSource.name}
                    <span className="text-xs font-normal text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase">
                      live explorer
                    </span>
                  </h2>
                  <p className="text-gray-400 text-xs mt-1">
                    Database: <span className="text-gray-300 font-mono">{sourceData?.db_name || selectedSource.db_name || '...'}</span> | 
                    Collection: <span className="text-gray-300 font-mono">{sourceData?.collection || '...'}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {sourceData && (
                  <div className="flex bg-gray-950 p-0.5 rounded-lg border border-gray-800 text-xs">
                    <button
                      onClick={() => setInspectorTab('grid')}
                      className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                        inspectorTab === 'grid' 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" /> Table View
                    </button>
                    <button
                      onClick={() => setInspectorTab('json')}
                      className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                        inspectorTab === 'json' 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" /> Raw JSON
                    </button>
                  </div>
                )}
                <button 
                  onClick={() => setSelectedSource(null)}
                  className="text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 p-2 rounded-full transition-colors border border-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-950/20">
              {loadingData ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
                  <p className="text-gray-400 text-sm">Querying database cluster and reading documents...</p>
                </div>
              ) : dataError ? (
                <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
                  <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                  <h3 className="text-lg font-semibold text-white">Database Query Failed</h3>
                  <p className="text-gray-400 text-sm mt-2">{dataError}</p>
                  <button 
                    onClick={() => handleInspectSource(selectedSource)}
                    className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Retry Connection
                  </button>
                </div>
              ) : sourceData?.data?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
                  <Database className="w-12 h-12 text-gray-700 mb-4" />
                  <p className="font-medium text-gray-400">Connection Successful but Collection is Empty</p>
                  <p className="text-xs text-gray-500 mt-1">No active documents found in {sourceData?.collection}.</p>
                </div>
              ) : (
                <>
                  {inspectorTab === 'grid' && (
                    <div className="border border-gray-800 rounded-xl overflow-hidden shadow-2xl bg-gray-950">
                      <div className="max-h-[50vh] overflow-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-gray-900 border-b border-gray-800 text-gray-400 sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-3 font-semibold uppercase tracking-wider">_id</th>
                              {/* Grab unique keys dynamically for header */}
                              {Object.keys(sourceData?.data[0] || {})
                                .filter(k => k !== '_id' && k !== 'simulated' && typeof sourceData?.data[0][k] !== 'object')
                                .map(key => (
                                  <th key={key} className="px-4 py-3 font-semibold uppercase tracking-wider capitalize">
                                    {key.replace('_', ' ')}
                                  </th>
                                ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/60 text-gray-300">
                            {sourceData?.data.map((doc: any, docIdx: number) => (
                              <tr key={doc._id || docIdx} className="hover:bg-gray-900/30 transition-colors">
                                <td className="px-4 py-3.5 font-mono text-indigo-400 font-medium">{doc._id}</td>
                                {Object.keys(doc)
                                  .filter(k => k !== '_id' && k !== 'simulated' && typeof doc[k] !== 'object')
                                  .map(key => (
                                    <td key={key} className="px-4 py-3.5 max-w-[200px] truncate font-sans">
                                      {key === 'status' ? (
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${
                                          doc[key] === 'delivered' || doc[key] === 'In Stock' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                          doc[key] === 'shipped' || doc[key] === 'Low Stock' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                          doc[key] === 'processing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                          'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                        }`}>
                                          {String(doc[key])}
                                        </span>
                                      ) : key.includes('timestamp') || key.includes('date') || key.includes('updated_at') ? (
                                        <span className="text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(doc[key]).toLocaleString()}</span>
                                      ) : typeof doc[key] === 'boolean' ? (
                                        <span className={`font-semibold ${doc[key] ? 'text-emerald-400' : 'text-gray-500'}`}>{String(doc[key])}</span>
                                      ) : (
                                        String(doc[key])
                                      )}
                                    </td>
                                  ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {inspectorTab === 'json' && (
                    <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 font-mono text-xs overflow-auto max-h-[50vh] text-indigo-300 leading-relaxed shadow-inner">
                      <pre>{JSON.stringify(sourceData?.data, null, 2)}</pre>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-800 bg-gray-950/50 text-gray-500 flex justify-between items-center text-xs">
              <div>
                Showing up to <span className="text-gray-300 font-semibold">{sourceData?.data?.length || 0}</span> documents in real-time.
              </div>
              <button 
                onClick={() => handleInspectSource(selectedSource)}
                className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceCard({ source, onInspect }: { source: any; onInspect: () => void }) {
  return (
    <div 
      onClick={onInspect}
      className="glass-panel flex flex-col h-full overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer transform hover:-translate-y-1 shadow-lg group"
    >
      <div className="p-5 border-b border-gray-800 bg-gray-900/50 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all">
            <Server className="w-5 h-5 text-emerald-400 group-hover:text-indigo-400 transition-colors" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-100 group-hover:text-white transition-colors">{source.name}</h3>
            <p className="text-xs text-gray-400 uppercase tracking-wider">{source.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-medium border border-emerald-500/20">
          <ShieldCheck className="w-3 h-3" /> Connected
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Activity className="w-3 h-3" /> Throughput</div>
            <div className="text-lg font-mono text-gray-200">{source.throughput} <span className="text-xs text-gray-500">events/s</span></div>
          </div>
          <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Latency</div>
            <div className="text-lg font-mono text-gray-200">{source.latency}<span className="text-xs text-gray-500">ms</span></div>
          </div>
        </div>
        
        <div className="mt-auto pt-4 border-t border-gray-800 flex justify-between items-center text-xs text-gray-400 group-hover:text-indigo-400 font-medium transition-colors">
          <span>Click card to explore collections</span>
          <Eye className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );
}
