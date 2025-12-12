'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Info, X } from 'lucide-react';

/**
 * McIntosh Classification Info
 * Beschreibungen für jede Sonnenflecken-Klasse
 */
const CLASS_INFO = {
  A: {
    name: "Klasse A",
    color: "#22c55e",
    description: "Ein Einzelfleck oder eine Gruppe von Flecken, ohne Penumbra oder bipolare Struktur.",
    example: "/images/classes/a_class.png"
  },
  B: {
    name: "Klasse B", 
    color: "#3b82f6",
    description: "Gruppe von Flecken ohne Penumbra in bipolarer Anordnung.",
    example: "/images/classes/b_class.png"
  },
  C: {
    name: "Klasse C",
    color: "#eab308",
    description: "Bipolare Fleckengruppe von der der eine Hauptfleck von einer Penumbra umgeben ist.",
    example: "/images/classes/c_class.png"
  },
  D: {
    name: "Klasse D",
    color: "#f97316",
    description: "Bipolare Fleckengruppe, deren Hauptflecken eine Penumbra besitzen. Länge der Gruppe weniger als 10 Grad.",
    example: "/images/classes/d_class.png"
  },
  E: {
    name: "Klasse E",
    color: "#ef4444",
    description: "Grosse bipolare Fleckengruppe, deren beide Hauptflecken eine Penumbra besitzen. Länge der Gruppe mindestens 10 Grad.",
    example: "/images/classes/e_class.png"
  },
  F: {
    name: "Klasse F",
    color: "#a855f7",
    description: "Sehr grosse bipolare oder komplexe Sonnenfleckengruppe; Länge mindestens 15 Grad.",
    example: "/images/classes/f_class.png"
  },
  H: {
    name: "Klasse H",
    color: "#06b6d4",
    description: "Unipolarer Fleck mit Penumbra; Durchmesser > 2.5 Grad.",
    example: "/images/classes/h_class.png"
  }
};

/**
 * ClassInfoPanel
 * 
 * Ein ausklappbares Panel das Informationen zu den McIntosh-Klassen anzeigt.
 * Der Toggle-Button ist immer oben rechts sichtbar.
 */
export default function ClassInfoPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState({});

  const handleImageError = (classKey) => {
    setImageError(prev => ({ ...prev, [classKey]: true }));
  };

  return (
    <>
      {/* Toggle Button - immer sichtbar oben rechts */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-20 z-40 p-3 rounded-l-lg shadow-lg transition-all duration-300 ${
          isOpen 
            ? 'right-80 bg-amber-500 text-slate-900' 
            : 'right-0 bg-slate-700 text-amber-400 hover:bg-slate-600'
        }`}
        title={isOpen ? "Panel schliessen" : "Klassen-Info anzeigen"}
      >
        {isOpen ? (
          <ChevronRight size={24} />
        ) : (
          <div className="flex items-center gap-2">
            <ChevronLeft size={24} />
            <Info size={20} />
          </div>
        )}
      </button>

      {/* Slide-out Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-slate-800 border-l border-slate-700 shadow-2xl z-30 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-amber-400">
              McIntosh Klassifikation
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-amber-400 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Klassifikationssystem für Sonnenfleckengruppen
          </p>
        </div>

        {/* Class List */}
        <div className="p-4 space-y-4">
          {Object.entries(CLASS_INFO).map(([key, info]) => (
            <div
              key={key}
              className="bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden"
            >
              {/* Class Header */}
              <div 
                className="flex items-center gap-3 p-3 border-b border-slate-700"
                style={{ borderLeftWidth: '4px', borderLeftColor: info.color }}
              >
                <span 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: info.color }}
                >
                  {key}
                </span>
                <span className="text-slate-200 font-semibold">{info.name}</span>
              </div>

              {/* Description */}
              <div className="p-3">
                <p className="text-slate-300 text-sm leading-relaxed">
                  {info.description}
                </p>
              </div>

              {/* Example Image */}
              <div className="px-3 pb-3">
                <p className="text-slate-500 text-xs mb-2">Beispiel:</p>
                {!imageError[key] ? (
                  <img
                    src={info.example}
                    alt={`Beispiel für ${info.name}`}
                    className="w-full h-32 object-cover rounded border border-slate-700"
                    onError={() => handleImageError(key)}
                  />
                ) : (
                  <div className="w-full h-32 bg-slate-700/50 rounded border border-slate-700 flex items-center justify-center">
                    <span className="text-slate-500 text-xs">
                      Kein Beispielbild verfügbar
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4">
          <p className="text-slate-500 text-xs text-center">
            Basierend auf der McIntosh-Klassifikation (1990)
          </p>
        </div>
      </div>

      {/* Overlay when open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-20"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}