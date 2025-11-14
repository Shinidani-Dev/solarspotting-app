'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

export default function PatchCard({ patch, onSelect, isLabeled = false }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className="relative overflow-hidden transition-all border rounded-lg cursor-pointer bg-slate-800 border-slate-700 hover:border-amber-500"
      onClick={() => onSelect(patch)}
    >
      {/* Patch Image */}
      <div className="relative aspect-square">
        {!imageError && patch.patch_image_base64 ? (
          <img
            src={`data:image/jpeg;base64,${patch.patch_image_base64}`}
            alt={`Patch at ${patch.px}, ${patch.py}`}
            className="object-cover w-full h-full"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-slate-700">
            <p className="px-2 text-sm text-center text-slate-400">
              {imageError ? 'Bild konnte nicht geladen werden' : 'Keine Bilddaten'}
            </p>
          </div>
        )}

        {/* Labeled Indicator */}
        {isLabeled && (
          <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1.5">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Patch Info */}
      <div className="p-3 border-t border-slate-700">
        <p className="text-xs text-slate-400">
          Position: ({patch.px}, {patch.py})
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {patch.patch_file}
        </p>
      </div>
    </div>
  );
}