import { create } from 'zustand';

export interface CDCEvent {
  _id?: string;
  event_id: string;
  timestamp: string;
  operation: 'insert' | 'update' | 'delete' | 'replace';
  document_id: string;
  collection: string;
  full_document?: any;
  updated_fields?: any;
  removed_fields?: string[];
  // Admin action extras
  event_type?: string;
  admin_email?: string;
  admin_username?: string;
  summary?: string;
  customer_name?: string;
}

export interface AdminNotification {
  id: string;
  timestamp: string;
  admin_email: string;
  admin_username: string;
  summary: string;
  order_id: string;
  new_status: string;
  read: boolean;
}

interface AppState {
  events: CDCEvent[];
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  filters: Record<string, string>;
  mode: 'websocket' | 'sse';
  adminNotifications: AdminNotification[];
  setConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected') => void;
  addEvent: (event: CDCEvent) => void;
  clearEvents: () => void;
  setFilter: (key: string, value: string) => void;
  removeFilter: (key: string) => void;
  setMode: (mode: 'websocket' | 'sse') => void;
  addAdminNotification: (n: AdminNotification) => void;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
  events: [],
  connectionStatus: 'disconnected',
  filters: {},
  mode: 'websocket',
  adminNotifications: localStorage.getItem('admin_notifications')
    ? (() => {
        try {
          return JSON.parse(localStorage.getItem('admin_notifications')!) || [];
        } catch (e) {
          return [];
        }
      })()
    : [],
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  addEvent: (event) => set((state) => ({ events: [event, ...state.events].slice(0, 100) })),
  clearEvents: () => set({ events: [] }),
  setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } })),
  removeFilter: (key) => set((state) => {
    const newFilters = { ...state.filters };
    delete newFilters[key];
    return { filters: newFilters };
  }),
  setMode: (mode) => set({ mode }),
  addAdminNotification: (n) => set((state) => {
    const updated = [n, ...state.adminNotifications].slice(0, 50);
    try { localStorage.setItem('admin_notifications', JSON.stringify(updated)); } catch (e) {}
    return { adminNotifications: updated };
  }),
  markAllRead: () => set((state) => {
    const updated = state.adminNotifications.map(n => ({ ...n, read: true }));
    try { localStorage.setItem('admin_notifications', JSON.stringify(updated)); } catch (e) {}
    return { adminNotifications: updated };
  }),
  dismissNotification: (id) => set((state) => {
    const updated = state.adminNotifications.filter(n => n.id !== id);
    try { localStorage.setItem('admin_notifications', JSON.stringify(updated)); } catch (e) {}
    return { adminNotifications: updated };
  }),
}));
