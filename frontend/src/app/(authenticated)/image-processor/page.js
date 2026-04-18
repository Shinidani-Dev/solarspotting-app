'use client';

import { useState, useRef } from 'react';
import Heading from '@/components/ui/texts/Heading';
import Card from '@/components/ui/cards/Card';
import Button from '@/components/ui/buttons/Button';
import ImageFullscreen from '@/components/ui/images/ImageFullscreen';
import { applyGrayscale, applyBilateral, applyMultiOtsu, applyBinarized } from '@/api/processingService';

// Convert hex (#rrggbb) → "R,G,B" string for the API
function hexToRgbStr(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ].join(',');
}

export default function ImageProcessorPage() {
  const [processedImages, setProcessedImages] = useState([]);  // { url, label, file }
  const [overlayImages,   setOverlayImages]   = useState([]);  // url | null per slot

  const [maskColors, setMaskColors] = useState(['#ff0000', '#00ff00', '#0000ff']);
  const [alpha,      setAlpha]      = useState(0.5);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProcessedImages([{ url: URL.createObjectURL(file), label: 'Original', file }]);
    setOverlayImages([null]);
    setError(null);
  };

  const applyOperation = async ({ label, kind }) => {
    setLoading(true);
    setError(null);
    try {
      const last = processedImages[processedImages.length - 1];
      const blob = last.file ?? await fetch(last.url).then((r) => r.blob());

      if (kind === 'blob') {
        const fn = label === 'Grayscale' ? applyGrayscale : applyBilateral;
        const resultBlob = await fn(blob);
        setProcessedImages((prev) => [...prev, { url: URL.createObjectURL(resultBlob), label, file: null }]);
        setOverlayImages((prev) => [...prev, null]);
      } else {
        const colors = kind === 'binarized'
          ? [hexToRgbStr(maskColors[0])]
          : maskColors.map(hexToRgbStr);
        const fn = kind === 'binarized' ? applyBinarized : applyMultiOtsu;
        const result = await fn(blob, colors, alpha);
        setProcessedImages((prev) => [...prev, { url: result.processed, label, file: null }]);
        setOverlayImages((prev) => [...prev, result.overlay]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const undo = () => {
    if (processedImages.length <= 1) return;
    const lastProcessed = processedImages[processedImages.length - 1];
    const lastOverlay   = overlayImages[overlayImages.length - 1];
    URL.revokeObjectURL(lastProcessed.url);
    if (lastOverlay) URL.revokeObjectURL(lastOverlay);
    setProcessedImages((prev) => prev.slice(0, -1));
    setOverlayImages((prev) => prev.slice(0, -1));
  };

  const OPERATIONS = [
    { label: 'Grayscale',  kind: 'blob'      },
    { label: 'Bilateral',  kind: 'blob'      },
    { label: 'Multi-Otsu', kind: 'multi-otsu'},
    { label: 'Binarized',  kind: 'binarized' },
  ];

  const hasOverlays = overlayImages.some(Boolean);

  return (
    <div>
      <Heading>Image Processor</Heading>

      <Card>
        <div className="space-y-5">

          {/* Upload */}
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => fileInputRef.current.click()}>
              Upload Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
            {processedImages.length > 0 && (
              <span className="text-sm text-slate-400">
                {processedImages.length} image{processedImages.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Color pickers + alpha */}
          <div className="flex flex-wrap items-end gap-5 p-4 border rounded-lg border-slate-700 bg-slate-900/50">
            {maskColors.map((color, i) => (
              <label key={i} className="flex flex-col gap-1 text-xs text-slate-400">
                Mask Color {i + 1}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setMaskColors((prev) => prev.map((c, j) => j === i ? e.target.value : c))}
                  className="w-10 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
              </label>
            ))}
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Overlay Alpha ({alpha.toFixed(1)})
              <input
                type="range"
                min="0" max="1" step="0.1"
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="w-28 accent-amber-400"
              />
            </label>
          </div>

          {/* Operation buttons */}
          <div className="flex flex-wrap gap-2">
            {OPERATIONS.map((op) => (
              <Button
                key={op.label}
                onClick={() => applyOperation(op)}
                disabled={processedImages.length === 0 || loading}
              >
                {op.label}
              </Button>
            ))}
            <Button variant="danger" onClick={undo} disabled={processedImages.length <= 1}>
              Undo
            </Button>
          </div>

          {/* Feedback */}
          {loading && <p className="text-sm text-slate-400">Processing…</p>}
          {error   && <p className="text-sm text-red-400">{error}</p>}

          {/* Image rows */}
          {processedImages.length > 0 && (
            <div className="space-y-4">

              {/* Row 1 — processed images */}
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Processed</p>
                <div className="flex gap-6 overflow-x-auto pb-2">
                  {processedImages.map((img, i) => (
                    <div key={i} className="flex-shrink-0 w-96 space-y-1">
                      <p className="text-xs text-slate-400">{img.label}</p>
                      <ImageFullscreen src={img.url} alt={img.label} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 2 — overlay images (only if any exist) */}
              {hasOverlays && (
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Overlay</p>
                  <div className="flex gap-6 overflow-x-auto pb-2">
                    {overlayImages.filter(Boolean).map((url, i) => (
                      <div key={i} className="flex-shrink-0 w-96">
                        <ImageFullscreen src={url} alt={`Overlay ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </Card>
    </div>
  );
}
