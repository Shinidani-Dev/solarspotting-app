'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function PlaygroundLayout({ children }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  const navigation = [
    { name: 'Übersicht', href: '/playground' },
    { name: 'Buttons', href: '/playground/buttons' },
    { name: 'Eingabefelder', href: '/playground/inputs' },
    { name: 'Benachrichtigungen', href: '/playground/notifications' },
    { name: 'Typografie', href: '/playground/typography' },
  ];

  // Vermeidet Hydration-Fehler
  useEffect(() => {
    setMounted(true);
  }, []);

  // Verhindert Rendering vor Client-Hydration
  if (!mounted) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 shadow-xl">
        <div className="px-6 py-4 border-b border-slate-700">
          <h1 className="text-xl font-bold text-amber-400">SolarSpotting UI</h1>
          <p className="text-sm text-slate-400">Komponenten-Playground</p>
        </div>
        <nav className="mt-6 px-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link 
                    href={item.href}
                    className={`block px-4 py-2 rounded-md ${
                      isActive 
                        ? 'bg-slate-700 text-amber-400' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-amber-300'
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}