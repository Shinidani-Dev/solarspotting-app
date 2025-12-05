'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import SidepanelNavItem from '@/components/ui/SidepanelNavItem';
import { House, Sun, Telescope, UserRound, DoorOpen, SquareStack, RectangleHorizontal, ScanSearch } from 'lucide-react';

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
    { name: 'Dashboard', href: '/dashboard', Icon: House },
    { name: 'Instruments', href: '/instruments', Icon: Telescope },
    { name: 'Observations', href: '/observations', Icon: Sun },
    { name: 'Profile', href: '/profile', Icon: UserRound },
    { name: 'Processing Pipeline', href: '/classifier', Icon: SquareStack },
    { name: 'Labeling', href: '/labeling', Icon: RectangleHorizontal },
    { name: 'Detector', href: '/detector', Icon: ScanSearch },
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 overflow-y-auto border-r shadow-xl bg-slate-800 border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700">
          <h1 className="text-xl font-bold text-amber-400">SolarSpotting</h1>
          {user && (
            <p className="mt-1 text-sm truncate text-slate-400">
              {user.firstname} {user.lastname}
            </p>
          )}
        </div>
        
        <nav className="px-3 mt-6">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (SidepanelNavItem({itemName: item.name, link: item.href, Icon: item.Icon, isActive}));
            })}
          </ul>
        </nav>
        
        <div className="px-3 py-4 mt-auto border-t border-slate-700">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2 rounded-md text-slate-300 hover:bg-slate-700 hover:text-amber-300"
          >
            <DoorOpen className="mr-3" size={18}/>
            Logout
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto bg-slate-900">
        <div className="p-6 mx-auto max-w-7xl">
          {children}
        </div>
      </div>
    </div>
  );
}