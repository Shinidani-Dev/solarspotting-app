'use client';

import { useState, useRef } from 'react';
import Heading from '@/components/ui/texts/Heading';
import Card from '@/components/ui/cards/Card';
import Button from '@/components/ui/buttons/Button';
import { applyGrayscale, applyBilateral, applyMultiOtsu, applyBinarized } from '@/api/processingService';

const OPERATIONS = [
  { label: 'Grayscale',  fn: applyGrayscale  },
  { label: 'Bilateral',  fn: applyBilateral  },
  { label: 'Multi-Otsu', fn: applyMultiOtsu  },
  { label: 'Binarized',  fn: applyBinarized  },
];

export default function ImageProcessorPage() {
  const [images, setImages]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const fileInputRef          = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImages([{ url: URL.createObjectURL(file), label: 'Original', file }]);
    setError(null);
  };

  const applyOperation = async ({ label, fn }) => {
    setLoading(true);
    setError(null);
    try {
      const last = images[images.length - 1];
      const blob = last.file ?? await fetch(last.url).then((r) => r.blob());
      const result = await fn(blob);
      setImages((prev) => [...prev, { url: URL.createObjectURL(result), label, file: null }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const undo = () => {
    if (images.length <= 1) return;
    URL.revokeObjectURL(images[images.length - 1].url);
    setImages((prev) => prev.slice(0, -1));
  };

  return (
    <div>
      <Heading>Image Processor</Heading>

      <Card>
        <div className="space-y-4">

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
            {images.length > 0 && (
              <span className="text-sm text-slate-400">
                {images.length} image{images.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Operations */}
          <div className="flex flex-wrap gap-2">
            {OPERATIONS.map((op) => (
              <Button
                key={op.label}
                onClick={() => applyOperation(op)}
                disabled={images.length === 0 || loading}
              >
                {op.label}
              </Button>
            ))}
            <Button variant="danger" onClick={undo} disabled={images.length <= 1}>
              Undo
            </Button>
          </div>

          {/* Feedback */}
          {loading && <p className="text-sm text-slate-400">Processing…</p>}
          {error   && <p className="text-sm text-red-400">{error}</p>}

          {/* Image strip */}
          {images.length > 0 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <div key={i} className="flex-shrink-0 text-center space-y-1">
                  <p className="text-xs text-slate-400">{img.label}</p>
                  <img
                    src={img.url}
                    alt={img.label}
                    className="h-48 w-auto rounded border border-slate-600"
                  />
                </div>
              ))}
            </div>
          )}

        </div>
      </Card>
    </div>
  );
}
