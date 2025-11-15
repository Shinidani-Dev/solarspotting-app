'use client';

import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

export default function LabelingHeader({
  currentIndex,
  totalImages,
  onPrev,
  onNext,
  onFinish
}) {
  return (
    <div className="card p-6 flex items-center justify-between mb-6">

      <div>
        <h1 className="text-2xl font-bold text-amber-400">
          SolarSpotting Labeling
        </h1>
        <p className="text-slate-400">
          Bild {currentIndex + 1} / {totalImages}
        </p>
        <p className="text-slate-500 text-sm mt-1">
          Quelle: <span className="text-slate-300">storage/datasets/images_raw</span>
        </p>
      </div>

      <div className="flex gap-3">
        <button className="btn-secondary flex items-center gap-2" onClick={onPrev}>
          <ArrowLeft size={18} /> Zurück
        </button>

        <button className="btn-secondary flex items-center gap-2" onClick={onNext}>
          Weiter <ArrowRight size={18} />
        </button>

        <button className="btn-primary flex items-center gap-2" onClick={onFinish}>
          <CheckCircle size={20} />
          Labeling abschließen
        </button>
      </div>

    </div>
  );
}
