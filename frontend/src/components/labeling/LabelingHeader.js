'use client';

import { ArrowLeft, ArrowRight, CheckCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/buttons/Button';

export default function LabelingHeader({
  currentIndex,
  totalImages,
  onPrev,
  onNext,
  onFinish
}) {
  const router = useRouter();

  const handleCancel = () => {
    if (confirm('Möchten Sie das Labeling wirklich abbrechen? Alle nicht gespeicherten Änderungen gehen verloren.')) {
      router.push('/labeling');
    }
  };

  return (
    <div className="flex items-center justify-between p-6 mb-6 card">

      <div>
        <h1 className="text-2xl font-bold text-amber-400">
          SolarSpotting Labeling
        </h1>
        <p className="text-slate-400">
          Bild {currentIndex + 1} / {totalImages}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Quelle: <span className="text-slate-300">storage/datasets/images_raw</span>
        </p>
      </div>

      <div className="flex gap-3">
        {/* Zurück Button - nur ab Index 1 */}
        {currentIndex > 0 && (
          <Button 
            variant="secondary" 
            onClick={onPrev}
          >
            <ArrowLeft size={18} className="mr-2" />
            Zurück
          </Button>
        )}

        {/* Weiter Button */}
        <Button 
          variant="secondary" 
          onClick={onNext}
        >
          Weiter
          <ArrowRight size={18} className="ml-2" />
        </Button>

        {/* Abbrechen Button - immer sichtbar */}
        <Button 
          variant="danger" 
          onClick={handleCancel}
        >
          <X size={18} className="mr-2" />
          Abbrechen
        </Button>

        {/* Labeling abschließen */}
        <Button 
          variant="primary" 
          onClick={onFinish}
        >
          <CheckCircle size={20} className="mr-2" />
          Labeling abschließen
        </Button>
      </div>

    </div>
  );
}