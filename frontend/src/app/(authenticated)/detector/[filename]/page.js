'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Grid as GridIcon,
  EyeOff as GridOffIcon,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/buttons/Button';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import detectorService from '@/api/detectorService';
import apiClient from '@/api/apiClient';
import DetectorPatchModal from '@/components/detector/Detectorpatchmodal';
import ClassInfoPanel from '@/components/ui/ClassInfoPanel';

export default function DetectorImagePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const filename = decodeURIComponent(params.filename);
  
  const canEdit = user?.role === 'admin' || user?.is_labeler;

  // ========================================
  // STATE
  // ========================================
  
  // Navigation
  const [neighbors, setNeighbors] = useState({ previous: null, next: null, current_index: 0, total: 0 });

  // Image Preview
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  
  // Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  const [showGlobalGrid, setShowGlobalGrid] = useState(false);
  
  // For Grid overlay
  const imgRef = useRef(null);
  const [renderSize, setRenderSize] = useState({ width: 0, height: 0 });

  // Patches
  const [labeledPatches, setLabeledPatches] = useState(new Set());
  const [selectedPatch, setSelectedPatch] = useState(null);

  // UI State
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {
    if (filename) {
      loadImageData();
    }
  }, [filename]);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  // Track image render size for grid overlay
  useEffect(() => {
    if (!imgRef.current) return;

    const updateSize = () => {
      if (imgRef.current) {
        setRenderSize({
          width: imgRef.current.clientWidth,
          height: imgRef.current.clientHeight,
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [previewUrl]);

  const loadImageData = async () => {
    setIsLoadingImage(true);
    setProcessedData(null);
    setLabeledPatches(new Set());
    setShowGlobalGrid(false);

    try {
      // Load neighbors for navigation
      const neighborData = await detectorService.getNeighborImages(filename);
      setNeighbors(neighborData);

      // Load image
      const response = await apiClient.get(`/labeling/image/${filename}`, {
        responseType: 'blob'
      });
      
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(response.data);
      setPreviewUrl(url);
    } catch (err) {
      setError(`Fehler beim Laden: ${err.message}`);
    } finally {
      setIsLoadingImage(false);
    }
  };

  // ========================================
  // NAVIGATION
  // ========================================

  const goToPrevious = () => {
    if (neighbors.previous) {
      router.push(`/detector/${encodeURIComponent(neighbors.previous)}`);
    }
  };

  const goToNext = () => {
    if (neighbors.next) {
      router.push(`/detector/${encodeURIComponent(neighbors.next)}`);
    }
  };

  const goBack = () => {
    router.push('/detector');
  };

  // ========================================
  // DELETE
  // ========================================

  const handleDeleteImage = async () => {
    const confirmDelete = window.confirm(`Bild "${filename}" wirklich löschen?`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await detectorService.deleteRawImage(filename);
      setSuccessMessage(`"${filename}" gelöscht`);
      
      // Navigate to next or previous or back to list
      if (neighbors.next) {
        router.push(`/detector/${encodeURIComponent(neighbors.next)}`);
      } else if (neighbors.previous) {
        router.push(`/detector/${encodeURIComponent(neighbors.previous)}`);
      } else {
        router.push('/detector');
      }
    } catch (err) {
      setError(`Fehler beim Löschen: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // ========================================
  // PROCESS IMAGE
  // ========================================

  const handleProcessImage = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await detectorService.processImage(filename);
      setProcessedData(result);
      
      // Check which patches are already labeled
      const labeled = new Set();
      for (const patch of result.patches || []) {
        try {
          const ann = await detectorService.getAnnotation(patch.patch_file);
          if (ann.exists) {
            labeled.add(patch.patch_file);
          }
        } catch {
          // Ignore
        }
      }
      setLabeledPatches(labeled);
      
      setSuccessMessage(`${result.total_patches} Patches generiert!`);
    } catch (err) {
      setError(`Verarbeitung fehlgeschlagen: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ========================================
  // PATCH MODAL CALLBACKS
  // ========================================

  const handlePatchClick = (patch) => {
    setSelectedPatch(patch);
  };

  const handlePatchSaved = (patchFile, wasDeleted = false) => {
    if (wasDeleted) {
      setLabeledPatches(prev => {
        const next = new Set(prev);
        next.delete(patchFile);
        return next;
      });
    } else {
      setLabeledPatches(prev => new Set([...prev, patchFile]));
    }
  };

  // ========================================
  // CLEAR MESSAGES
  // ========================================

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // ========================================
  // GRID DATA
  // ========================================

  const globalGrid = processedData?.global_grid;
  const originalWidth = globalGrid?.image_shape?.[1] || 2048;
  const originalHeight = globalGrid?.image_shape?.[0] || 2048;

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <ClassInfoPanel />

      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header with Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={goBack} className="flex items-center gap-2">
              <ArrowLeft size={18} />
              Zurück
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-amber-400">{filename}</h1>
              <p className="text-slate-400 text-sm">
                Bild {neighbors.current_index + 1} von {neighbors.total}
              </p>
            </div>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              onClick={goToPrevious} 
              disabled={!neighbors.previous}
              className="flex items-center gap-2"
            >
              <ChevronLeft size={18} />
              Vorheriges
            </Button>
            <Button 
              variant="secondary" 
              onClick={goToNext} 
              disabled={!neighbors.next}
              className="flex items-center gap-2"
            >
              Nächstes
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 flex items-center gap-3">
            <CheckCircle size={20} />
            {successMessage}
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 flex items-center gap-3">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Main Image Preview */}
        <div className="card">
          {isLoadingImage ? (
            <div className="h-96 flex items-center justify-center">
              <Loader2 className="animate-spin text-amber-400" size={40} />
              <span className="ml-3 text-slate-300">Lade Bild...</span>
            </div>
          ) : previewUrl ? (
            <div className="relative w-full max-w-3xl mx-auto">
              <img
                ref={imgRef}
                src={previewUrl}
                alt={filename}
                className="w-full h-auto rounded-lg border border-slate-700"
              />
              
              {/* Grid Overlay */}
              {showGlobalGrid && globalGrid && renderSize.width > 0 && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={renderSize.width}
                  height={renderSize.height}
                  style={{ zIndex: 10 }}
                >
                  <g transform={`scale(${renderSize.width / originalWidth}, ${renderSize.height / originalHeight})`}>
                    {globalGrid.lat_lines?.map((line, idx) => (
                      <polyline
                        key={`lat-${idx}`}
                        fill="none"
                        stroke="rgba(74,80,255,0.5)"
                        strokeWidth="1"
                        points={line.points.map(p => `${p.px},${p.py}`).join(' ')}
                      />
                    ))}
                    {globalGrid.lon_lines?.map((line, idx) => (
                      <polyline
                        key={`lon-${idx}`}
                        fill="none"
                        stroke="rgba(74,80,255,0.5)"
                        strokeWidth="1"
                        points={line.points.map(p => `${p.px},${p.py}`).join(' ')}
                      />
                    ))}
                  </g>
                </svg>
              )}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-slate-800 rounded-lg border border-slate-700">
              <div className="text-center">
                <ImageIcon size={48} className="mx-auto text-slate-600 mb-2" />
                <p className="text-slate-500">Bild konnte nicht geladen werden</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            <Button 
              variant="primary" 
              onClick={handleProcessImage} 
              disabled={isProcessing || isLoadingImage} 
              className="flex items-center gap-2"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              {isProcessing ? 'Verarbeite...' : 'Process Image'}
            </Button>

            <Button
              variant="secondary"
              onClick={() => setShowGlobalGrid(g => !g)}
              disabled={!processedData}
              className="flex items-center gap-2"
            >
              {showGlobalGrid ? <GridOffIcon size={18} /> : <GridIcon size={18} />}
              {showGlobalGrid ? 'Grid aus' : 'Grid ein'}
            </Button>

            {canEdit && (
              <Button 
                variant="danger" 
                onClick={handleDeleteImage} 
                disabled={isDeleting} 
                className="flex items-center gap-2 ml-auto"
              >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                Löschen
              </Button>
            )}
          </div>
        </div>

        {/* Patches Grid */}
        {processedData?.patches?.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">
              Patches ({processedData.patches.length})
              <span className="text-sm font-normal text-slate-400 ml-2">
                - {labeledPatches.size} gelabelt
              </span>
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {processedData.patches.map((patch, idx) => {
                const isLabeled = labeledPatches.has(patch.patch_file);
                
                return (
                  <button
                    key={idx}
                    onClick={() => handlePatchClick(patch)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                      isLabeled ? 'border-green-500' : 'border-slate-600 hover:border-amber-500'
                    }`}
                  >
                    <img 
                      src={`data:image/jpeg;base64,${patch.image_base64}`} 
                      alt={`Patch ${idx + 1}`} 
                      className="w-full h-auto" 
                    />
                    {isLabeled && (
                      <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                        <CheckCircle size={14} className="text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 text-xs text-slate-300">
                      x:{patch.px} y:{patch.py}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Patch Modal */}
      {selectedPatch && (
        <DetectorPatchModal
          patch={selectedPatch}
          onClose={() => setSelectedPatch(null)}
          onSaved={handlePatchSaved}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}