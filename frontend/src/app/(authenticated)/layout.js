'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import SidepanelNavItem from '@/components/ui/SidepanelNavItem';
import { 
  House, 
  Sun, 
  Telescope, 
  UserRound, 
  DoorOpen, 
  SquareStack, 
  RectangleHorizontal, 
  ScanSearch, 
  Images, 
  Waypoints,
  Users
} from 'lucide-react';

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

  // Check if user can access labeling features (admin or labeler)
  const canAccessLabeling = user?.role === 'admin' || user?.is_labeler;
  const isAdmin = user?.role === 'admin';
  
  // Navigation-Items - Basis für alle User
  const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', Icon: House },
    { name: 'Instruments', href: '/instruments', Icon: Telescope },
    { name: 'Observations', href: '/observations', Icon: Sun },
    { name: 'Profile', href: '/profile', Icon: UserRound },
    { name: 'Processing Pipeline', href: '/classifier', Icon: SquareStack },
    { name: 'Detector', href: '/detector', Icon: ScanSearch },
  ];

  // Items nur für Labeler + Admin
  const labelerNavigation = [
    { name: 'Labeling', href: '/labeling', Icon: RectangleHorizontal },
    { name: 'Dataset', href: '/dataset', Icon: Images },
  ];

  // Items nur für Admin
  const adminNavigation = [
    { name: 'CNN-Training', href: '/cnn-training', Icon: Waypoints },
    { name: 'User Management', href: '/user-admin', Icon: Users },
  ];

  // Kombiniere Navigation basierend auf Berechtigungen
  const navigation = [
    ...baseNavigation,
    ...(canAccessLabeling ? labelerNavigation : []),
    ...(isAdmin ? adminNavigation : []),
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 overflow-y-auto border-r shadow-xl bg-slate-800 border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700">
          <h1 className="text-xl font-bold text-amber-400">SolarSpotting</h1>
          {user && (
            <div className="mt-1">
              <p className="text-sm truncate text-slate-400">
                {user.firstname} {user.lastname}
              </p>
              <div className="flex gap-1 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  user.role === 'admin' 
                    ? 'bg-purple-500/20 text-purple-400' 
                    : 'bg-slate-700 text-slate-500'
                }`}>
                  {user.role}
                </span>
                {user.is_labeler && user.role !== 'admin' && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                    labeler
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        
        <nav className="px-3 mt-6">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (SidepanelNavItem({
                key: item.href,
                itemName: item.name, 
                link: item.href, 
                Icon: item.Icon, 
                isActive
              }));
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