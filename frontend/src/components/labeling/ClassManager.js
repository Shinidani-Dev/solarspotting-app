'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '@/components/ui/buttons/Button';
import Input from '@/components/ui/Input';

export default function ClassManager({ classes, setClasses }) {
  const [newClassName, setNewClassName] = useState('');
  const [newColor, setNewColor] = useState('#ff0000');

  const addClass = () => {
    if (!newClassName.trim()) {
      alert('Please define a class name.');
      return;
    }

    // Check if class already exists
    if (classes.some(c => c.name === newClassName.trim())) {
      alert('This class already exists.');
      return;
    }

    setClasses(prev => [
      ...prev,
      { name: newClassName.trim(), color: newColor }
    ]);

    setNewClassName('');
    setNewColor('#ff0000');
  };

  const removeClass = (name) => {
    if (!confirm(`Do you really want to delete class "${name}"?`)) {
      return;
    }
    setClasses(prev => prev.filter(c => c.name !== name));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addClass();
    }
  };

  return (
    <div className="p-6 mb-6 card">
      <h2 className="mb-4 text-xl font-bold text-amber-400">
        Define Class
      </h2>

      {/* Neue Klasse hinzufügen */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <Input
            label="Classname"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="z.B. A, B, C, ..."
          />
        </div>

        <div>
          <label className="form-label">Color</label>
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-16 h-10 border-2 rounded-md cursor-pointer border-slate-600 bg-slate-800"
          />
        </div>

        <Button
          variant="primary"
          onClick={addClass}
          className="mb-4"
        >
          <Plus size={18} className="mr-2" /> 
          Add
        </Button>
      </div>

      {/* Klassentabelle */}
      <div className="space-y-3">
        {classes.map((cls, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 transition-colors border rounded-md bg-slate-800/50 border-slate-700 hover:border-slate-600"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-8 h-8 border-2 rounded-md border-slate-600"
                style={{ backgroundColor: cls.color }}
              />
              <span className="font-medium text-slate-200">{cls.name}</span>
            </div>

            <button
              onClick={() => removeClass(cls.name)}
              className="p-2 text-red-400 transition-colors rounded-md hover:text-red-300 hover:bg-red-400/10"
              title="Klasse löschen"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}

        {classes.length === 0 && (
          <p className="py-4 text-sm italic text-center text-slate-500">
            No classes defined
          </p>
        )}
      </div>
    </div>
  );
}