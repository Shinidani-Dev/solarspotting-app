'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { setUserData } from '@/lib/auth';
import { userService } from '@/api/apiServices';

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
        const userData = await userService.getCurrentUser();
        setUserData(userData);
        router.push('/dashboard');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected Error occured!');
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
    <div className="flex items-center justify-center min-h-screen p-4 bg-slate-900">
      <div className="w-full max-w-md p-8 border rounded-lg shadow-lg bg-slate-800 border-slate-700">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-amber-400">SolarSpotting</h1>
          <p className="mt-2 text-slate-400">Log in to your account</p>
        </div>
        
        {error && (
          <div className="p-4 mb-6 border-l-4 border-red-500 rounded bg-red-900/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block mb-1 text-sm font-medium text-slate-300">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="text-white form-input bg-slate-700 border-slate-600"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="password" className="block mb-1 text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-white form-input bg-slate-700 border-slate-600"
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
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}