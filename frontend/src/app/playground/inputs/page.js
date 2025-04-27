'use client';

import Input from '@/components/ui/Input';
import { useState } from 'react';

export default function InputsPage() {
  const [value, setValue] = useState('');
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Eingabefelder</h1>
      <p className="text-slate-300 mb-8">Formular-Elemente für verschiedene Eingabetypen.</p>
      
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Text-Eingabe</h2>
        <div className="max-w-md">
          <Input 
            label="Benutzername" 
            id="username" 
            placeholder="Gib deinen Benutzernamen ein" 
            helperText="Dein eindeutiger Benutzername zur Anmeldung."
          />
          
          <Input 
            label="E-Mail-Adresse" 
            id="email" 
            type="email" 
            placeholder="name@beispiel.de" 
          />
          
          <Input 
            label="Passwort" 
            id="password" 
            type="password" 
            placeholder="••••••••" 
          />
          
          <Input 
            label="Mit Fehlermeldung" 
            id="error-field" 
            value="ungültige Eingabe" 
            error="Dieses Feld enthält einen Fehler"
          />
        </div>
        
        <div className="mt-6 bg-slate-700 p-4 rounded-md">
          <pre className="text-sm text-slate-300 whitespace-pre-wrap">
{`<Input 
  label="Benutzername" 
  id="username" 
  placeholder="Gib deinen Benutzernamen ein" 
  helperText="Dein eindeutiger Benutzername zur Anmeldung."
/>

<Input 
  label="Mit Fehlermeldung" 
  id="error-field" 
  value="ungültige Eingabe" 
  error="Dieses Feld enthält einen Fehler"
/>`}
          </pre>
        </div>
      </div>
      
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Interaktives Beispiel</h2>
        <div className="max-w-md">
          <Input 
            label="Live-Eingabe" 
            id="live-input" 
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Gib etwas ein..." 
          />
          
          {value && (
            <div className="mt-4 p-3 bg-slate-700 rounded border border-slate-600">
              <p className="text-amber-400 text-sm">Eingabewert:</p>
              <p className="text-white">{value}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}