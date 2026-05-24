import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  X, 
  Search, 
  ChevronDown, 
  Calendar, 
  RotateCcw, 
  AlertCircle, 
  ShoppingBag, 
  Bell, 
  Activity,
  Sliders, 
  Star, 
  ArrowRight, 
  CreditCard,
  ChevronRight,
  TrendingUp,
  XCircle,
  Plus,
  DollarSign
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

const ViewMode = {
  KANBAN: 'kanban',
  LIST: 'list',
  TIMELINE: 'timeline'
} as const;

type ViewModeType = typeof ViewMode[keyof typeof ViewMode];

interface OrderItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Order {
  _id: string;
  customer_name: string;
  customer_email?: string;
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  category?: string;
  estimated_delivery?: string;
  tracking_number?: string;
  carrier?: string;
  delivery_progress?: number;
  last_checkpoint?: string;
  shipping_address?: string;
  payment_method?: string;
  timestamp?: string;
  created_at?: string;
  updated_at?: string;
}

// Runtime Validation
function validateOrder(order: any): Order | null {
  if (!order || !order.items || !Array.isArray(order.items) || order.items.length === 0) {
    console.warn('Invalid order format detected and filtered:', order);
    return null;
  }
  return order as Order;
}

export function ClientTracker() {
  const [viewMode, setViewMode] = useState<ViewModeType>(ViewMode.KANBAN);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [initialOrders, setInitialOrders] = useState<any[]>([]);
  
  // Interactive Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Checkout State
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductSku, setSelectedProductSku] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const { user, token } = useAuthStore();
  const { connectionStatus: status, events } = useStore();

  // 1. Fetch products catalog from inventory
  useEffect(() => {
    setLoadingProducts(true);
    fetch('http://localhost:8000/inventory/products')
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch products");
        return res.json();
      })
      .then(data => {
        const prodList = data.products || [];
        setProducts(prodList);
        if (prodList.length > 0) {
          setSelectedProductSku(prodList[0].sku);
        }
        setLoadingProducts(false);
      })
      .catch(err => {
        console.error("Failed to fetch products from inventory", err);
        setLoadingProducts(false);
      });
  }, []);

  // 2. Fetch initial orders
  const fetchInitialOrders = () => {
    if (token) {
      fetch('http://localhost:8000/orders/', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch initial orders");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setInitialOrders(data);
        } else {
          console.error("Orders is not an array:", data);
          setInitialOrders([]);
        }
      })
      .catch(err => {
        console.error("Failed to fetch initial orders", err);
        setInitialOrders([]);
      });
    }
  };

  useEffect(() => {
    fetchInitialOrders();
  }, [token]);

  // 3. Fetch history on select
  useEffect(() => {
    if (selectedOrder) {
      setLoadingHistory(true);
      fetch(`http://localhost:8000/orders/${selectedOrder._id}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setHistory(Array.isArray(data) ? data : (data.history || []));
        setLoadingHistory(false);
      })
      .catch(err => {
        console.error("Failed to fetch history", err);
        setLoadingHistory(false);
      });
    }
  }, [selectedOrder, token]);
  
  // 4. Derived State: Apply CDC stream updates locally in memory on top of initial orders
  const ordersMap = new Map();
  
  initialOrders.forEach(o => {
    ordersMap.set(o._id, o);
  });
  
  events.forEach((evt: any) => {
    if (evt.collection === 'orders') {
      if (evt.operation === 'insert' && evt.full_document) {
        ordersMap.set(evt.document_id, evt.full_document);
      } else if (evt.operation === 'update') {
        const existing = ordersMap.get(evt.document_id) || { _id: evt.document_id };
        ordersMap.set(evt.document_id, { 
          ...existing, 
          ...evt.updated_fields,
          updated_at: evt.timestamp || new Date().toISOString()
        });
      } else if (evt.operation === 'delete') {
        ordersMap.delete(evt.document_id);
      }
    }
  });

  // Filter and Validate orders to standardize items schema rendering
  const orders: Order[] = Array.from(ordersMap.values())
    .map(validateOrder)
    .filter((o): o is Order => o !== null);

  // 5. Real-time Status Change Toast Notifications
  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[0] as any;
      if (
        latestEvent &&
        latestEvent.collection === 'orders' &&
        latestEvent.operation === 'update' &&
        latestEvent.updated_fields &&
        latestEvent.updated_fields.status
      ) {
        const matchedOrder = orders.find(o => o._id === latestEvent.document_id);
        if (matchedOrder) {
          const newStatus = latestEvent.updated_fields.status;
          const prodName = matchedOrder.items[0]?.product_name || 'Your order';
          
          let emoji = '📦';
          if (newStatus === 'processing') emoji = '⚙️';
          else if (newStatus === 'shipped') emoji = '🚚';
          else if (newStatus === 'delivered') emoji = '✅';
          else if (newStatus === 'cancelled') emoji = '❌';

          toast.success(
            `Order Updated: "${prodName}" is now ${newStatus.toUpperCase()}!`,
            {
              icon: emoji,
              duration: 5000,
              style: {
                background: '#121214',
                color: '#f4f4f5',
                border: '1px solid #27272a',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
              }
            }
          );
        }
      }
    }
  }, [events]);

  // 6. Cancel Order trigger
  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'cancelled' })
      });
      if (res.ok) {
        toast.success("Cancellation request sent");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to cancel order");
    }
  };

  // 7. Standardized Order Checkout Creation
  const handleCheckout = async () => {
    const selectedProd = products.find(p => p.sku === selectedProductSku);
    if (!selectedProd) {
      toast.error("Please select a valid product");
      return;
    }

    setIsPlacingOrder(true);
    
    // Create new order mapping to strict backend models
    const newOrder = {
      customer_name: user?.customer_name || "Bob",
      customer_email: user?.email || "bob@example.com",
      items: [
        {
          product_id: selectedProd.id,
          product_name: selectedProd.name,
          sku: selectedProd.sku,
          quantity: orderQuantity,
          unit_price: selectedProd.price,
          subtotal: selectedProd.price * orderQuantity
        }
      ],
      total_amount: selectedProd.price * orderQuantity,
      status: "pending" as const,
      priority: Math.random() < 0.3 ? "high" as const : (Math.random() < 0.6 ? "medium" as const : "low" as const),
      category: selectedProd.category || "general",
      shipping_address: "123 Main St, New York, NY",
      payment_method: "Visa (4242)",
      estimated_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    };

    try {
      const res = await fetch('http://localhost:8000/orders/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newOrder)
      });
      
      if (res.ok) {
        toast.success(`Successfully placed order for ${selectedProd.name}!`, {
          icon: '🎉',
          style: {
            background: '#121214',
            color: '#f4f4f5',
            border: '1px solid #27272a',
            borderRadius: '12px'
          }
        });
        setOrderQuantity(1);
      } else {
        const errData = await res.json();
        console.error("Order creation failed:", errData);
        toast.error("Failed to place order: " + (errData.detail || "Server error"));
      }
    } catch (err) {
      console.error("Error creating order:", err);
      toast.error("Error connecting to server");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // 8. Helpers
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'processing': return <Package className="w-4 h-4 text-blue-400" />;
      case 'shipped': return <Truck className="w-4 h-4 text-indigo-400" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-rose-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'electronics': return '💻';
      case 'accessories': return '🔌';
      case 'audio': return '🎧';
      case 'furniture': return '🪑';
      case 'office': return '🪑';
      case 'storage': return '💾';
      case 'displays': return '🖥️';
      default: return '📦';
    }
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch(e) {
      return String(dateStr);
    }
  };

  const daysUntil = (dateStr: any) => {
    if (!dateStr) return 0;
    try {
      const diff = new Date(dateStr).getTime() - Date.now();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 0;
    } catch(e) {
      return 0;
    }
  };

  // 9. Filtering Logic
  const filteredOrders = orders.filter(o => {
    const searchMatch = !searchQuery || 
      o._id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (o.items[0].product_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const statusMatch = statusFilter === 'all' || (o.status || 'pending') === statusFilter;
    const priorityMatch = priorityFilter === 'all' || (o.priority || 'medium') === priorityFilter;
    
    let dateMatch = true;
    if (dateFilter !== 'all') {
      const orderDate = new Date(o.timestamp || o.created_at || Date.now());
      const now = new Date();
      if (dateFilter === 'today') {
        dateMatch = orderDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'week') {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        dateMatch = orderDate >= oneWeekAgo;
      } else if (dateFilter === 'month') {
        const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        dateMatch = orderDate >= oneMonthAgo;
      }
    }
    
    return searchMatch && statusMatch && priorityMatch && dateMatch;
  });

  const stats = {
    total: orders.length,
    activeOrders: orders.filter(o => ['pending', 'processing', 'shipped'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    totalValue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  };

  const selectedProduct = products.find(p => p.sku === selectedProductSku);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans">
      <Toaster position="top-right" />
      
      {/* --- GLASS HEADER --- */}
      <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-md border-b border-gray-900 px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
              <ShoppingBag className="w-6 h-6 text-indigo-400" />
              Welcome back, {user?.customer_name || user?.username}
            </h1>
            <p className="text-gray-400 text-xs mt-1 font-medium tracking-wide">
              PulseSync Hybrid-Push Real-Time Order Dashboard
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-900/60 px-3.5 py-1.5 rounded-full border border-gray-800">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  status === 'connected' ? 'bg-emerald-400' : status === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  status === 'connected' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
              </span>
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {status === 'connected' ? 'WS Live' : status === 'connecting' ? 'Connecting' : 'Offline'}
              </span>
            </div>

            <button
              onClick={() => {
                useAuthStore.getState().logout();
                window.location.href = '/login';
              }}
              className="px-4 py-1.5 bg-gray-900 hover:bg-rose-500/20 text-gray-300 hover:text-rose-400 text-xs font-semibold rounded-lg transition-all border border-gray-800 hover:border-rose-500/30 shadow-md"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* --- DASHBOARD LAYOUT GRID --- */}
      <div className="max-w-7xl w-full mx-auto p-6 md:p-8 flex-1 flex flex-col lg:flex-row gap-8">
        
        {/* --- MAIN DASHBOARD SECTION --- */}
        <main className="flex-1 flex flex-col gap-6">
          
          {/* 1. Statistics Cards Grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              label="Total Orders" 
              value={stats.total} 
              icon={<ShoppingBag className="w-5 h-5 text-indigo-400" />} 
              color="indigo" 
            />
            <StatCard 
              label="Active Orders" 
              value={stats.activeOrders} 
              icon={<Activity className="w-5 h-5 text-yellow-400" />} 
              color="yellow" 
            />
            <StatCard 
              label="Delivered" 
              value={stats.delivered} 
              icon={<CheckCircle className="w-5 h-5 text-emerald-400" />} 
              color="emerald" 
            />
            <StatCard 
              label="Total Spent" 
              value={`₹${(stats.totalValue || 0).toFixed(2)}`} 
              icon={<DollarSign className="w-5 h-5 text-pink-400" />} 
              color="pink" 
            />
          </section>

          {/* 2. Interactive Search & Filters Bar */}
          <section className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by product name..."
                className="w-full pl-9 pr-4 py-2 bg-gray-950/80 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <div className="relative">
                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="appearance-none bg-gray-950/80 border border-gray-800 rounded-lg pl-3 pr-8 py-2 text-xs text-gray-300 focus:ring-1 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                >
                  <option value="all">📊 All Statuses</option>
                  <option value="pending">🟡 Pending</option>
                  <option value="processing">🔵 Processing</option>
                  <option value="shipped">🚚 Shipped</option>
                  <option value="delivered">✅ Delivered</option>
                  <option value="cancelled">❌ Cancelled</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              </div>

              <div className="relative">
                <select 
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="appearance-none bg-gray-950/80 border border-gray-800 rounded-lg pl-3 pr-8 py-2 text-xs text-gray-300 focus:ring-1 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                >
                  <option value="all">⚡ All Priorities</option>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              </div>

              <div className="relative">
                <select 
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="appearance-none bg-gray-950/80 border border-gray-800 rounded-lg pl-3 pr-8 py-2 text-xs text-gray-300 focus:ring-1 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                >
                  <option value="all">📅 All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </section>

          {/* 3. View Switcher Tabs */}
          <section className="flex justify-between items-center bg-gray-900/40 p-1.5 rounded-xl border border-gray-900/80 self-start">
            <div className="flex gap-1.5 relative">
              {Object.values(ViewMode).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as ViewModeType)}
                  className={`relative px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all z-10 ${
                    viewMode === mode 
                      ? 'text-white' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {mode === 'kanban' && '🗂️ Kanban Board'}
                  {mode === 'list' && '📋 List View'}
                  {mode === 'timeline' && '⏳ Step Timeline'}
                  
                  {viewMode === mode && (
                    <motion.div 
                      layoutId="activeTabIndicator" 
                      className="absolute inset-0 bg-indigo-600 rounded-lg -z-10 shadow-lg shadow-indigo-600/30"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* 4. Display Content Area */}
          <section className="flex-1">
            {filteredOrders.length === 0 ? (
              <EmptyState status={statusFilter} />
            ) : (
              <AnimatePresence mode="popLayout">
                {/* --- KANBAN BOARD VIEW --- */}
                {viewMode === ViewMode.KANBAN && (
                  <motion.div 
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start"
                  >
                    {['pending', 'processing', 'shipped', 'delivered'].map(colStatus => {
                      const colOrders = filteredOrders.filter(o => (o.status || 'pending') === colStatus);
                      return (
                        <div 
                          key={colStatus} 
                          className="bg-gray-900/30 rounded-2xl p-4 border border-gray-900/60 flex flex-col max-h-[750px] shadow-lg"
                        >
                          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-900">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                              {getStatusIcon(colStatus)}
                              {colStatus}
                            </h3>
                            <span className="text-[10px] font-bold bg-gray-900 px-2 py-0.5 rounded-full border border-gray-800 text-gray-400">
                              {colOrders.length}
                            </span>
                          </div>

                          <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1 custom-scrollbar max-h-[600px]">
                            {colOrders.length === 0 ? (
                              <div className="text-center py-10 text-gray-600 border border-dashed border-gray-800/40 rounded-xl bg-gray-950/20 text-xs">
                                No {colStatus} orders
                              </div>
                            ) : (
                              colOrders.map(order => (
                                <OrderCard 
                                  key={order._id} 
                                  order={order} 
                                  onViewDetails={setSelectedOrder}
                                  onCancel={handleCancelOrder}
                                  getCategoryIcon={getCategoryIcon}
                                  formatDate={formatDate}
                                  daysUntil={daysUntil}
                                />
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {/* --- LIST VIEW --- */}
                {viewMode === ViewMode.LIST && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="glass-panel overflow-hidden"
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-gray-950 border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-6 py-4">Order ID</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4">Product Name</th>
                            <th className="px-6 py-4">Priority</th>
                            <th className="px-6 py-4">Price</th>
                            <th className="px-6 py-4">Ordered Date</th>
                            <th className="px-6 py-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-900 text-gray-300">
                          {filteredOrders.map(order => (
                            <tr 
                              key={order._id} 
                              onClick={() => setSelectedOrder(order)}
                              className="hover:bg-gray-900/30 transition-colors cursor-pointer"
                            >
                              <td className="px-6 py-4.5 font-mono text-indigo-400 font-medium">#{order._id.substring(0, 8)}</td>
                              <td className="px-6 py-4.5 text-base">{getCategoryIcon(order.category || 'general')}</td>
                              <td className="px-6 py-4.5 font-medium text-gray-100">{(order.items[0]?.product_name || 'Unknown Item')}</td>
                              <td className="px-6 py-4.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                  order.priority === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                  order.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {order.priority || 'medium'}
                                </span>
                              </td>
                              <td className="px-6 py-4.5 font-mono">₹{(order.total_amount || 0).toFixed(2)}</td>
                              <td className="px-6 py-4.5 text-gray-500">{formatDate(order.timestamp || order.created_at)}</td>
                              <td className="px-6 py-4.5">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase border bg-gray-950 ${
                                  order.status === 'delivered' ? 'border-emerald-500/20 text-emerald-400' :
                                  order.status === 'shipped' ? 'border-indigo-500/20 text-indigo-400' :
                                  order.status === 'processing' ? 'border-blue-500/20 text-blue-400' :
                                  order.status === 'cancelled' ? 'border-rose-500/20 text-rose-400' :
                                  'border-yellow-500/20 text-yellow-400'
                                }`}>
                                  {getStatusIcon(order.status)}
                                  {order.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {/* --- TIMELINE VIEW --- */}
                {viewMode === ViewMode.TIMELINE && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {filteredOrders.map(order => {
                      const statuses = ['pending', 'processing', 'shipped', 'delivered'];
                      const currentIdx = statuses.indexOf(order.status || 'pending');
                      return (
                        <div 
                          key={order._id} 
                          onClick={() => setSelectedOrder(order)}
                          className="glass-panel p-6 hover:border-gray-800/80 cursor-pointer transform hover:-translate-y-0.5 transition-all"
                        >
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <h3 className="font-bold text-base text-white">{(order.items[0]?.product_name || 'Unknown Item')}</h3>
                              <p className="text-xs font-mono text-indigo-400 mt-1">Order ID: #{order._id}</p>
                            </div>
                            <span className="text-lg font-mono font-bold text-gray-200">₹{(order.total_amount || 0).toFixed(2)}</span>
                          </div>

                          <div className="relative py-4">
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-900 -translate-y-1/2 rounded-full" />
                            <div 
                              className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-indigo-500 to-emerald-500 -translate-y-1/2 rounded-full transition-all duration-1000" 
                              style={{ width: `${(Math.max(0, currentIdx) / (statuses.length - 1)) * 100}%` }}
                            />

                            <div className="relative flex justify-between">
                              {statuses.map((step, idx) => {
                                const isCompleted = idx <= currentIdx;
                                const isCurrent = idx === currentIdx;
                                return (
                                  <div key={step} className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-gray-950 z-10 transition-all ${
                                      isCompleted 
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                        : 'bg-gray-900 text-gray-600'
                                    }`}>
                                      {isCompleted ? <CheckCircle className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-gray-600" />}
                                    </div>
                                    <span className={`mt-3 text-[10px] font-bold uppercase tracking-wider transition-all ${
                                      isCurrent ? 'text-indigo-400 font-semibold' : isCompleted ? 'text-gray-300' : 'text-gray-600'
                                    }`}>
                                      {step}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </section>
        </main>

        {/* --- SIDEBAR ACTIVITY FEED & QUICK ACTIONS --- */}
        <aside className="w-full lg:w-80 flex flex-col gap-6">
          
          {/* Translucent Interactive Purchase / Checkout Panel */}
          <div className="glass-panel p-5 flex flex-col">
            <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-indigo-400" />
              Place Order Catalog
            </h3>

            {loadingProducts ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Loading Inventory...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-500">
                No products found in catalog database.
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* 1. Product Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select Product</label>
                  <div className="relative">
                    <select
                      value={selectedProductSku}
                      onChange={e => setSelectedProductSku(e.target.value)}
                      className="w-full appearance-none bg-gray-950/80 border border-gray-800 rounded-lg pl-3 pr-8 py-2 text-xs text-gray-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium cursor-pointer"
                    >
                      {products.map(p => (
                        <option key={p.sku} value={p.sku}>
                          {p.name} - ₹{(p.price || 0).toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                {/* 2. Quantity Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Quantity</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOrderQuantity(q => Math.max(1, q - 1))}
                      className="px-2.5 py-1 bg-gray-900 border border-gray-800 rounded text-xs hover:bg-gray-800 font-bold active:scale-95"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={orderQuantity}
                      onChange={e => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 text-center bg-gray-950/80 border border-gray-800 rounded py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => setOrderQuantity(q => q + 1)}
                      className="px-2.5 py-1 bg-gray-900 border border-gray-800 rounded text-xs hover:bg-gray-800 font-bold active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 3. Subtotal Preview */}
                {selectedProduct && (
                  <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-900 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-bold text-gray-500 uppercase block tracking-wider">Subtotal Preview</span>
                      <span className="text-[10px] text-gray-400 italic">Snapshot Price: ₹{(selectedProduct.price || 0).toFixed(2)} ea</span>
                    </div>
                    <span className="font-mono text-base font-black text-indigo-400">
                      ₹{((selectedProduct.price || 0) * orderQuantity).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* 4. Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={isPlacingOrder}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  {isPlacingOrder ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Place Order
                    </>
                  )}
                </button>

              </div>
            )}
          </div>

          {/* Quick Sync & Info Actions */}
          <div className="glass-panel p-5">
            <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-gray-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              Quick Actions
            </h3>
            
            <div className="space-y-3">
              <button 
                onClick={() => fetchInitialOrders()}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-gray-300 py-2 px-4 rounded-lg text-xs font-semibold transition-all border border-gray-800"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Re-sync Dashboard
              </button>

              <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-900 text-[10px] text-gray-500 leading-normal">
                💡 <span className="font-semibold text-gray-400">CDC Synchronization:</span> Ordering pulls dynamically from `inventory.products` and creates standard `items` documents. Updates made by the Admin will trigger real-time color highlights and sliding toast alerts on Bob's panel instantly!
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* --- ORDER DETAILS GLASS MODAL / DRAWER --- */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-900/20">
                <div>
                  <div className="text-[10px] font-bold text-indigo-400 font-mono tracking-wider uppercase">Order Detail Overview</div>
                  <h2 className="text-lg font-bold text-white mt-1">Order ID: #{selectedOrder._id}</h2>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 p-2 rounded-full border border-gray-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1 bg-gray-950">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-900 text-center">
                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Product Category</span>
                    <div className="text-xl font-bold text-white mt-1 flex items-center justify-center gap-1.5 capitalize">
                      <span className="text-2xl">{getCategoryIcon(selectedOrder.category || 'general')}</span>
                      {selectedOrder.category || 'general'}
                    </div>
                  </div>

                  <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-900 text-center">
                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Status</span>
                    <div className="mt-1 flex items-center justify-center gap-1.5 font-bold text-sm text-gray-200 capitalize">
                      {getStatusIcon(selectedOrder.status)}
                      {selectedOrder.status}
                    </div>
                  </div>

                  <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-900 text-center font-mono">
                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Total Amount</span>
                    <div className="text-lg font-bold text-indigo-400 mt-1">₹{(selectedOrder.total_amount || 0).toFixed(2)}</div>
                  </div>
                </div>

                <div className="glass-panel p-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Cart Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <div>
                          <div className="font-semibold text-gray-100">{item.product_name}</div>
                          <div className="text-gray-500 mt-0.5">Qty: {item.quantity} @ ₹{(item.unit_price || 0).toFixed(2)}</div>
                        </div>
                        <span className="font-mono text-gray-300 font-semibold">₹{(item.subtotal || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="glass-panel p-4 text-xs space-y-1">
                    <span className="text-gray-500 font-bold uppercase tracking-wider block text-[10px] mb-1.5">Shipping Address</span>
                    <p className="text-gray-200 leading-relaxed">{selectedOrder.shipping_address || '123 Main St, New York, NY'}</p>
                    {selectedOrder.carrier && (
                      <p className="text-gray-400 mt-2 font-medium">Carrier: <span className="text-indigo-400 font-semibold">{selectedOrder.carrier}</span></p>
                    )}
                  </div>

                  <div className="glass-panel p-4 text-xs space-y-2">
                    <span className="text-gray-500 font-bold uppercase tracking-wider block text-[10px] mb-1.5">Payment details</span>
                    <div className="flex items-center gap-2 text-gray-200">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span>{selectedOrder.payment_method || 'Visa (4242)'}</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded w-max uppercase font-bold tracking-wider">
                      Paid / Authorized
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    CDC Event Sourcing Timeline Replay
                  </h3>
                  
                  {loadingHistory ? (
                    <div className="flex flex-col items-center py-6 gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Replaying Event Store...</span>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-4 text-gray-600 text-xs">No status change events logged.</div>
                  ) : (
                    <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                      {history.map((record, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="flex flex-col items-center shrink-0">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1"></div>
                            {idx !== history.length - 1 && <div className="w-0.5 h-full bg-gray-900 mt-1"></div>}
                          </div>
                          
                          <div className="flex-1 bg-gray-950 p-3 rounded-lg border border-gray-900 text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-900 border border-gray-800 uppercase tracking-wider text-gray-300">
                                {record.operation}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {new Date(record.timestamp).toLocaleString()}
                              </span>
                            </div>
                            
                            {record.operation === 'update' && record.updated_fields && (
                              <div className="mt-2 space-y-1">
                                {Object.entries(record.updated_fields).map(([k, v]) => {
                                  if (k === 'updated_at') return null;
                                  return (
                                    <div key={k} className="text-[11px] flex gap-1.5">
                                      <span className="text-gray-500 uppercase tracking-wide font-medium">{k}:</span>
                                      <span className="text-indigo-400 font-semibold uppercase">{String(v)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            
                            {record.operation === 'insert' && (
                              <div className="mt-1 text-[11px] text-gray-400 font-medium">
                                Order was placed in system. Initial status set to <span className="text-yellow-400 font-bold uppercase">PENDING</span>.
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --- STATISTIC CARD SUB-COMPONENT --- */
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'indigo' | 'yellow' | 'emerald' | 'pink';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const borderColors = {
    indigo: 'border-l-indigo-500',
    yellow: 'border-l-yellow-500',
    emerald: 'border-l-emerald-500',
    pink: 'border-l-pink-500',
  };

  return (
    <div className={`glass-panel p-4 flex items-center justify-between border-l-4 ${borderColors[color]} hover:border-gray-800 transition-all`}>
      <div>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        <div className="text-xl font-bold text-white mt-1 font-mono">{value}</div>
      </div>
      <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-900">
        {icon}
      </div>
    </div>
  );
}

/* --- EMPTY STATE SUB-COMPONENT --- */
function EmptyState({ status }: { status: string }) {
  const messages: any = {
    all: { icon: '📦', title: 'No orders found', subtitle: 'Use the catalog purchase sidebar to place your first order!' },
    pending: { icon: '🛒', title: 'No pending orders', subtitle: 'All pending orders are currently in process!' },
    processing: { icon: '⚙️', title: 'Nothing being processed', subtitle: 'Orders will appear here once confirmed!' },
    shipped: { icon: '🚚', title: 'No shipments in transit', subtitle: 'Your packages are either waiting or delivered!' },
    delivered: { icon: '✅', title: 'No delivered orders yet', subtitle: 'Delivered orders will show up here!' },
    cancelled: { icon: '❌', title: 'No cancelled orders', subtitle: 'No cancelled orders recorded!' }
  };
  
  const msg = messages[status] || messages.all;
  
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center glass-panel bg-gray-900/20 max-w-lg mx-auto border-dashed border-gray-800">
      <div className="text-5xl mb-3">{msg.icon}</div>
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">{msg.title}</h3>
      <p className="text-xs text-gray-500 leading-normal">{msg.subtitle}</p>
    </div>
  );
}

/* --- ENHANCED ORDER CARD SUB-COMPONENT --- */
interface OrderCardProps {
  order: Order;
  onViewDetails: (order: Order) => void;
  onCancel: (orderId: string) => void;
  getCategoryIcon: (category: string) => string;
  formatDate: (date: any) => string;
  daysUntil: (date: any) => number;
}

function OrderCard({ 
  order, 
  onViewDetails, 
  onCancel, 
  getCategoryIcon, 
  formatDate, 
  daysUntil 
}: OrderCardProps) {
  const [isHighlighted, setIsHighlighted] = useState(false);
  
  // Flash highlighting effect on database update
  useEffect(() => {
    setIsHighlighted(true);
    const timer = setTimeout(() => setIsHighlighted(false), 1500);
    return () => clearTimeout(timer);
  }, [order.status, order.updated_at]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isHighlighted ? 1.02 : 1
      }}
      onClick={() => onViewDetails(order)}
      className={`relative bg-gray-950/80 rounded-xl p-4.5 border-2 shadow-xl cursor-pointer select-none transition-all duration-300 ${
        isHighlighted 
          ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
          : 'border-gray-900 hover:border-gray-800/80'
      }`}
    >
      {/* 1. Header ID and Priority pill */}
      <div className="flex justify-between items-start mb-2.5">
        <div>
          <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wide">Order reference</span>
          <span className="text-[10px] font-bold text-indigo-400 font-mono">#{order._id.substring(0, 8)}</span>
        </div>
        
        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
          order.priority === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
          order.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        }`}>
          {order.priority || 'medium'}
        </span>
      </div>

      {/* 2. Product Name and Category Icon */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl shrink-0" role="img" aria-label="product category">
            {getCategoryIcon(order.category || 'general')}
          </span>
          <h4 className="text-xs font-bold text-gray-200 truncate pr-2" title={(order.items[0]?.product_name || 'Unknown Item')}>
            {(order.items[0]?.product_name || 'Unknown Item')}
          </h4>
        </div>
        <div className="flex justify-between items-center mt-1.5 text-[10px]">
          <span className="text-gray-500 font-medium">Quantity: {(order.items[0]?.quantity || 1)}</span>
          <span className="font-mono text-xs font-black text-gray-300">₹{(order.total_amount || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* 3. Dates timelines */}
      <div className="space-y-1 mb-3.5 text-[10px] text-gray-500 border-t border-gray-900 pt-2.5">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-gray-600" />
          <span>Placed: <span className="text-gray-400 font-medium">{formatDate(order.timestamp || order.created_at)}</span></span>
        </div>

        {order.estimated_delivery && (
          <div className="flex items-center gap-1.5">
            <Truck className="w-3 h-3 text-gray-600" />
            <span>
              Est: <span className="text-gray-400 font-medium">{formatDate(order.estimated_delivery)}</span>
              {daysUntil(order.estimated_delivery) > 0 && (
                <span className="ml-1 text-emerald-400 font-semibold">({daysUntil(order.estimated_delivery)}d left)</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* 4. Tracking bar for Shipped */}
      {order.status === 'shipped' && (
        <div className="mb-3.5 space-y-1">
          <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${order.delivery_progress || 60}%` }}
              transition={{ duration: 1.2 }}
            />
          </div>
          <div className="flex justify-between items-center text-[9px] text-gray-500">
            <span className="font-semibold text-indigo-400">{order.carrier || 'Carrier'}</span>
            <span className="font-medium truncate max-w-[120px]">{order.last_checkpoint || 'In transit'}</span>
          </div>
        </div>
      )}

      {/* 5. Action Buttons */}
      <div className="flex gap-2 border-t border-gray-900 pt-2.5">
        <button
          onClick={e => {
            e.stopPropagation();
            onViewDetails(order);
          }}
          className="flex-1 text-center bg-gray-900 hover:bg-gray-800 text-gray-300 py-1.5 rounded text-[10px] font-bold transition-all border border-gray-800"
        >
          View Details
        </button>

        {order.status === 'pending' && (
          <button
            onClick={e => {
              e.stopPropagation();
              onCancel(order._id);
            }}
            className="px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 py-1.5 rounded text-[10px] font-bold transition-all border border-rose-500/20"
          >
            Cancel
          </button>
        )}

        {order.status === 'delivered' && (
          <div className="flex items-center justify-center px-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
            Delivered
          </div>
        )}
      </div>

      {/* Real-time update glow indicator */}
      {isHighlighted && (
        <div className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500 border-2 border-gray-950"></span>
        </div>
      )}
    </motion.div>
  );
}
