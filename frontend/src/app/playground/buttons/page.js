'use client';

import Button from '@/components/ui/buttons/Button';

export default function ButtonsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Buttons</h1>
      <p className="text-slate-300 mb-8">Wiederverwendbare Button-Komponenten für verschiedene Anwendungsfälle.</p>
      
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Varianten</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="danger">Danger Button</Button>
        </div>
        
        <div className="mt-6 bg-slate-700 p-4 rounded-md">
          <pre className="text-sm text-slate-300 whitespace-pre-wrap">
{`<Button variant="primary">Primary Button</Button>
<Button variant="secondary">Secondary Button</Button>
<Button variant="outline">Outline Button</Button>
<Button variant="ghost">Ghost Button</Button>
<Button variant="danger">Danger Button</Button>`}
          </pre>
        </div>
      </div>
      
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Größen</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Small Button</Button>
          <Button size="md">Medium Button</Button>
          <Button size="lg">Large Button</Button>
        </div>
        
        <div className="mt-6 bg-slate-700 p-4 rounded-md">
          <pre className="text-sm text-slate-300 whitespace-pre-wrap">
{`<Button size="sm">Small Button</Button>
<Button size="md">Medium Button</Button>
<Button size="lg">Large Button</Button>`}
          </pre>
        </div>
      </div>
      
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Status</h2>
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => alert('Button clicked!')}>Interaktiv</Button>
          <Button disabled>Deaktiviert</Button>
        </div>
        
        <div className="mt-6 bg-slate-700 p-4 rounded-md">
          <pre className="text-sm text-slate-300 whitespace-pre-wrap">
{`<Button onClick={() => alert('Button clicked!')}>Interaktiv</Button>
<Button disabled>Deaktiviert</Button>`}
          </pre>
        </div>
      </div>
    </div>
  );
}