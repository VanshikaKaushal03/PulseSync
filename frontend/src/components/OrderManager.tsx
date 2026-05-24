import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, RefreshCw, Send, CheckCircle, Trash } from 'lucide-react';

const API_URL = 'http://localhost:8000';

export default function OrderManager() {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/orders/`);
      return res.json();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      await fetch(`${API_URL}/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${API_URL}/orders/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] })
  });

  const createDemoOrder = useMutation({
    mutationFn: async () => {
      await fetch(`${API_URL}/orders/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: "Demo User " + Math.floor(Math.random() * 1000),
          items: [{ product_name: "Magic Mouse", quantity: 1, unit_price: 99 }],
          status: "pending",
          priority: "medium"
        }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] })
  });

  const handleStatusChange = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'pending' ? 'processing' : 
                       currentStatus === 'processing' ? 'shipped' : 
                       currentStatus === 'shipped' ? 'delivered' : 'pending';
    updateMutation.mutate({ id, updates: { status: nextStatus } });
  };

  const handleAddRandomItem = (id: string, currentItems: any[]) => {
    const newItem = { product_name: "Extra Cable", quantity: 1, unit_price: 15 };
    updateMutation.mutate({ id, updates: { items: [...currentItems, newItem] } });
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden flex flex-col flex-1">
      <div className="bg-gray-800/50 p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
          <Package className="w-5 h-5" />
          <h2>Order Manager</h2>
        </div>
        <button 
          onClick={() => createDemoOrder.mutate()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
          title="Create Demo Order"
        >
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[500px]">
        {isLoading ? (
          <div className="text-gray-500 text-center py-4 flex justify-center"><RefreshCw className="animate-spin w-6 h-6" /></div>
        ) : orders.length === 0 ? (
          <div className="text-gray-500 text-center py-4 text-sm">No orders found. Create one to trigger CDC inserts.</div>
        ) : (
          orders.map((order: any) => (
            <div key={order._id} className="bg-gray-900 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-colors">
              
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-200">{order.customer_name}</h3>
                  <div className="text-xs text-gray-500">{order._id.substring(0, 8)}...</div>
                </div>
                <div className="flex gap-1">
                   <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                     order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                     order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                     order.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                     'bg-gray-500/20 text-gray-400'
                   }`}>
                     {order.status}
                   </span>
                   <button onClick={() => deleteMutation.mutate(order._id)} className="text-gray-500 hover:text-red-400 ml-1">
                     <Trash className="w-4 h-4" />
                   </button>
                </div>
              </div>

              <div className="text-xs text-gray-400 mb-3">
                {order.items?.length || 0} items | Priority: <span className="text-gray-300 capitalize">{order.priority}</span>
              </div>

              {/* Action Triggers to Demonstrate CDC Deltas */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
                <button 
                  onClick={() => handleStatusChange(order._id, order.status)}
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 px-2 py-1 rounded text-xs transition-colors flex items-center gap-1"
                >
                  <Send className="w-3 h-3" /> Advance Status
                </button>
                <button 
                  onClick={() => handleAddRandomItem(order._id, order.items || [])}
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 px-2 py-1 rounded text-xs transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}
