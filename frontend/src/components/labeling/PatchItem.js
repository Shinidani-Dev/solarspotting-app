'use client';

import { CheckCircle } from 'lucide-react';

export default function PatchItem({ patch, isLabeled, onSelect }) {
  const imgSrc = `data:image/jpeg;base64,${patch.patch_image_base64}`;

  return (
    <div
      onClick={() => onSelect(patch)}
      className="cursor-pointer group bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700 hover:border-amber-400 
                 rounded-xl overflow-hidden shadow-md transition-all duration-200"
    >
      <div className="relative">
        {/* Thumbnail */}
        <img
          src={imgSrc}
          alt="Patch"
          className="w-full h-40 object-cover"
        />

        {/* green check mark */}
        {isLabeled && (
          <div className="absolute top-2 right-2 text-green-400">
            <CheckCircle size={22} />
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="p-3 text-sm text-slate-300">
        <p className="font-semibold truncate">{patch.patch_file}</p>
        <p className="text-slate-400 text-xs">
          px: <span className="text-slate-200">{patch.px}</span>  
          {' — '}
          py: <span className="text-slate-200">{patch.py}</span>
        </p>
      </div>
    </div>
  );
}
