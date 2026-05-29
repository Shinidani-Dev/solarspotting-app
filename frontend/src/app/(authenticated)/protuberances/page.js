'use client';

import { useState, useRef } from 'react';
import Heading from '@/components/ui/texts/Heading';
import Card from '@/components/ui/cards/Card';
import Button from '@/components/ui/buttons/Button';
import ImageFullscreen from '@/components/ui/images/ImageFullscreen';
import { detectCircle } from '@/api/protuberancesService';

function resizeTo4k(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width  = 4096;
      canvas.height = 4096;
      canvas.getContext('2d').drawImage(img, 0, 0, 4096, 4096);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name, { type: 'image/png' })),
        'image/png'
      );
    };
    img.src = url;
  });
}

export default function ProtuberancesPage() {
  const [originalUrl, setOriginalUrl]   = useState(null);
  const [result,      setResult]        = useState(null);   // { cx, cy, r, annotatedUrl }
  const [loading,     setLoading]       = useState(false);
  const [error,       setError]         = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const raw = e.target.files[0];
    if (!raw) return;

    // Revoke previous object URLs to avoid memory leaks
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (result?.annotatedUrl) URL.revokeObjectURL(result.annotatedUrl);

    setResult(null);
    setError(null);

    const preview = URL.createObjectURL(raw);
    setOriginalUrl(preview);

    setLoading(true);
    try {
      const resized = await resizeTo4k(raw);
      const detected = await detectCircle(resized);
      setResult(detected);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Heading>Protuberances</Heading>

      <Card>
        <div className="space-y-5">

          {/* Upload */}
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => fileInputRef.current.click()} disabled={loading}>
              Upload Solar Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleUpload}
            />
            <span className="text-xs text-slate-500">JPG or PNG, up to 4K × 4K</span>
          </div>

          {/* Feedback */}
          {loading && (
            <p className="text-sm text-slate-400">Detecting sun disk…</p>
          )}
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Center X</p>
                  <p className="text-2xl font-mono font-semibold text-amber-400">{result.cx}</p>
                  <p className="text-xs text-slate-500">px</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Center Y</p>
                  <p className="text-2xl font-mono font-semibold text-amber-400">{result.cy}</p>
                  <p className="text-xs text-slate-500">px</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Radius</p>
                  <p className="text-2xl font-mono font-semibold text-amber-400">{result.r.toFixed(1)}</p>
                  <p className="text-xs text-slate-500">px</p>
                </div>
              </div>

              {/* Images */}
              <div className="flex gap-6 overflow-x-auto pb-2">
                <div className="flex-shrink-0 w-96 space-y-1">
                  <p className="text-xs text-slate-400">Original</p>
                  <ImageFullscreen src={originalUrl} alt="Original solar image" />
                </div>
                <div className="flex-shrink-0 w-96 space-y-1">
                  <p className="text-xs text-slate-400">Detected disk</p>
                  <ImageFullscreen src={result.annotatedUrl} alt="Detected sun disk" />
                </div>
              </div>

            </div>
          )}

        </div>
      </Card>
    </div>
  );
}
