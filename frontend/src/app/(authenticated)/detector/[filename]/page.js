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
  ArrowLeft,
  FlipVertical,
  FlipHorizontal,
  Save,
  RotateCcw
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
  
  // Flip/Flop State (für Preview)
  const [isFlipped, setIsFlipped] = useState(false);   // Vertical
  const [isFlopped, setIsFlopped] = useState(false);   // Horizontal
  const [isSavingTransform, setIsSavingTransform] = useState(false);
  
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
    // Reset flip/flop when loading new image
    setIsFlipped(false);
    setIsFlopped(false);

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
      setError(`Error while loading image: ${err.message}`);
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
  // FLIP/FLOP HANDLERS
  // ========================================

  const handleFlip = () => {
    setIsFlipped(prev => !prev);
  };

  const handleFlop = () => {
    setIsFlopped(prev => !prev);
  };

  const handleResetTransform = () => {
    setIsFlipped(false);
    setIsFlopped(false);
  };

  const handleSaveTransform = async () => {
    if (!isFlipped && !isFlopped) {
      setError("No transformation selected.");
      return;
    }

    const confirmSave = window.confirm(
      `Do you really want to transform the image?\n\n` +
      `${isFlipped ? 'Mirror vertically (Flip)\n' : ''}` +
      `${isFlopped ? 'Mirror horizontally (Flop)\n' : ''}\n` +
      `ATTENTION: The Original image will be owerwritten.`
    );
    
    if (!confirmSave) return;

    setIsSavingTransform(true);
    setError(null);

    try {
      await detectorService.transformImage(filename, isFlipped, isFlopped);
      setSuccessMessage('Image successfully transformed!');
      
      // Reset transform state and reload image
      setIsFlipped(false);
      setIsFlopped(false);
      
      // Reload the image to show the saved transformation
      const response = await apiClient.get(`/labeling/image/${filename}`, {
        responseType: 'blob',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(response.data);
      setPreviewUrl(url);
      
      // Clear processed data since the image changed
      setProcessedData(null);
      
    } catch (err) {
      setError(`Transformation failed: ${err.message}`);
    } finally {
      setIsSavingTransform(false);
    }
  };

  // Check if any transform is pending
  const hasTransformPending = isFlipped || isFlopped;

  // ========================================
  // DELETE
  // ========================================

  const handleDeleteImage = async () => {
    const confirmDelete = window.confirm(`Do you really want to delete image "${filename}"?`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await detectorService.deleteRawImage(filename);
      setSuccessMessage(`"${filename}" deleted`);
      
      // Navigate to next or previous or back to list
      if (neighbors.next) {
        router.push(`/detector/${encodeURIComponent(neighbors.next)}`);
      } else if (neighbors.previous) {
        router.push(`/detector/${encodeURIComponent(neighbors.previous)}`);
      } else {
        router.push('/detector');
      }
    } catch (err) {
      setError(`Error while deleting: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // ========================================
  // PROCESS IMAGE
  // ========================================

  const handleProcessImage = async () => {
    // Warn if there are unsaved transforms
    if (hasTransformPending) {
      const confirmProcess = window.confirm(
        'There are unsaved transformations.\n' +
        'Proceed anyways?\n\n' +
        'The patches will be generated based on the original image.'
      );
      if (!confirmProcess) return;
    }

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
      
      setSuccessMessage(`${result.total_patches} Patches generated!`);
    } catch (err) {
      setError(`Image processing failed: ${err.message}`);
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
  // COMPUTE TRANSFORM STYLE
  // ========================================

  const getTransformStyle = () => {
    const transforms = [];
    if (isFlipped) transforms.push('scaleY(-1)');
    if (isFlopped) transforms.push('scaleX(-1)');
    return transforms.length > 0 ? transforms.join(' ') : 'none';
  };

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
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-amber-400">{filename}</h1>
              <p className="text-slate-400 text-sm">
                Image {neighbors.current_index + 1} of {neighbors.total}
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
              Previous
            </Button>
            <Button 
              variant="secondary" 
              onClick={goToNext} 
              disabled={!neighbors.next}
              className="flex items-center gap-2"
            >
              Next
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
              <span className="ml-3 text-slate-300">Loading image...</span>
            </div>
          ) : previewUrl ? (
            <div className="relative w-full max-w-3xl mx-auto">
              {/* Transform Indicator */}
              {hasTransformPending && (
                <div className="absolute top-2 left-2 z-20 bg-amber-500/90 text-slate-900 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                  <span>Vorschau</span>
                  {isFlipped && <FlipVertical size={14} />}
                  {isFlopped && <FlipHorizontal size={14} />}
                </div>
              )}
              
              <img
                ref={imgRef}
                src={previewUrl}
                alt={filename}
                className="w-full h-auto rounded-lg border border-slate-700 transition-transform duration-200"
                style={{ transform: getTransformStyle() }}
              />
              
              {/* Grid Overlay */}
              {showGlobalGrid && globalGrid && renderSize.width > 0 && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={renderSize.width}
                  height={renderSize.height}
                  style={{ zIndex: 10, transform: getTransformStyle() }}
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
                <p className="text-slate-500">Image could not be loaded</p>
              </div>
            </div>
          )}

          {/* Action Buttons - Two Rows */}
          <div className="space-y-3 mt-4">
            
            {/* Row 1: Flip/Flop Controls */}
            {canEdit && (
              <div className="flex flex-wrap gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-sm self-center mr-2">Orientation:</span>
                
                <Button
                  variant={isFlipped ? "primary" : "secondary"}
                  onClick={handleFlip}
                  className="flex items-center gap-2"
                  title="Mirror vertically (swap North/South)"
                >
                  <FlipVertical size={18} />
                  Flip {isFlipped && '✓'}
                </Button>

                <Button
                  variant={isFlopped ? "primary" : "secondary"}
                  onClick={handleFlop}
                  className="flex items-center gap-2"
                  title="Mirror horizontally (swap East/West)"
                >
                  <FlipHorizontal size={18} />
                  Flop {isFlopped && '✓'}
                </Button>

                {hasTransformPending && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={handleResetTransform}
                      className="flex items-center gap-2"
                      title="Reset transformations"
                    >
                      <RotateCcw size={18} />
                      Reset
                    </Button>

                    <Button
                      variant="primary"
                      onClick={handleSaveTransform}
                      disabled={isSavingTransform}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-500"
                      title="Save transformation (overwrites original)"
                    >
                      {isSavingTransform ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Save size={18} />
                      )}
                      {isSavingTransform ? 'Saving...' : 'Save'}
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Row 2: Process and other actions */}
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="primary" 
                onClick={handleProcessImage} 
                disabled={isProcessing || isLoadingImage} 
                className="flex items-center gap-2"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                {isProcessing ? 'Processing...' : 'Process image'}
              </Button>

              <Button
                variant="secondary"
                onClick={() => setShowGlobalGrid(g => !g)}
                disabled={!processedData}
                className="flex items-center gap-2"
              >
                {showGlobalGrid ? <GridOffIcon size={18} /> : <GridIcon size={18} />}
                {showGlobalGrid ? 'Hide grid' : 'Display grid'}
              </Button>

              {canEdit && (
                <Button 
                  variant="danger" 
                  onClick={handleDeleteImage} 
                  disabled={isDeleting} 
                  className="flex items-center gap-2 ml-auto"
                >
                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Patches Grid */}
        {processedData?.patches?.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">
              Patches ({processedData.patches.length})
              <span className="text-sm font-normal text-slate-400 ml-2">
                - {labeledPatches.size} labeled
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