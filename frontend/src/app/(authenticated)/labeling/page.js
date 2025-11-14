'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
  Play, 
  ChevronRight, 
  ChevronLeft, 
  Download, 
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import Button from '@/components/ui/buttons/Button';
import Card from '@/components/ui/cards/Card';
import FormField from '@/components/ui/forms/FormField';
import PatchCard from '@/components/patches/Patchcard';
import PatchLabelingModal from '@/components/patches/PatchlabelingModal';
import ImageViewer from '@/components/ui/images/Imageviewer';
import { labelingService } from '@/api/labelingService';

export default function LabelingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Configuration state
  const [numClasses, setNumClasses] = useState(3);
  const [classColors, setClassColors] = useState({
    0: '#3B82F6', // blue
    1: '#EF4444', // red
    2: '#10B981', // green
  });
  const [classNames, setClassNames] = useState({
    0: 'Klasse 0',
    1: 'Klasse 1',
    2: 'Klasse 2',
  });
  const [isConfigured, setIsConfigured] = useState(false);

  // Dataset state
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Labeling state
  const [labeledPatches, setLabeledPatches] = useState(new Set());
  const [selectedPatch, setSelectedPatch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load dataset info on mount
  useEffect(() => {
    loadDatasetInfo();
  }, []);

  const loadDatasetInfo = async () => {
    try {
      const data = await labelingService.getDatasetList();
      setDatasetInfo(data);
    } catch (err) {
      console.error('Error loading dataset:', err);
      setError('Fehler beim Laden der Dataset-Informationen');
    }
  };

  const handleStartLabeling = async () => {
    if (numClasses < 1) {
      alert('Bitte mindestens 1 Klasse definieren');
      return;
    }

    // Generate class colors and names if not set
    const colors = {};
    const names = {};
    for (let i = 0; i < numClasses; i++) {
      if (!classColors[i]) {
        colors[i] = `hsl(${(i * 360) / numClasses}, 70%, 50%)`;
      } else {
        colors[i] = classColors[i];
      }
      
      if (!classNames[i]) {
        names[i] = `Klasse ${i}`;
      } else {
        names[i] = classNames[i];
      }
    }
    setClassColors(colors);
    setClassNames(names);
    setIsConfigured(true);

    // Load first image
    await loadImage(0);
  };

  const loadImage = async (index) => {
    setLoading(true);
    setError(null);
    try {
      const data = await labelingService.loadImageByIndex(index);
      console.log('Loaded image data:', data); // Debug
      console.log('Image has base64?', !!data.image_base64); // Debug
      console.log('Patches count:', data.patches?.length); // Debug
      setImageData(data);
      setCurrentIndex(index);
      setLabeledPatches(new Set()); // Reset labeled patches for new image
    } catch (err) {
      console.error('Error loading image:', err);
      setError(`Fehler beim Laden des Bildes (Index ${index})`);
    } finally {
      setLoading(false);
    }
  };

  const handlePatchSelect = (patch) => {
    setSelectedPatch(patch);
    setIsModalOpen(true);
  };

  const handleSavePatch = async (patchWithAnnotations) => {
    try {
      setLoading(true);

      const data = {
        image_file: imageData.file_name,
        patch_file: patchWithAnnotations.patch_file,
        px: patchWithAnnotations.px,
        py: patchWithAnnotations.py,
        annotations: patchWithAnnotations.annotations,
        patch_image_base64: patchWithAnnotations.patch_image_base64,
      };

      await labelingService.savePatchAnnotation(data);

      // Mark patch as labeled
      setLabeledPatches(new Set([...labeledPatches, patchWithAnnotations.patch_file]));
      setIsModalOpen(false);
      setSelectedPatch(null);
    } catch (err) {
      console.error('Error saving patch:', err);
      alert('Fehler beim Speichern der Annotation');
    } finally {
      setLoading(false);
    }
  };

  const handleNextImage = async () => {
    if (!datasetInfo || currentIndex >= datasetInfo.total - 1) {
      alert('Keine weiteren Bilder verfügbar');
      return;
    }
    await loadImage(currentIndex + 1);
  };

  const handlePreviousImage = async () => {
    if (currentIndex <= 0) {
      alert('Bereits beim ersten Bild');
      return;
    }
    await loadImage(currentIndex - 1);
  };

  const handleFinalizeDataset = async () => {
    if (!confirm('Dataset abschließen und Train/Val-Split erstellen?')) {
      return;
    }

    try {
      setLoading(true);
      const result = await labelingService.finalizeDataset();
      alert(
        `Dataset erfolgreich erstellt!\n\n` +
        `Train Images: ${result.train_images}\n` +
        `Val Images: ${result.val_images}\n` +
        `Kategorien: ${Object.keys(result.categories).join(', ')}`
      );
    } catch (err) {
      console.error('Error finalizing dataset:', err);
      alert('Fehler beim Finalisieren des Datasets');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDataset = async () => {
    if (!confirm('Alle Annotationen löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) {
      return;
    }

    try {
      setLoading(true);
      await labelingService.resetDataset();
      setLabeledPatches(new Set());
      setImageData(null);
      setIsConfigured(false);
      setCurrentIndex(0);
      await loadDatasetInfo();
      alert('Dataset wurde zurückgesetzt');
    } catch (err) {
      console.error('Error resetting dataset:', err);
      alert('Fehler beim Zurücksetzen des Datasets');
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (classId, color) => {
    setClassColors({
      ...classColors,
      [classId]: color,
    });
  };

  const handleNameChange = (classId, name) => {
    setClassNames({
      ...classNames,
      [classId]: name,
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-300">Lädt...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Image Labeling</h1>
        {isConfigured && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleResetDataset}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={handleFinalizeDataset}
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-2" />
              Dataset erstellen
            </Button>
          </div>
        )}
      </div>

      {/* Configuration Section */}
      {!isConfigured && (
        <Card>
          <h2 className="mb-4 text-xl font-bold text-amber-400">
            Konfiguration
          </h2>

          {/* Info Alert */}
          <div className="p-4 mb-6 border border-blue-500 rounded-lg bg-blue-900/20">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200">
                <p className="mb-1 font-semibold">Wichtig:</p>
                <p>
                  Die Originalbilder müssen im Ordner{' '}
                  <code className="bg-slate-700 px-1 py-0.5 rounded">
                    storage/datasets/images_raw
                  </code>{' '}
                  abgelegt sein.
                </p>
                {datasetInfo && (
                  <p className="mt-2">
                    <CheckCircle2 className="inline w-4 h-4 mr-1" />
                    {datasetInfo.total} Bilder gefunden
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="space-y-4">
            <FormField
              id="numClasses"
              name="numClasses"
              label="Anzahl Klassen"
              type="number"
              min="1"
              max="10"
              value={numClasses}
              onChange={(e) => setNumClasses(parseInt(e.target.value) || 1)}
            />

            {/* Color Pickers and Names */}
            <div>
              <label className="block mb-3 text-sm font-medium text-slate-300">
                Klassenkonfiguration
              </label>
              <div className="space-y-3">
                {Array.from({ length: numClasses }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700">
                    <div className="flex items-center w-32 gap-2">
                      <span className="text-sm text-slate-400">Klasse {i}:</span>
                      <input
                        type="color"
                        value={classColors[i] || '#3B82F6'}
                        onChange={(e) => handleColorChange(i, e.target.value)}
                        className="w-10 h-8 rounded cursor-pointer"
                      />
                    </div>
                    <input
                      type="text"
                      value={classNames[i] || `Klasse ${i}`}
                      onChange={(e) => handleNameChange(i, e.target.value)}
                      placeholder={`Name für Klasse ${i}`}
                      className="flex-1 px-3 py-2 border rounded bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleStartLabeling}
              disabled={!datasetInfo || datasetInfo.total === 0}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Labeling Starten
            </Button>
          </div>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 border border-red-500 rounded-lg bg-red-900/20">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* Main Labeling Interface */}
      {isConfigured && imageData && (
        <>
          {/* Navigation */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-800 border-slate-700">
            <Button
              variant="secondary"
              onClick={handlePreviousImage}
              disabled={loading || currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Zurück
            </Button>

            <div className="text-center">
              <p className="text-sm text-slate-400">Bild</p>
              <p className="text-lg font-semibold">
                {currentIndex + 1} / {datasetInfo?.total || '?'}
              </p>
            </div>

            <Button
              variant="secondary"
              onClick={handleNextImage}
              disabled={loading || currentIndex >= (datasetInfo?.total || 0) - 1}
            >
              Weiter
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Original Image Viewer */}
          <ImageViewer imageData={imageData} />

          {/* Patches Grid */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-amber-400">
                Patches ({labeledPatches.size} / {imageData.patches?.length || 0} gelabelt)
              </h2>
              <div className="text-sm text-slate-400">
                Klicke auf einen Patch zum Labeln
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-400">Lädt Patches...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {imageData.patches?.map((patch) => (
                  <PatchCard
                    key={patch.patch_file}
                    patch={patch}
                    onSelect={handlePatchSelect}
                    isLabeled={labeledPatches.has(patch.patch_file)}
                  />
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Labeling Modal */}
      <PatchLabelingModal
        patch={selectedPatch}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPatch(null);
        }}
        onSave={handleSavePatch}
        classColors={classColors}
        classNames={classNames}
      />
    </div>
  );
}