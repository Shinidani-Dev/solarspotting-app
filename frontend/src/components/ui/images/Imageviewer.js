'use client';

import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Grid3x3 } from 'lucide-react';
import Button from '@/components/ui/buttons/Button';

export default function ImageViewer({ imageData, showGrid = true }) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [gridVisible, setGridVisible] = useState(showGrid);
  const [imageLoaded, setImageLoaded] = useState(false);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // Draw image and grid
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !imageData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    // Check if image is loaded and valid
    if (!img.complete || img.naturalWidth === 0) return;

    // Set canvas dimensions to match image
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw grid if visible
    if (gridVisible && imageData.global_grid) {
      const grid = imageData.global_grid;
      
      ctx.strokeStyle = '#F59E0B'; // amber-500
      ctx.lineWidth = 1;

      // Draw vertical lines
      if (grid.vertical_lines) {
        grid.vertical_lines.forEach((x) => {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        });
      }

      // Draw horizontal lines
      if (grid.horizontal_lines) {
        grid.horizontal_lines.forEach((y) => {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        });
      }

      // Draw center crosshair
      if (grid.center) {
        const [cx, cy] = grid.center;
        ctx.strokeStyle = '#EF4444'; // red-500
        ctx.lineWidth = 2;

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy);
        ctx.lineTo(cx + 20, cy);
        ctx.stroke();

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(cx, cy - 20);
        ctx.lineTo(cx, cy + 20);
        ctx.stroke();
      }
    }
  }, [imageData, gridVisible, imageLoaded]);

  if (!imageData) {
    return (
      <div className="p-6 border rounded-lg bg-slate-800 border-slate-700">
        <p className="text-slate-400">Kein Bild geladen</p>
      </div>
    );
  }

  // Debug: Check if image_base64 exists
  if (!imageData.image_base64) {
    return (
      <div className="p-6 border rounded-lg bg-slate-800 border-slate-700">
        <p className="text-red-400">Fehler: Bilddaten fehlen (image_base64)</p>
        <pre className="mt-2 text-xs text-slate-500">
          {JSON.stringify(Object.keys(imageData), null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border rounded-lg bg-slate-800 border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div>
          <h3 className="text-lg font-semibold text-amber-400">
            Originalbild
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {imageData.file_name}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={gridVisible ? 'primary' : 'secondary'}
            onClick={() => setGridVisible(!gridVisible)}
            className="flex items-center gap-2"
          >
            <Grid3x3 className="w-4 h-4" />
            Grid
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsZoomed(!isZoomed)}
            className="flex items-center gap-2"
          >
            {isZoomed ? (
              <>
                <ZoomOut className="w-4 h-4" />
                Verkleinern
              </>
            ) : (
              <>
                <ZoomIn className="w-4 h-4" />
                Vergrößern
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Image Display */}
      <div className="relative p-4 bg-slate-900">
        <img
          ref={imageRef}
          src={`data:image/jpeg;base64,${imageData.image_base64}`}
          alt={imageData.file_name}
          className="hidden"
          onLoad={() => setImageLoaded(true)}
        />
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className={`${isZoomed ? 'max-w-none' : 'max-w-full'} h-auto border border-slate-700 rounded`}
            style={{ 
              width: isZoomed ? 'auto' : '100%',
              maxHeight: isZoomed ? '80vh' : '500px',
              objectFit: 'contain'
            }}
          />
        </div>
      </div>

      {/* Metadata */}
      {imageData.metadata && (
        <div className="grid grid-cols-2 gap-4 p-4 text-sm border-t border-slate-700 md:grid-cols-4">
          {imageData.metadata.date && (
            <div>
              <p className="text-slate-500">Datum</p>
              <p className="font-medium text-slate-200">{imageData.metadata.date}</p>
            </div>
          )}
          {imageData.metadata.time && (
            <div>
              <p className="text-slate-500">Zeit</p>
              <p className="font-medium text-slate-200">{imageData.metadata.time}</p>
            </div>
          )}
          <div>
            <p className="text-slate-500">Auflösung</p>
            <p className="font-medium text-slate-200">
              {imageData.global_grid?.image_shape?.[1]} × {imageData.global_grid?.image_shape?.[0]}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Patches</p>
            <p className="font-medium text-slate-200">
              {imageData.patches?.length || 0}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}