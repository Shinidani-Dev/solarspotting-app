'use client';

import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Lädt Benutzerdaten...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Willkommen bei SolarSpotting</h1>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-lg">
            Hallo <span className="font-semibold">{user.username}</span>, 
            deine Rolle ist: <span className="font-semibold">{user.role}</span>
          </p>
          
          {user.is_labeler && (
            <p className="mt-2 text-sm">
              Du hast zusätzlich die Berechtigung als Labeler.
            </p>
          )}
        </div>
        
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Deine Benutzerinformationen:</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Voller Name: {user.firstname} {user.lastname}</li>
            <li>E-Mail: {user.email}</li>
            <li>Account aktiv: {user.active ? 'Ja' : 'Nein'}</li>
          </ul>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Diese Seite dient zum Testen der Komponenten-Interaktion. Sie zeigt, wie der Auth-Kontext 
            Benutzerdaten an verschiedene Komponenten in deiner Anwendung weitergibt.
          </p>
        </div>
      </div>
    </div>
  );
}