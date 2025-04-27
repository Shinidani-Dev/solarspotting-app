'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const router = useRouter();
  const { login } = useAuth();

  // Vermeidet Hydration-Fehler
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const result = await login(username, password);
      if (result.success) {
        router.push('/');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Verhindert Rendering vor Client-Hydration
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-slate-800 rounded-lg shadow-lg p-8 w-full max-w-md border border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-amber-400">SolarSpotting</h1>
          <p className="text-slate-400 mt-2">Melde dich an, um fortzufahren</p>
        </div>
        
        {error && (
          <div className="bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1">
              Benutzername
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-md bg-amber-500 text-slate-900 hover:bg-amber-400 font-medium ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Anmeldung...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}