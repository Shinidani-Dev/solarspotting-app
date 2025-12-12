'use client';

import { useState, useEffect } from 'react';
import { X, Save, Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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

/**
 * DatasetPatchModal
 * 
 * Modal for editing patches in the dataset.
 * Similar to DetectorPatchModal but WITHOUT Auto-Detect and Grid.
 * Includes navigation to go through patches.
 * 
 * Props:
 * - patch: The patch data object (from listDatasetPatches)
 * - patchImageUrl: Blob URL of the patch image
 * - onClose: Function to close the modal
 * - onSaved: Callback when annotation is saved/deleted
 * - currentIndex: Current index in the list
 * - totalCount: Total number of patches
 * - onNavigate: Function to navigate (direction: -1 or 1)
 */
export default function DatasetPatchModal({
  patch,
  patchImageUrl,
  onClose,
  onSaved,
  currentIndex = 0,
  totalCount = 1,
  onNavigate
}) {
  const [boxes, setBoxes] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Controlled state für Klassen-Auswahl
  const [selectedClass, setSelectedClass] = useState('');

  // Classes for dropdown
  const classes = Object.keys(CLASS_COLORS).map(name => ({
    name,
    color: CLASS_COLORS[name]
  }));

    // Navigation
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalCount - 1;

  // Load existing annotation when patch changes
  useEffect(() => {
    if (!patch) return;

    if (patch.annotation?.annotations) {
      setBoxes(patch.annotation.annotations);
    } else {
      setBoxes([]);
    }
    setError(null);
  }, [patch]);

    useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && canGoPrev) {
        handlePrev();
      } else if (e.key === 'ArrowRight' && canGoNext) {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGoPrev, canGoNext, currentIndex]);

  if (!patch) return null;

  // Use blob URL for image
  const imgSrc = patchImageUrl;

  if (!imgSrc) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center">
        <div className="bg-slate-900 rounded-xl p-10 text-center">
          <Loader2 className="animate-spin text-amber-400 mx-auto mb-4" size={40} />
          <p className="text-slate-300">Lade Patch-Bild...</p>
        </div>
      </div>
    );
  }

  const handlePrev = () => {
    if (canGoPrev && onNavigate) {
      onNavigate(-1);
    }
  };

  const handleNext = () => {
    if (canGoNext && onNavigate) {
      onNavigate(1);
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

    try {
      // Convert blob URL to base64
      const response = await fetch(patchImageUrl);
      const blob = await response.blob();
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const payload = {
        original_image_file: patch.annotation?.original_image || 'unknown',
        patch_file: patch.filename,
        px: patch.annotation?.px || 0,
        py: patch.annotation?.py || 0,
        annotations: boxes.map(b => ({
          class: b.class,
          bbox: b.bbox
        })),
        patch_image_base64: base64
      };

      await detectorService.saveAnnotation(payload);
      if (onSaved) onSaved(patch.filename);
    } catch (err) {
      console.error("Save error:", err);
      setError("Fehler beim Speichern.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete annotation and patch
  const handleDelete = async () => {
    const confirmDelete = window.confirm("Patch und Annotation wirklich löschen?");
    if (!confirmDelete) return;

    try {
      await detectorService.deletePatch(patch.filename);
      if (onSaved) onSaved(patch.filename, true);
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

        {/* Header with Navigation */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-amber-400">
                Patch bearbeiten
              </h2>
              <p className="text-slate-400 text-sm mt-1 truncate max-w-md">
                {patch.filename}
              </p>
            </div>
            
            {/* Navigation */}
            {totalCount > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={handlePrev}
                  disabled={!canGoPrev}
                  className="p-2"
                  title="Vorheriger (←)"
                >
                  <ChevronLeft size={20} />
                </Button>
                <span className="text-slate-400 text-sm min-w-[60px] text-center">
                  {currentIndex + 1} / {totalCount}
                </span>
                <Button
                  variant="secondary"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="p-2"
                  title="Nächster (→)"
                >
                  <ChevronRight size={20} />
                </Button>
              </div>
            )}
          </div>
          
          {patch.has_annotation && (
            <span className="inline-block mt-2 px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
              {patch.annotation_count || 0} Annotationen vorhanden
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-4">
          {/* Save Button */}
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

          {/* Delete Button */}
          <Button
            variant="danger"
            onClick={handleDelete}
            className="flex items-center gap-2"
          >
            <Trash2 size={18} /> Löschen
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Class Selection */}
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
            (Pfeiltasten für Navigation)
          </span>
        </div>

        {/* Canvas */}
        <div className="mb-4">
          <BoundingBoxCanvas
            image={imgSrc}
            grid={null}
            showGrid={false}
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

        {boxes.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            Keine Annotationen vorhanden. Zeichnen Sie Bounding Boxes ein.
          </div>
        )}
      </div>
    </div>
  );
}