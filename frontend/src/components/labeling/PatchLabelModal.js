'use client';

import { useState } from 'react';
import { X, Save, Trash2, Grid as GridIcon, EyeOff as GridOffIcon } from 'lucide-react';
import BoundingBoxCanvas from '@/components/labeling/BoundingBoxCanvas';
import labelingService from '@/api/labelingService';

export default function PatchLabelModal({
  patch,
  classes,
  onClose,
  onLabeled
}) {
  const [showGrid, setShowGrid] = useState(true);

  // Bounding boxes: { class: 'Umbra', bbox: [x, y, w, h] }
  const [boxes, setBoxes] = useState([]);

  if (!patch) return null;

  const imgSrc = patch.patch_image_base64
    ? `data:image/jpeg;base64,${patch.patch_image_base64}`
    : null;

  if (!patch.patch_image_base64) {
  return (
    <div className="p-10 text-center text-red-400">
      Patch enthält kein Bild.
    </div>
  );
}


  const handleSave = async () => {
    if (boxes.length === 0) {
      alert("Keine Annotationen vorhanden.");
      return;
    }

    const payload = {
      original_image_file: patch.original_image_file,
      patch_file: patch.patch_file,
      px: patch.px,
      py: patch.py,
      annotations: boxes.map(b => ({
        class: b.class,
        bbox: b.bbox
      })),
      patch_image_base64: patch.patch_image_base64
    };

    try {
      await labelingService.saveAnnotation(payload);
      if (onLabeled) onLabeled(patch.patch_file);
      onClose();
    } catch (err) {
      console.error("Fehler beim Speichern:", err);
      alert("Fehler beim Speichern der Annotation.");
    }
  };

  const handleDelete = async () => {
    try {
      await labelingService.deleteAnnotation(patch.patch_file);
      setBoxes([]);
      onClose();
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
      alert("Fehler beim Löschen der Annotation.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center">
      <div className="bg-slate-900 rounded-xl shadow-xl p-6 w-full max-w-4xl relative">
        
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-slate-400 hover:text-amber-300"
          onClick={onClose}
        >
          <X size={26} />
        </button>

        <h2 className="text-2xl font-bold text-amber-400 mb-4">
          Patch: {patch.patch_file}
        </h2>

        {/* Buttons */}
        <div className="flex gap-3 mb-4">
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={() => setShowGrid(g => !g)}
          >
            {showGrid ? <GridOffIcon size={18} /> : <GridIcon size={18} />}
            {showGrid ? "Grid ausblenden" : "Grid einblenden"}
          </button>

          <button
            className="btn-primary flex items-center gap-2"
            onClick={handleSave}
          >
            <Save size={18} /> Speichern
          </button>

          <button
            className="btn-secondary flex items-center gap-2 text-red-400"
            onClick={handleDelete}
          >
            <Trash2 size={18} /> Löschen
          </button>
        </div>

        {/* Klasse auswählen */}
        <div className="mb-4">
          <label className="text-slate-300">Klasse auswählen:</label>
          <select
            id="classSelect"
            className="ml-3 input w-64"
            defaultValue=""
          >
            <option value="">---</option>
            {classes.map((cls, idx) => (
              <option key={idx} value={cls.name}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        {/* Canvas Section */}
        <BoundingBoxCanvas
          image={imgSrc}
          grid={patch.grid}
          showGrid={showGrid}
          boxes={boxes}
          setBoxes={setBoxes}
          classes={classes}
        />

      </div>
    </div>
  );
}
