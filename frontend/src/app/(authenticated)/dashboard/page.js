'use client';

import LinkButton from '@/components/ui/buttons/LinkButton';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { Sun, Telescope } from 'lucide-react';
import CardWrapper from '@/components/ui/cards/CardWrapper';
import Card from '@/components/ui/cards/Card';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Verhindert Rendering vor Client-Hydration
  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-300">Not logged in!</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Welcome back!</h2>
        <div>
          <p>Hello {user.firstname} {user.lastname},</p>
          <p className="mt-2">Your role: <span className="text-amber-400">{user.role}</span></p>
          {user.is_labeler && (
            <p className="mt-1">You have additional access rights as <span className="text-amber-400">Labeler</span>.</p>
          )}
        </div>
      </div>

      <CardWrapper>
        <Card>
          <h2 className="text-lg font-semibold mb-4">Your Instruments</h2>
          <p className="text-slate-400">Manage your Observationinstruments</p>
          <LinkButton text="To the Instruments" link="/instruments" Icon={Telescope}/>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">Your Observations</h2>
          <p className="text-slate-400">Create and manage your observations</p>
          <LinkButton text="To the Observations" link="/observations" Icon={Sun}/>
        </Card>
      </CardWrapper>
    </div>
  );
}