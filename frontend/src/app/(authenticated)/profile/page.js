'use client';

import {useQuery} from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { userService } from '@/api/apiServices';
import Card from '@/components/ui/cards/Card';
import Heading from '@/components/ui/texts/Heading';
import LoadingIndicator from '@/components/ui/queryIndicators/LoadingIndicator';
import ErrorIndicator from '@/components/ui/queryIndicators/ErrorIndicator';
import { formatDate, formatDateTime } from '@/lib/helperFunctions';

export default function ProfilePage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['user'],
    queryFn: () => userService.getCurrentUser(),
  });

  if (isPending) {
    return <LoadingIndicator />;
  }

  if (isError) {
    return <ErrorIndicator error={error.info?.message || "Failed to load user data"} />;
  }

  const user = data;

  if (!user) {
    return (
      <div className="p-4 border-l-4 rounded-md bg-amber-500/10 border-amber-500">
        <p className="text-amber-400">Keine Benutzerdaten verfügbar.</p>
      </div>
    );
  }

  return (
    <div>
      <Heading>Your Profile</Heading>
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Persönliche Informationen</h2>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="mb-4">
              <p className="text-sm text-slate-400">Benutzername</p>
              <p className="font-medium">{user.username}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Rolle</p>
              <p className="font-medium">
                {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                {user.is_labeler && ' (Labeler)'}
              </p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Vorname</p>
              <p className="font-medium">{user.firstname}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Nachname</p>
              <p className="font-medium">{user.lastname}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">E-Mail</p>
              <p className="font-medium">{user.email}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Geburtsdatum</p>
              <p className="font-medium">{formatDate(user.date_of_birth)}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Geschlecht</p>
              <p className="font-medium">
                {user.gender === 'male' ? 'Männlich' : 
                user.gender === 'female' ? 'Weiblich' : 'Divers'}
              </p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Unternehmen</p>
              <p className="font-medium">{user.company || 'Nicht angegeben'}</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Kontaktdaten</h2>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="mb-4">
              <p className="text-sm text-slate-400">Straße</p>
              <p className="font-medium">{user.street}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">PLZ</p>
              <p className="font-medium">{user.postal_code}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Stadt</p>
              <p className="font-medium">{user.city}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Bundesland/Kanton</p>
              <p className="font-medium">{user.state || 'Nicht angegeben'}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Land</p>
              <p className="font-medium">{user.country}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Telefon</p>
              <p className="font-medium">{user.phone || 'Nicht angegeben'}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Mobil</p>
              <p className="font-medium">{user.mobile || 'Nicht angegeben'}</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Konto Informationen</h2>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="mb-4">
              <p className="text-sm text-slate-400">Konto erstellt am</p>
              <p className="font-medium">{formatDateTime(user.tstamp)}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Status</p>
              <div className="flex items-center mt-1">
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${user.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span>{user.active ? 'Aktiv' : 'Inaktiv'}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}