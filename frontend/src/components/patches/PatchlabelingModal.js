'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import Button from '@/components/ui/buttons/Button';

export default function PatchLabelingModal({ patch, isOpen, onClose, onSave, classColors, classNames = {} }) {
  const [annotations, setAnnotations] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentRect, setCurrentRect] = useState(null);
  const [selectedClass, setSelectedClass] = useState(0);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // Reset state when modal opens with new patch
  useEffect(() => {
    if (isOpen && patch) {
      setAnnotations([]);
      setCurrentRect(null);
      setStartPoint(null);
      setIsDrawing(false);
    }
  }, [isOpen, patch]);

  // Draw annotations on canvas
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    if (img.complete) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    // Draw existing annotations
    annotations.forEach((ann, idx) => {
      const color = classColors[ann.class] || '#3B82F6';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(ann.bbox[0], ann.bbox[1], ann.bbox[2], ann.bbox[3]);

      // Draw label
      const className = classNames[ann.class] || `Klasse ${ann.class}`;
      ctx.fillStyle = color;
      const labelWidth = ctx.measureText(className).width + 10;
      ctx.fillRect(ann.bbox[0], ann.bbox[1] - 20, Math.max(labelWidth, 80), 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.fillText(className, ann.bbox[0] + 5, ann.bbox[1] - 5);
    });

    // Draw current rectangle being drawn
    if (currentRect) {
      const color = classColors[selectedClass] || '#3B82F6';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.w, currentRect.h);
      ctx.setLineDash([]);
    }
  }, [annotations, currentRect, classColors, selectedClass, classNames]);

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPoint({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !startPoint) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const w = x - startPoint.x;
    const h = y - startPoint.y;

    setCurrentRect({
      x: w < 0 ? x : startPoint.x,
      y: h < 0 ? y : startPoint.y,
      w: Math.abs(w),
      h: Math.abs(h),
    });
  };

  const handleMouseUp = () => {
    if (currentRect && currentRect.w > 5 && currentRect.h > 5) {
      const newAnnotation = {
        class: selectedClass,
        bbox: [currentRect.x, currentRect.y, currentRect.w, currentRect.h],
      };
      setAnnotations([...annotations, newAnnotation]);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
  };

  const handleDeleteAnnotation = (index) => {
    setAnnotations(annotations.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (annotations.length === 0) {
      alert('Bitte mindestens eine Annotation hinzufügen!');
      return;
    }
    onSave({ ...patch, annotations });
  };

  if (!isOpen || !patch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div className="bg-slate-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-amber-400">Patch Labeling</h2>
            <p className="mt-1 text-sm text-slate-400">
              Position: ({patch.px}, {patch.py}) • {patch.patch_file}
            </p>
          </div>
          <button
            onClick={onClose}
            className="transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Canvas Area */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-4 mb-4">
                <label className="text-sm font-medium text-slate-300">
                  Klasse auswählen:
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(parseInt(e.target.value))}
                  className="px-3 py-2 border rounded bg-slate-700 border-slate-600 text-slate-100"
                >
                  {Object.keys(classColors).map((cls) => (
                    <option key={cls} value={cls}>
                      {classNames[cls] || `Klasse ${cls}`}
                    </option>
                  ))}
                </select>
                <div
                  className="w-6 h-6 border-2 border-white rounded"
                  style={{ backgroundColor: classColors[selectedClass] }}
                />
              </div>

              <div className="relative overflow-hidden border rounded-lg bg-slate-900 border-slate-700">
                <img
                  ref={imageRef}
                  src={`data:image/jpeg;base64,${patch.patch_image_base64}`}
                  alt="Patch"
                  className="absolute inset-0 object-contain w-full h-full"
                  style={{ display: 'none' }}
                  onLoad={() => {
                    const canvas = canvasRef.current;
                    const img = imageRef.current;
                    if (canvas && img) {
                      canvas.width = 512;
                      canvas.height = 512;
                    }
                  }}
                />
                <canvas
                  ref={canvasRef}
                  width={512}
                  height={512}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="cursor-crosshair"
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>

              <p className="mt-2 text-sm text-slate-400">
                Klicken und ziehen um ein Bounding Rectangle zu zeichnen
              </p>
            </div>

            {/* Annotations List */}
            <div>
              <h3 className="flex items-center gap-2 mb-3 text-lg font-semibold">
                <Plus className="w-5 h-5" />
                Annotationen ({annotations.length})
              </h3>

              <div className="space-y-2 overflow-y-auto max-h-96">
                {annotations.length === 0 ? (
                  <p className="text-sm italic text-slate-500">
                    Noch keine Annotationen
                  </p>
                ) : (
                  annotations.map((ann, idx) => (
                    <div
                      key={idx}
                      className="p-3 border rounded bg-slate-700 border-slate-600"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: classColors[ann.class] }}
                            />
                            <span className="text-sm font-medium">
                              {classNames[ann.class] || `Klasse ${ann.class}`}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 space-y-0.5">
                            <p>X: {Math.round(ann.bbox[0])}px</p>
                            <p>Y: {Math.round(ann.bbox[1])}px</p>
                            <p>Breite: {Math.round(ann.bbox[2])}px</p>
                            <p>Höhe: {Math.round(ann.bbox[3])}px</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAnnotation(idx)}
                          className="text-red-400 transition-colors hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-700">
            <Button variant="secondary" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={annotations.length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Speichern
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}