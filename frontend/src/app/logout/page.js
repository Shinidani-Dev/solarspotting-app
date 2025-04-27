'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { destroyCookie } from 'nookies';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Auth-Token Cookie clientseitig löschen
    destroyCookie(null, 'auth_token', { path: '/' });

    // Nach dem Löschen auf /login weiterleiten
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-4 text-amber-400">Abmeldung...</h1>
        <p className="text-slate-300">Du wirst abgemeldet und weitergeleitet.</p>
      </div>
    </div>
  );
}
