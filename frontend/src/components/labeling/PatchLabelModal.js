'use client';

import { useState } from 'react';
import { X, Save, Trash2, Grid as GridIcon, EyeOff as GridOffIcon } from 'lucide-react';
import BoundingBoxCanvas from '@/components/labeling/BoundingBoxCanvas';
import labelingService from '@/api/labelingService';
import Button from '@/components/ui/buttons/Button';

export default function PatchLabelModal({
  patch,
  classes,
  onClose,
  onLabeled,
  onDeleted
}) {
  const [showGrid, setShowGrid] = useState(true);

  // Bounding boxes: { class: 'A', bbox: [x, y, w, h] }
  const [boxes, setBoxes] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");


  if (!patch) return null;

  const imgSrc = patch.patch_image_base64
    ? `data:image/jpeg;base64,${patch.patch_image_base64}`
    : null;

  if (!patch.patch_image_base64) {
  return (
    <div className="p-10 text-center text-red-400">
      No image in Patch.
    </div>
  );
}


  const handleSave = async () => {
    if (boxes.length === 0) {
      alert("No Annotations found.");
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
      console.error("Error on saving:", err);
      alert("Error on saving the annotation");
    }
  };

  const handleDelete = async () => {
    if (!confirm('Do you really want to delete the annotation?')) {
      return;
    }
    
    try {
      await labelingService.deleteAnnotation(patch.patch_file);
      onDeleted && onDeleted(patch.patch_file);
      setBoxes([]);
      onClose();
    } catch (err) {
      console.error("Error on deleting:", err);

    if (err?.response?.status === 404) {
     // Patch existiert nicht mehr → sicher im Frontend entfernen
     onDeleted && onDeleted(patch.patch_file);
     setBoxes([]);
     onClose();
     return;
   }

      alert("Error on deleting the annotation");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-slate-900 rounded-xl shadow-xl p-6 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          className="absolute transition-colors top-4 right-4 text-slate-400 hover:text-amber-300"
          onClick={onClose}
        >
          <X size={26} />
        </button>

        <h2 className="mb-4 text-2xl font-bold text-amber-400">
          Patch: {patch.patch_file}
        </h2>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 mb-4">
          <Button
            variant="secondary"
            onClick={() => setShowGrid(g => !g)}
          >
            {showGrid ? <GridOffIcon size={18} className="mr-2" /> : <GridIcon size={18} className="mr-2" />}
            {showGrid ? "Hide grid" : "Display grid"}
          </Button>

          <Button
            variant="primary"
            onClick={handleSave}
          >
            <Save size={18} className="mr-2" /> 
            Save
          </Button>

          <Button
            variant="danger"
            onClick={handleDelete}
          >
            <Trash2 size={18} className="mr-2" /> 
            Delete
          </Button>
        </div>

        {/* Klasse auswählen */}
        <div className="mb-4">
          <label className="form-label">Select class:</label>
          <select
            id="classSelect"
            className="w-64 form-input"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">--- Please Select ---</option>
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
            selectedClass={selectedClass}
          />

      </div>
    </div>
  );
}