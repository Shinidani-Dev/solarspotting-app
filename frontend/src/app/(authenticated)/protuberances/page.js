'use client';

import { useState, useRef } from 'react';
import Heading from '@/components/ui/texts/Heading';
import Card from '@/components/ui/cards/Card';
import Button from '@/components/ui/buttons/Button';
import ImageFullscreen from '@/components/ui/images/ImageFullscreen';
import { computeProfile } from '@/api/protuberancesService';

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
  const [originalUrl,  setOriginalUrl]  = useState(null);
  const [result,       setResult]       = useState(null);
  const [rExtension,   setRExtension]   = useState(80);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const fileRef = useRef(null);
  const pendingFile = useRef(null);

  const handleUpload = (e) => {
    const raw = e.target.files[0];
    if (!raw) return;

    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (result?.annotatedUrl) URL.revokeObjectURL(result.annotatedUrl);
    if (result?.binarizedUrl) URL.revokeObjectURL(result.binarizedUrl);

    pendingFile.current = raw;
    setOriginalUrl(URL.createObjectURL(raw));
    setResult(null);
    setError(null);
  };

  const analyze = async () => {
    const raw = pendingFile.current;
    if (!raw) return;

    setLoading(true);
    setError(null);
    try {
      const resized = await resizeTo4k(raw);
      const data = await computeProfile(resized, rExtension);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const maxCount = result ? Math.max(...result.profile.map((p) => p.count), 1) : 1;

  return (
    <div>
      <Heading>Protuberances</Heading>

      <Card>
        <div className="space-y-5">

          {/* Controls */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Button variant="secondary" onClick={() => fileRef.current.click()} disabled={loading}>
                Upload Solar Image
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleUpload}
              />
            </div>

            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Search depth (px beyond limb)
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="20" max="300" step="10"
                  value={rExtension}
                  onChange={(e) => setRExtension(Number(e.target.value))}
                  className="w-32 accent-amber-400"
                />
                <span className="font-mono text-slate-300">{rExtension}</span>
              </div>
            </label>

            <Button
              onClick={analyze}
              disabled={!originalUrl || loading}
            >
              {loading ? 'Analyzing…' : 'Compute Profile'}
            </Button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {/* Original preview before analysis */}
          {originalUrl && !result && (
            <div className="w-96 space-y-1">
              <p className="text-xs text-slate-400">Uploaded image</p>
              <ImageFullscreen src={originalUrl} alt="Solar image" />
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6">

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Center X', value: result.cx, unit: 'px' },
                  { label: 'Center Y', value: result.cy, unit: 'px' },
                  { label: 'Radius',   value: result.r.toFixed(1), unit: 'px' },
                  { label: 'Outer R',  value: result.rOuter.toFixed(1), unit: 'px' },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-xl font-mono font-semibold text-amber-400">{value}</p>
                    <p className="text-xs text-slate-500">{unit}</p>
                  </div>
                ))}
              </div>

              {/* Images */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Images</p>
                <div className="flex gap-6 overflow-x-auto pb-2">
                  <div className="flex-shrink-0 w-96 space-y-1">
                    <p className="text-xs text-slate-400">Detected disk</p>
                    <ImageFullscreen src={result.annotatedUrl} alt="Detected disk" />
                  </div>
                  <div className="flex-shrink-0 w-96 space-y-1">
                    <p className="text-xs text-slate-400">Binarized + search annulus</p>
                    <ImageFullscreen src={result.binarizedUrl} alt="Binarized" />
                  </div>
                </div>
              </div>

              {/* Profile table */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Protuberance profile — white pixels per degree
                </p>
                <div className="overflow-auto max-h-96 rounded-lg border border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-800 text-slate-400 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-2 text-left w-24">Degree</th>
                        <th className="px-4 py-2 text-right w-24">Px count</th>
                        <th className="px-4 py-2">Bar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.profile.map(({ degree, count }) => (
                        <tr key={degree} className="border-t border-slate-800 hover:bg-slate-800/40">
                          <td className="px-4 py-1 font-mono text-slate-300">{degree}°</td>
                          <td className="px-4 py-1 font-mono text-right text-amber-400">{count}</td>
                          <td className="px-4 py-1">
                            <div
                              className="h-2 rounded-sm bg-amber-500/70"
                              style={{ width: `${(count / maxCount) * 100}%`, minWidth: count > 0 ? 2 : 0 }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      </Card>
    </div>
  );
}
