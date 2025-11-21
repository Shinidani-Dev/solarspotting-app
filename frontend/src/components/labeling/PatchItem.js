'use client';

import { CheckCircle } from 'lucide-react';

export default function PatchItem({ patch, isLabeled, onSelect }) {
  const imgSrc = `data:image/jpeg;base64,${patch.patch_image_base64}`;

  return (
    <div
      onClick={() => onSelect(patch)}
      className={`cursor-pointer group bg-slate-800/40 hover:bg-slate-800/70 
                 border-2 rounded-xl overflow-hidden shadow-md transition-all duration-200
                 ${isLabeled 
                   ? 'border-emerald-500 ring-2 ring-emerald-500/30' 
                   : 'border-slate-700 hover:border-amber-400'
                 }`}
    >
      <div className="relative">
        {/* Thumbnail */}
        <img
          src={imgSrc}
          alt="Patch"
          className="object-cover w-full h-40"
        />

        {/* Green check mark and overlay */}
        {isLabeled && (
          <>
            <div className="absolute inset-0 pointer-events-none bg-emerald-500/10" />
            <div className="absolute p-1 rounded-full top-2 right-2 bg-emerald-500">
              <CheckCircle size={20} className="text-white" />
            </div>
          </>
        )}
      </div>

      {/* Meta */}
      <div className={`p-3 text-sm ${isLabeled ? 'bg-emerald-900/20' : ''}`}>
        <p className="font-semibold truncate text-slate-200">{patch.patch_file}</p>
        <p className="text-xs text-slate-400">
          px: <span className="text-slate-200">{patch.px}</span>  
          {' – '}
          py: <span className="text-slate-200">{patch.py}</span>
        </p>
      </div>
    </div>
  );
}