'use client';

import { useEffect, useState } from "react";
import labelingService from "@/api/labelingService";
import OriginalImageViewer from "@/components/labeling/OriginalImageViewer";
import LabelingHeader from "@/components/labeling/LabelingHeader";
import PatchList from "@/components/labeling/PatchList";
import PatchLabelModal from "@/components/labeling/PatchLabelModal";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

export default function LabelingPage({ params }) {
  const router = useRouter();
  const index = parseInt(params.index);

  const [dataset, setDataset] = useState(null);
  const [totalImages, setTotalImages] = useState(0);
  const [classes, setClasses] = useState([]);
  const [selectedPatch, setSelectedPatch] = useState(null);
  
  // Neue States für Notification und Loading
  const [isFinishing, setIsFinishing] = useState(false);
  const [labeledPatches, setLabeledPatches] = useState(new Set());
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  

  // Load classes
  useEffect(() => {
    const stored = localStorage.getItem("labeling_classes");
    if (stored) setClasses(JSON.parse(stored));
  }, []);

  // Load image
  useEffect(() => {
    async function load() {
      setIsLoadingImage(true);
      try {
        const data = await labelingService.getImageByIndex(index);
        setDataset(data);
        setTotalImages(data.total_images);
      } catch (e) {
        console.error(e);
        alert('Fehler beim Laden des Bildes: ' + (e.message || 'Unbekannter Fehler'));
      } finally {
        setIsLoadingImage(false);
      }
    }
    load();
  }, [index]);

  const goNext = () => {
    if (index + 1 < totalImages) {
      router.push(`/labeling/${index + 1}`);
    }
  };

  const goPrev = () => {
    if (index > 0) {
      router.push(`/labeling/${index - 1}`);
    }
  };

  // Handler für Patch wurde gelabelt
  const handlePatchLabeled = (patchFile) => {
    setLabeledPatches(prev => new Set([...prev, patchFile]));
  };

  // Handler für "Labeling abschließen" mit Notification
  const handleFinish = async () => {
    // Bestätigungsdialog
    const confirmed = window.confirm(
      '🎯 Labeling abschließen?\n\n' +
      'Möchten Sie das Labeling wirklich abschließen und das Dataset erstellen?\n\n' +
      'Das Dataset wird für das Training vorbereitet.'
    );

    if (!confirmed) return;

    setIsFinishing(true);

    try {
      // Dataset erstellen
      const result = await labelingService.finalize();
      
      console.log('Dataset erstellt:', result);

      // Erfolgs-Benachrichtigung
      alert(
        '✅ Dataset erfolgreich erstellt!\n\n' +
        'Das Dataset wurde gespeichert und ist nun bereit für das Training.\n\n' +
        'Sie werden zur Übersicht weitergeleitet.'
      );

      // Zurück zur Labeling-Übersicht navigieren
      router.push('/labeling');
      
    } catch (err) {
      console.error('Fehler beim Erstellen des Datasets:', err);
      
      // Fehler-Benachrichtigung
      alert(
        '❌ Fehler beim Erstellen des Datasets\n\n' +
        'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.\n\n' +
        'Fehlerdetails: ' + (err.message || 'Unbekannter Fehler')
      );
    } finally {
      setIsFinishing(false);
    }
  };

 const handlePatchDeleted = (patchFile) => {
   setDataset(prev => ({
     ...prev,
     patches: prev.patches.filter(p => p.patch_file !== patchFile)
   }));

   // Entfernt auch das "labeled" Flag falls es existierte
   setLabeledPatches(prev => {
     const updated = new Set(prev);
     updated.delete(patchFile);
     return updated;
   });
   };

  return (
    <div className="p-6 space-y-6">

      {/* Header - zeigt korrekten Status */}
      {!isLoadingImage && (
        <LabelingHeader
          currentIndex={index}
          totalImages={totalImages}
          onPrev={goPrev}
          onNext={goNext}
          onFinish={handleFinish}
        />
      )}

      {/* Loading State */}
      {isLoadingImage && (
        <div className="p-12 card">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
            <p className="text-lg text-slate-400">Lade Bild {index + 1}...</p>
          </div>
        </div>
      )}

      {/* Content - nur wenn geladen */}
      {!isLoadingImage && dataset && (
        <>
          <OriginalImageViewer data={dataset} />

          <PatchList
            patches={dataset.patches}
            labeledPatches={labeledPatches}
            onSelect={(p) => setSelectedPatch(p)}
          />

          {selectedPatch && (
            <PatchLabelModal
              patch={selectedPatch}
              classes={classes}
              onClose={() => setSelectedPatch(null)}
              onLabeled={handlePatchLabeled}
              onDeleted={handlePatchDeleted}
            />
          )}
        </>
      )}

      {/* Loading Overlay während Dataset-Erstellung */}
      {isFinishing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md p-8 text-center card">
            {/* Spinner */}
            <div className="flex justify-center mb-6">
              <Loader2 className="w-16 h-16 text-amber-500 animate-spin" />
            </div>

            {/* Titel */}
            <h3 className="mb-3 text-2xl font-bold text-amber-400">
              Dataset wird erstellt...
            </h3>

            {/* Beschreibung */}
            <p className="mb-4 text-slate-400">
              Bitte warten Sie einen Moment, während das Dataset vorbereitet wird.
            </p>

            {/* Progress Info */}
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <CheckCircle size={16} className="text-emerald-500" />
              <span>Annotationen werden verarbeitet</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}