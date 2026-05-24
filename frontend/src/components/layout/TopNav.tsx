import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, User, LogOut, X, ExternalLink, CheckCheck, Clock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useStore } from '../../store';
import { Link } from '@tanstack/react-router';

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
    default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
  }
}

export function TopNav() {
  const { user, logout } = useAuthStore();
  const { connectionStatus, adminNotifications, markAllRead, dismissNotification } = useStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = adminNotifications.filter(n => !n.read).length;

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBellClick = () => {
    setShowNotifications(v => !v);
    if (!showNotifications && unreadCount > 0) {
      // Mark all as read when opening
      setTimeout(markAllRead, 1500);
    }
  };

  return (
    <header className="h-16 border-b border-gray-800 bg-gray-950/50 backdrop-blur-md flex items-center justify-between px-6 z-20">

      {/* Left: Search */}
      <div className="flex items-center flex-1">
        <div className="relative w-64 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="Search events, sources..."
            className="w-full bg-gray-900 border border-gray-800 text-sm text-gray-200 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-gray-600"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 font-mono text-[10px] font-medium text-gray-500 bg-gray-800 rounded border border-gray-700">⌘K</kbd>
          </div>
        </div>
      </div>

      {/* Right: Status, Bell, Profile */}
      <div className="flex items-center gap-4">

        {/* Connection Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900 border border-gray-800">
          <div className="relative flex h-2 w-2">
            {connectionStatus === 'connected' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </div>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{connectionStatus}</span>
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={panelRef}>
          <button
            id="notification-bell"
            onClick={handleBellClick}
            className={`relative text-gray-400 hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-gray-800 ${showNotifications ? 'bg-gray-800 text-gray-200' : ''}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-gray-950 px-0.5 animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-96 bg-gray-950 border border-gray-800 rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-white">Admin Activity</span>
                  {adminNotifications.length > 0 && (
                    <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-indigo-500/30">
                      {adminNotifications.length}
                    </span>
                  )}
                </div>
                {adminNotifications.length > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-400 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto">
                {adminNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-500 gap-2">
                    <Bell className="w-8 h-8 opacity-20" />
                    <p className="text-sm">No admin activity yet</p>
                    <p className="text-xs text-gray-600">Changes made by other admins will appear here</p>
                  </div>
                ) : (
                  adminNotifications.map(n => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-gray-800/60 hover:bg-gray-900/50 transition-colors group ${!n.read ? 'bg-indigo-500/5' : ''}`}
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 text-xs font-bold uppercase">
                        {n.admin_username?.[0] || '?'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-gray-200 leading-snug">{n.summary}</p>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-0.5" />}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {n.new_status && (
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusColor(n.new_status)}`}>
                              {n.new_status}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> {timeAgo(n.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Dismiss */}
                      <button
                        onClick={() => dismissNotification(n.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {adminNotifications.length > 0 && (
                <div className="px-4 py-2.5 border-t border-gray-800 bg-gray-900/30">
                  <Link
                    to="/admin/replay"
                    className="flex items-center justify-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View full audit log in Replay Center
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-800 mx-2" />

        {/* Profile */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-gray-200">{user?.username || 'Admin'}</div>
            <div className="text-xs text-indigo-400 capitalize">{user?.role || 'Admin'}</div>
          </div>
          <button
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors group"
            title="Log out"
          >
            <User className="w-4 h-4 group-hover:hidden" />
            <LogOut className="w-4 h-4 hidden group-hover:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
