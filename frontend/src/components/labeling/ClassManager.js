'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function ClassManager({ classes, setClasses }) {
  const [newClassName, setNewClassName] = useState('');
  const [newColor, setNewColor] = useState('#ff0000');

  const addClass = () => {
    if (!newClassName.trim()) return;

    setClasses(prev => [
      ...prev,
      { name: newClassName.trim(), color: newColor }
    ]);

    setNewClassName('');
  };

  const removeClass = (name) => {
    setClasses(prev => prev.filter(c => c.name !== name));
  };

  return (
    <div className="card p-6 mb-6">
      <h2 className="text-xl font-bold text-amber-400 mb-4">
        Klassen definieren
      </h2>

      {/* Neue Klasse hinzufügen */}
      <div className="flex gap-4 items-end mb-6">
        <div className="flex-1">
          <label className="text-slate-400 text-sm">Klassenname</label>
          <input
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            className="input"
            placeholder="z.B. Umbra, Penumbra, AR..."
          />
        </div>

        <div>
          <label className="text-slate-400 text-sm">Farbe</label>
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-16 h-10 rounded border border-slate-700"
          />
        </div>

        <button
          onClick={addClass}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Hinzufügen
        </button>
      </div>

      {/* Klassentabelle */}
      <div className="space-y-3">
        {classes.map((cls, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2 rounded bg-slate-800/50 border border-slate-700"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-6 h-6 rounded"
                style={{ backgroundColor: cls.color }}
              />
              <span className="text-slate-200">{cls.name}</span>
            </div>

            <button
              onClick={() => removeClass(cls.name)}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}

        {classes.length === 0 && (
          <p className="text-slate-500 text-sm italic">
            Noch keine Klassen definiert.
          </p>
        )}
      </div>
    </div>
  );
}
