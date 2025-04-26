'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useAuth();
  
  useEffect(() => {
    // Beim Laden der Seite ausloggen
    logout();
    // Zur Login-Seite weiterleiten
    router.push('/login');
  }, [logout, router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-4">Logging Out...</h1>
        <p>You will be logged out and redirected to the login page.</p>
      </div>
    </div>
  );
}