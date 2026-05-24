import React, { useEffect, useState, useRef } from 'react';
import { Activity, Zap, Server, Network, Database, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useStore } from '../store';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<'all' | 'latest' | 'past'>('all');
  const prevTotalRef = useRef<number>(0);
  const { events } = useStore();
  const { token } = useAuthStore();

  useEffect(() => {
    // Initial fetch of orders
    if (token) {
      fetch('http://localhost:8000/orders/', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch orders");
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            setOrders(data);
          } else {
            console.error("Orders is not an array:", data);
            setOrders([]);
          }
        })
        .catch(err => {
          console.error("Failed to load orders", err);
          setOrders([]);
        });
    }
  }, [token]);

  // Real-time integration: Update admin order table automatically when CDC events arrive!
  useEffect(() => {
    if (events.length > 0) {
      const latestEvent: any = events[0];
      if (latestEvent.collection === 'orders') {
        if (latestEvent.operation === 'update' && latestEvent.updated_fields) {
          setOrders(prev => prev.map(o => 
            o._id === latestEvent.document_id 
              ? { ...o, ...latestEvent.updated_fields } 
              : o
          ));
        } else if (latestEvent.operation === 'insert' && latestEvent.full_document) {
          setOrders(prev => [latestEvent.full_document, ...prev]);
        } else if (latestEvent.operation === 'delete') {
          setOrders(prev => prev.filter(o => o._id !== latestEvent.document_id));
        }
      }
    }
  }, [events]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await fetch(`http://localhost:8000/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status })
      });
      toast.success(`Requested status change to ${status}`);
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('http://localhost:8000/metrics');
        const data = await res.json();
        setMetrics(data);
        
        const currentTotal = data.real?.total_events_processed || 0;
        let throughputDelta = 0;
        
        if (prevTotalRef.current > 0) {
          throughputDelta = Math.max(0, currentTotal - prevTotalRef.current);
        }
        prevTotalRef.current = currentTotal;

        // Add point to chart
        setChartData(prev => {
          const newData = [...prev, {
            time: new Date().toLocaleTimeString().split(' ')[0],
            throughput: throughputDelta,
            latency: data.simulated?.avg_latency_ms || 0
          }];
          return newData.slice(-15); // keep last 15 points
        });
      } catch (e) {
        console.error(e);
      }
    };

    fetchMetrics();
    const int = setInterval(fetchMetrics, 2000);
    return () => clearInterval(int);
  }, []);

  const sortedOrders = [...orders].sort((a, b) => {
    const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
    const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
    return timeB - timeA;
  });

  const filteredOrders = sortedOrders.filter(order => {
    const ts = order.timestamp || order.created_at;
    if (!ts) return timeFilter === 'past' || timeFilter === 'all';
    
    const diffMs = Date.now() - new Date(ts).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (timeFilter === 'latest') {
      return diffHours < 24;
    } else if (timeFilter === 'past') {
      return diffHours >= 24;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform Overview</h1>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-sm text-gray-400 uppercase tracking-widest font-semibold">Live Telemetry</span>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Connected Databases" 
          value={metrics?.real?.connected_databases || 0}
          icon={Database} 
          trend="Active" 
          color="text-indigo-400"
        />
        <MetricCard 
          title="Events Processed" 
          value={metrics?.real?.total_events_processed || 0}
          icon={Activity} 
          trend="Realtime" 
          color="text-emerald-400"
        />
        <MetricCard 
          title="Avg Queue Depth" 
          value={metrics?.real?.avg_queue_depth?.toFixed(1) || '0.0'}
          icon={Server} 
          trend="Healthy" 
          color="text-blue-400"
        />
        <MetricCard 
          title="Avg Latency (ms)" 
          value={metrics?.simulated?.avg_latency_ms || '0.0'}
          icon={Zap} 
          trend="Simulated" 
          color="text-purple-400"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Realtime Throughput</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121214', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                />
                <Area type="monotone" dataKey="throughput" stroke="#ffffff" strokeWidth={2} fillOpacity={1} fill="url(#colorThroughput)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Delivery Latency (ms)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a1a1aa" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#a1a1aa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121214', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                />
                <Area type="monotone" dataKey="latency" stroke="#a1a1aa" strokeWidth={2} fillOpacity={1} fill="url(#colorLatency)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Interactive Order Manager for Demo Flow */}
      <div className="glass-panel p-6 mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            Interactive Order Manager (Demo)
          </h2>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* segment filter control */}
            <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
              <button
                onClick={() => setTimeFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  timeFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                All Orders
              </button>
              <button
                onClick={() => setTimeFilter('latest')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  timeFilter === 'latest'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Latest Orders
              </button>
              <button
                onClick={() => setTimeFilter('past')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  timeFilter === 'past'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Past Orders
              </button>
            </div>

            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30 shrink-0">
              Real-time CDC Sync Active
            </span>
          </div>
        </div>
        
        <div className="overflow-hidden rounded-xl border border-gray-800">
          <table className="w-full text-left">
            <thead className="bg-gray-900 border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 bg-gray-950/50">
              {filteredOrders.map(order => (
                <tr key={order._id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-indigo-400">
                    #{order._id.length > 8 ? order._id.substring(0, 8) : order._id}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-200">{order.customer_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {order.product_name || order.items?.[0]?.product_name || 'Unknown Item'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                      order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      order.status === 'shipped' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                      order.status === 'processing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    }`}>
                      <span className="capitalize">{order.status || 'pending'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => updateOrderStatus(order._id, 'processing')}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-blue-600 text-white rounded transition-colors"
                      >
                        Processing
                      </button>
                      <button 
                        onClick={() => updateOrderStatus(order._id, 'shipped')}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-indigo-600 text-white rounded transition-colors"
                      >
                        Shipped
                      </button>
                      <button 
                        onClick={() => updateOrderStatus(order._id, 'delivered')}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-emerald-600 text-white rounded transition-colors"
                      >
                        Delivered
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No orders found. Run seed script!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, color }: any) {
  return (
    <div className="glass-panel p-5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
        <Icon className={`w-24 h-24 ${color}`} />
      </div>
      <div className="relative z-10">
        <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
        <div className="text-3xl font-bold text-white mb-2">{value}</div>
        <div className="text-xs font-medium text-gray-500 bg-gray-800/50 inline-flex px-2 py-1 rounded">
          {trend}
        </div>
      </div>
    </div>
  );
}
