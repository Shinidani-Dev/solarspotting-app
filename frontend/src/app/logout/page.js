'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { destroyCookie } from 'nookies';
import { clearUserData } from '@/lib/auth';

export default function LogoutPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    // Benutzer aus dem localStorage entfernen
    clearUserData();
    // Cookie löschen
    destroyCookie(null, 'auth_token', { path: '/' });
    // Zur Login-Seite weiterleiten
    router.push('/login');
  }, [router]);
  
  // Verhindert Rendering vor Client-Hydration
  if (!mounted) {
    return null;
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="text-center">
        <h1 className="mb-4 text-xl font-semibold text-amber-400">Abmeldung...</h1>
        <p className="text-slate-300">Du wirst abgemeldet und weitergeleitet.</p>
      </div>
    </div>
  );
}