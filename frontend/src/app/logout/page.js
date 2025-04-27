'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { destroyCookie } from 'nookies';

export default function LogoutPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-4 text-amber-400">Abmeldung...</h1>
        <p className="text-slate-300">Du wirst abgemeldet und weitergeleitet.</p>
      </div>
    </div>
  );
}