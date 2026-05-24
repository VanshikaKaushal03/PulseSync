import React from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useAuthStore } from '../../store/authStore';
import { useRealtime } from '../../hooks/useRealtime';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-black text-white">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black text-gray-100 font-sans selection:bg-indigo-500/30">
      <Sidebar />
      <div className="flex flex-col flex-1 relative overflow-hidden">
        {/* Background ambient light */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6 z-10 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
