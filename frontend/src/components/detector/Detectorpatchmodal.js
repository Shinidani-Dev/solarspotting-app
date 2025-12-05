'use client';

import { useState, useEffect } from 'react';
import { X, Save, Trash2, Grid as GridIcon, EyeOff as GridOffIcon, Sparkles, Loader2 } from 'lucide-react';
import BoundingBoxCanvas from '@/components/labeling/BoundingBoxCanvas';
import { Button } from '@/components/ui/buttons/Button';
import detectorService from '@/api/detectorService';

// Class colors for visualization
const CLASS_COLORS = {
  A: "#22c55e",  // green
  B: "#3b82f6",  // blue
  C: "#eab308",  // yellow
  D: "#f97316",  // orange
  E: "#ef4444",  // red
  F: "#a855f7",  // purple
  H: "#06b6d4",  // cyan
};

export default function DetectorPatchModal({
  patch,
  onClose,
  onSaved
}) {
  const [showGrid, setShowGrid] = useState(true);
  const [boxes, setBoxes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingAnnotation, setHasExistingAnnotation] = useState(false);
  const [error, setError] = useState(null);
  
  // Controlled state für Klassen-Auswahl - wird als prop an Canvas übergeben
  const [selectedClass, setSelectedClass] = useState('');

  // Classes for dropdown
  const classes = Object.keys(CLASS_COLORS).map(name => ({
    name,
    color: CLASS_COLORS[name]
  }));

  // Load existing annotation on mount
  useEffect(() => {
    if (!patch) return;

    const loadExistingAnnotation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await detectorService.getAnnotation(patch.patch_file);

        if (result.exists && result.annotation?.annotations) {
          setBoxes(result.annotation.annotations);
          setHasExistingAnnotation(true);
        } else {
          setBoxes([]);
          setHasExistingAnnotation(false);
        }
      } catch (err) {
        // Fehler nur loggen wenn es kein 404 ist (404 wird im Service behandelt)
        setBoxes([]);
        setHasExistingAnnotation(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingAnnotation();
  }, [patch]);

  if (!patch) return null;

  const imgSrc = patch.image_base64
    ? `data:image/jpeg;base64,${patch.image_base64}`
    : null;

  if (!imgSrc) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center">
        <div className="bg-slate-900 rounded-xl p-10 text-center text-red-400">
          Patch enthält kein Bild.
          <Button variant="secondary" onClick={onClose} className="block mt-4 mx-auto">
            Schliessen
          </Button>
        </div>
      </div>
    );
  }

  // Auto-detect using ML model
  const handleDetect = async () => {
    setIsDetecting(true);
    setError(null);

    try {
      const result = await detectorService.detectOnPatch(patch.image_base64, 0.25);

      if (result.predictions && result.predictions.length > 0) {
        const detectedBoxes = result.predictions.map(pred => ({
          class: pred.class,
          bbox: pred.bbox,
          confidence: pred.confidence
        }));
        setBoxes(detectedBoxes);
      } else {
        setBoxes([]);
        setError("Keine Sonnenflecken erkannt.");
      }
    } catch (err) {
      console.error("Detection error:", err);
      setError("Fehler bei der Erkennung. Ist ein Modell trainiert?");
    } finally {
      setIsDetecting(false);
    }
  };

  // Save annotation
  const handleSave = async () => {
    if (boxes.length === 0) {
      const confirmSave = window.confirm("Keine Annotationen vorhanden. Trotzdem als 'leer' speichern?");
      if (!confirmSave) return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      original_image_file: patch.original_image_file,
      patch_file: patch.patch_file,
      px: patch.px,
      py: patch.py,
      annotations: boxes.map(b => ({
        class: b.class,
        bbox: b.bbox
      })),
      patch_image_base64: patch.image_base64
    };

    try {
      await detectorService.saveAnnotation(payload);
      if (onSaved) onSaved(patch.patch_file);
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      setError("Fehler beim Speichern der Annotation.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete annotation and patch
  const handleDelete = async () => {
    const confirmDelete = window.confirm("Patch und Annotation wirklich löschen?");
    if (!confirmDelete) return;

    try {
      await detectorService.deletePatch(patch.patch_file);
      setBoxes([]);
      if (onSaved) onSaved(patch.patch_file, true);
      onClose();
    } catch (err) {
      console.error("Delete error:", err);
      setError("Fehler beim Löschen.");
    }
  };

  // Remove a single box
  const handleRemoveBox = (index) => {
    setBoxes(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-5xl relative my-4">
        
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-slate-400 hover:text-amber-300 transition-colors"
          onClick={onClose}
        >
          <X size={28} />
        </button>

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-amber-400">
            Patch labeln
          </h2>
          <p className="text-slate-400 text-sm mt-1 truncate">
            {patch.patch_file}
          </p>
          {hasExistingAnnotation && (
            <span className="inline-block mt-2 px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
              ✓ Existierende Annotation geladen
            </span>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-amber-400" size={40} />
            <span className="ml-3 text-slate-300">Lade Annotation...</span>
          </div>
        ) : (
          <>
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Button
                variant="primary"
                onClick={handleDetect}
                disabled={isDetecting}
                className="flex items-center gap-2"
              >
                {isDetecting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
                {isDetecting ? "Erkennung läuft..." : "Auto-Detect"}
              </Button>

              <Button
                variant="secondary"
                onClick={() => setShowGrid(g => !g)}
                className="flex items-center gap-2"
              >
                {showGrid ? <GridOffIcon size={18} /> : <GridIcon size={18} />}
                {showGrid ? "Grid ausblenden" : "Grid einblenden"}
              </Button>

              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {isSaving ? "Speichern..." : "Speichern"}
              </Button>

              {hasExistingAnnotation && (
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  className="flex items-center gap-2"
                >
                  <Trash2 size={18} /> Löschen
                </Button>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Class Selection - CONTROLLED */}
            <div className="mb-4 flex items-center gap-4">
              <label className="text-slate-300 font-medium">Klasse zum Zeichnen:</label>
              <select
                className="form-input w-48"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">-- Auswählen --</option>
                {classes.map((cls) => (
                  <option key={cls.name} value={cls.name}>
                    {cls.name}
                  </option>
                ))}
              </select>
              {selectedClass && (
                <span 
                  className="w-6 h-6 rounded border-2 border-slate-600"
                  style={{ backgroundColor: CLASS_COLORS[selectedClass] }}
                />
              )}
              <span className="text-slate-500 text-sm">
                (Klicken & ziehen = neue Box | Box klicken = verschieben | Ecken = skalieren)
              </span>
            </div>

            {/* Canvas - selectedClass als PROP übergeben */}
            <div className="mb-4">
              <BoundingBoxCanvas
                image={imgSrc}
                grid={patch.grid}
                showGrid={showGrid}
                boxes={boxes}
                setBoxes={setBoxes}
                classes={classes}
                selectedClass={selectedClass}
              />
            </div>

            {/* Box List */}
            {boxes.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-slate-300 mb-2">
                  Annotationen ({boxes.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {boxes.map((box, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-800 rounded-lg p-2 border border-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: CLASS_COLORS[box.class] || "#888" }}
                        />
                        <span className="text-slate-200 font-medium">{box.class}</span>
                        {box.confidence && (
                          <span className="text-slate-500 text-xs">
                            ({(box.confidence * 100).toFixed(0)}%)
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveBox(idx)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}