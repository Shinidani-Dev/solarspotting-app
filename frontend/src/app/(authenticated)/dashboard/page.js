'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-300">Lädt...</p> {/* Hier könnte später ein schöner Skeleton Loader stehen */}
      </div>
    );
  }

  if (!user) {
    // Optional: Falls User nicht existiert nach dem Laden -> redirect to login oder error anzeigen
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-300">Nicht eingeloggt.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Willkommen zurück!</h2>
        <div>
          <p>Hallo {user.firstname} {user.lastname},</p>
          <p className="mt-2">Deine Rolle: <span className="text-amber-400">{user.role}</span></p>
          {user.is_labeler && (
            <p className="mt-1">Du hast zusätzliche Rechte als Labeler.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Deine Instrumente</h2>
          <p className="text-slate-400">Verwalte deine Beobachtungsinstrumente</p>
          <Link href="/instruments" className="btn btn-primary mt-4">
            Zu den Instrumenten
          </Link>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Deine Beobachtungen</h2>
          <p className="text-slate-400">Erfasse und verwalte Sonnenbeobachtungen</p>
          <Link href="/observations" className="btn btn-primary mt-4">
            Zu den Beobachtungen
          </Link>
        </div>
      </div>
    </div>
  );
}
