import React, { useState } from 'react';
import { useStore } from '../store';
import { Filter, X, Zap } from 'lucide-react';

export default function SubscriptionPanel() {
  const { filters, setFilter, removeFilter, mode, setMode } = useStore();
  const [filterKey, setFilterKey] = useState('status');
  const [filterVal, setFilterVal] = useState('shipped');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (filterKey && filterVal) {
      setFilter(filterKey, filterVal);
      setFilterKey('');
      setFilterVal('');
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden flex flex-col">
      <div className="bg-gray-800/50 p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold">
          <Filter className="w-5 h-5" />
          <h2>Smart Client Selection</h2>
        </div>
        
        <div className="flex items-center bg-gray-900 rounded-lg p-1 border border-gray-700">
          <button
            onClick={() => setMode('websocket')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${mode === 'websocket' ? 'bg-indigo-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            WebSocket
          </button>
          <button
            onClick={() => setMode('sse')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${mode === 'sse' ? 'bg-indigo-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            SSE
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <p className="text-sm text-gray-400">
          Subscribe to specific patterns. Delta updates will be pushed only if they match these rules.
        </p>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            placeholder="Field (e.g. status)"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-200"
            value={filterKey}
            onChange={(e) => setFilterKey(e.target.value)}
          />
          <span className="text-gray-500 self-center">=</span>
          <input
            type="text"
            placeholder="Value (e.g. shipped)"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-200"
            value={filterVal}
            onChange={(e) => setFilterVal(e.target.value)}
          />
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            Add
          </button>
        </form>

        <div className="flex flex-wrap gap-2 mt-2">
          {Object.keys(filters).length === 0 && (
            <span className="text-sm text-gray-500 italic">No filters active. Receiving all updates.</span>
          )}
          {Object.entries(filters).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-sm border border-indigo-500/30">
              <span className="font-mono">{k}="{v}"</span>
              <button onClick={() => removeFilter(k)} className="hover:text-indigo-100 transition-colors ml-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
