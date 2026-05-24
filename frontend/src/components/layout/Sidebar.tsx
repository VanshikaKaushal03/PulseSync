import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  ActivitySquare, 
  Network, 
  History, 
  Key, 
  Settings,
  Workflow
} from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { label: 'Database Sources', icon: Database, path: '/admin/sources' },
  { label: 'Live Events', icon: ActivitySquare, path: '/admin/events' },
  { label: 'Delivery & Subscriptions', icon: Network, path: '/admin/delivery' },
  { label: 'Replay Center', icon: History, path: '/admin/replay' },
];

const secondaryNavItems = [
  // Client configuration items could go here later
];

import { useAuthStore } from '../../store/authStore';

export function Sidebar() {
  const { logout } = useAuthStore();
  
  // Try to use useLocation, fallback to window.location.pathname if router not ready
  let pathname = '/';
  try {
    pathname = useLocation().pathname;
  } catch (e) {
    pathname = window.location.pathname;
  }

  return (
    <div className="w-64 border-r border-gray-800 bg-gray-950/80 backdrop-blur-xl flex flex-col z-20 shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xl tracking-tight">
          <ActivitySquare className="w-6 h-6" />
          PulseSync
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-8">
        <div>
          <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-3 px-3">Platform</div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavItem key={item.path} item={item} isActive={pathname === item.path} />
            ))}
          </nav>
        </div>
      </div>
      
      {/* Footer / Info */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/30 flex flex-col gap-3">
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-xs text-indigo-300">
          <div className="font-semibold mb-1">Production Environment</div>
          <div className="text-gray-400">v2.4.0-stable</div>
        </div>
        <button 
          onClick={() => {
            logout();
            window.location.href = '/login';
          }}
          className="flex items-center justify-center gap-2 w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

function NavItem({ item, isActive }: { item: any, isActive: boolean }) {
  return (
    <Link 
      to={item.path}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
        isActive 
          ? "bg-indigo-500/10 text-indigo-400" 
          : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
      )}
    >
      <item.icon className={cn(
        "w-4 h-4 transition-transform group-hover:scale-110",
        isActive ? "text-indigo-400" : "text-gray-500 group-hover:text-gray-300"
      )} />
      {item.label}
      {isActive && (
        <div className="ml-auto w-1 h-4 rounded-full bg-indigo-500" />
      )}
    </Link>
  );
}
