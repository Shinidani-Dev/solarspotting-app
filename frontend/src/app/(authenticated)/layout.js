'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import SidepanelNavItem from '@/components/ui/SidepanelNavItem';

export default function AuthenticatedLayout({ children }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Verhindert Rendering vor Client-Hydration
  if (!mounted) {
    return null;
  }
  
  // Navigation-Items
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Instrumente', href: '/instruments', icon: '🔭' },
    { name: 'Beobachtungen', href: '/observations', icon: '☀️' },
    { name: 'Profil', href: '/profile', icon: '👤' },
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 shadow-xl overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-700">
          <h1 className="text-xl font-bold text-amber-400">SolarSpotting</h1>
          {user && (
            <p className="text-sm text-slate-400 truncate mt-1">
              {user.firstname} {user.lastname}
            </p>
          )}
        </div>
        
        <nav className="mt-6 px-3">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (SidepanelNavItem({itemName: item.name, link: item.href, icon: item.icon, isActive}));
            })}
          </ul>
        </nav>
        
        <div className="mt-auto px-3 py-4 border-t border-slate-700">
          <button
            onClick={logout}
            className="flex w-full items-center px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-amber-300 rounded-md"
          >
            <span className="mr-3">🚪</span>
            Abmelden
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto bg-slate-900">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}