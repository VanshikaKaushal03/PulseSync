import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const WS_URL = 'ws://localhost:8000/ws';
const SSE_URL = 'http://localhost:8000/sse';

export function useRealtime() {
  const { mode, filters, setConnectionStatus, addEvent, addAdminNotification } = useStore();
  const { token, user } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Re-connect when mode or filters change
  useEffect(() => {
    if (!token || !user) return;

    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }

    setConnectionStatus('connecting');

    const randomSuffix = Math.random().toString(36).substring(7);
    const safeName = user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const clientId = `${user.role}-${safeName}-${randomSuffix}`;

    const handleMessage = (raw: string) => {
      try {
        const data = JSON.parse(raw);
        addEvent(data);

        // ── Admin action notification ───────────────────────────────────────
        if (data.event_type === 'admin_action') {
          // Only notify if it was done by a DIFFERENT admin (not ourselves)
          if (data.admin_email !== user.email) {
            const notification = {
              id: data.event_id || `n_${Date.now()}`,
              timestamp: data.timestamp,
              admin_email: data.admin_email,
              admin_username: data.admin_username,
              summary: data.summary || `${data.admin_username} updated an order`,
              order_id: data.document_id,
              new_status: data.updated_fields?.status || '',
              read: false,
            };
            addAdminNotification(notification);

            // Simple fallback toast for visibility
            toast(
              `🔔 ${data.admin_username}: ${data.summary}`,
              {
                duration: 6000,
                position: 'top-right',
                style: {
                  background: '#1a1a2e',
                  color: '#e2e8f0',
                  border: '1px solid #4f46e5',
                  borderRadius: '12px',
                  fontSize: '13px',
                  maxWidth: '400px',
                },
                icon: '👤',
              }
            );
          }
          return; // Don't also trigger the standard order-update toast
        }

        // ── Standard order update toast ────────────────────────────────────
        if (data.operation === 'update' && data.updated_fields?.status) {
          toast.success(
            `Order ${data.document_id?.substring(0, 8)}: ${data.updated_fields.status.toUpperCase()}!`,
            {
              duration: 5000,
              position: 'top-right',
              style: { background: '#1e1e1e', color: '#fff', border: '1px solid #333' }
            }
          );
        }
      } catch (e) {
        console.error('Failed to parse message', e);
      }
    };

    if (mode === 'websocket') {
      const ws = new WebSocket(`${WS_URL}/${clientId}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        ws.send(JSON.stringify({ filters }));
      };
      ws.onmessage = (event) => handleMessage(event.data);
      ws.onclose = () => setConnectionStatus('disconnected');
      ws.onerror = () => setConnectionStatus('disconnected');

    } else if (mode === 'sse') {
      const queryParams = new URLSearchParams(filters).toString();
      const sse = new EventSource(`${SSE_URL}/${clientId}?${queryParams}`);
      sseRef.current = sse;

      sse.onopen = () => setConnectionStatus('connected');
      sse.onmessage = (event) => handleMessage(event.data);
      sse.onerror = () => {
        setConnectionStatus('disconnected');
        sse.close();
      };
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (sseRef.current) sseRef.current.close();
    };
  }, [mode, filters, setConnectionStatus, addEvent, addAdminNotification]);
}
