'use client';

import PatchItem from './PatchItem';

export default function PatchList({ patches, labeledPatches, onSelect }) {
  if (!patches || patches.length === 0) {
    return (
      <div className="card p-6 text-slate-400 text-center">
        Keine Patches für dieses Bild gefunden.
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold text-amber-400 mb-4">Patches</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {patches.map((patch, idx) => (
          <PatchItem
            key={idx}
            patch={patch}
            onSelect={onSelect}
            isLabeled={labeledPatches?.has(patch.patch_file)}
          />
        ))}
      </div>
    </div>
  );
}
