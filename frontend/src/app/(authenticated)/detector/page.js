'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Grid as GridIcon,
  EyeOff as GridOffIcon,
  FolderOpen,
  Trash2,
  Search,
  ChevronDown,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/buttons/Button';
import { useAuth } from '@/hooks/useAuth';
import detectorService from '@/api/detectorService';
import apiClient from '@/api/apiClient';
import DetectorPatchModal from '@/components/detector/Detectorpatchmodal';
import ClassInfoPanel from '@/components/ui/ClassInfoPanel';

export default function DetectorPage() {
  const { user } = useAuth();
  
  // ========================================
  // ROLLEN-CHECK
  // ========================================
  
  const canEdit = user?.role === 'admin' || user?.is_labeler;

  // ========================================
  // STATE
  // ========================================
  
  // Image List & Selection
  const [imageList, setImageList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Search & Dropdown
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Image Preview
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Processing
  const [isUploading, setIsUploading] = useState(false);
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
  // FILTERED IMAGES
  // ========================================
  
  const filteredImages = imageList.filter(filename =>
    filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {
    loadImageList();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup blob URLs on unmount
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

  // ========================================
  // LOAD IMAGE LIST
  // ========================================

  const loadImageList = async () => {
    try {
      const result = await detectorService.listImages();
      setImageList(result.files || []);
    } catch (err) {
      console.error("Error loading image list:", err);
    }
  };

  // ========================================
  // IMAGE SELECTION
  // ========================================

  const selectImage = async (filename) => {
    const index = imageList.indexOf(filename);
    setSelectedImage(filename);
    setCurrentIndex(index >= 0 ? index : 0);
    setProcessedData(null);
    setLabeledPatches(new Set());
    setShowGlobalGrid(false);
    setIsDropdownOpen(false);
    // Keep searchTerm so user can continue browsing filtered results
    
    try {
      const response = await apiClient.get(`/labeling/image/${filename}`, {
        responseType: 'blob'
      });
      
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      
      const url = URL.createObjectURL(response.data);
      setPreviewUrl(url);
    } catch (err) {
      setError(`Fehler beim Laden des Bildes: ${err.message}`);
    }
  };

  // ========================================
  // NAVIGATION
  // ========================================

  const goToPrevious = () => {
    if (currentIndex > 0) {
      selectImage(imageList[currentIndex - 1]);
    }
  };

  const goToNext = () => {
    if (currentIndex < imageList.length - 1) {
      selectImage(imageList[currentIndex + 1]);
    }
  };

  // ========================================
  // UPLOAD
  // ========================================

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsUploading(true);
    setError(null);

    try {
      if (files.length === 1) {
        await detectorService.uploadImage(files[0]);
        setSuccessMessage(`"${files[0].name}" hochgeladen!`);
      } else {
        const result = await detectorService.uploadMultipleImages(files);
        setSuccessMessage(`${result.uploaded.length} von ${files.length} Bildern hochgeladen!`);
      }
      
      await loadImageList();
    } catch (err) {
      setError(`Upload fehlgeschlagen: ${err.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // ========================================
  // DELETE RAW IMAGE
  // ========================================

  const handleDeleteImage = async () => {
    if (!selectedImage) return;

    const confirmDelete = window.confirm(
      `Bild "${selectedImage}" wirklich löschen?`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await detectorService.deleteRawImage(selectedImage);
      setSuccessMessage(`"${selectedImage}" gelöscht`);
      
      setSelectedImage(null);
      setPreviewUrl(null);
      setProcessedData(null);
      
      await loadImageList();
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
    if (!selectedImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await detectorService.processImage(selectedImage);
      setProcessedData(result);
      
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
  // FINALIZE DATASET
  // ========================================

  const handleFinalizeDataset = async () => {
    const confirmFinalize = window.confirm(
      "Dataset finalisieren? Das bestehende Dataset wird archiviert."
    );
    if (!confirmFinalize) return;

    try {
      const result = await detectorService.finalizeDataset();
      setSuccessMessage(`Dataset erstellt! Train: ${result.train_images}, Val: ${result.val_images}`);
    } catch (err) {
      setError(`Finalisierung fehlgeschlagen: ${err.message}`);
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

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-400">Sunspot Detector</h1>
            <p className="text-slate-400 mt-1">SDO Bilder verarbeiten und Sonnenflecken annotieren</p>
          </div>
          
          {canEdit && (
            <Button variant="secondary" onClick={handleFinalizeDataset} className="flex items-center gap-2">
              <FolderOpen size={18} />
              Dataset finalisieren
            </Button>
          )}
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

        {/* ============================================ */}
        {/* IMAGE SELECTION BAR */}
        {/* ============================================ */}
        <div className="card">
          <div className="flex items-center gap-4 flex-wrap">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <label className="block text-sm text-slate-400 mb-1">Suchen</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Dateiname..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Dropdown */}
            <div className="relative min-w-[250px] max-w-md" ref={dropdownRef}>
              <label className="block text-sm text-slate-400 mb-1">Bild auswählen</label>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-left hover:border-amber-500/50 transition-colors"
              >
                <span className={selectedImage ? 'text-slate-200' : 'text-slate-500'}>
                  {selectedImage || 'Bild auswählen...'}
                </span>
                <ChevronDown size={18} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden">
                  {/* Options List */}
                  <div className="max-h-60 overflow-y-auto">
                    {filteredImages.length === 0 ? (
                      <div className="px-3 py-4 text-slate-500 text-sm text-center">
                        {imageList.length === 0 ? 'Keine Bilder vorhanden' : 'Keine Treffer'}
                      </div>
                    ) : (
                      filteredImages.map((filename) => (
                        <button
                          key={filename}
                          onClick={() => selectImage(filename)}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-700 transition-colors ${
                            selectedImage === filename 
                              ? 'bg-amber-500/20 text-amber-400' 
                              : 'text-slate-300'
                          }`}
                        >
                          {filename}
                        </button>
                      ))
                    )}
                  </div>
                  
                  {/* Count */}
                  <div className="px-3 py-1.5 border-t border-slate-700 text-xs text-slate-500">
                    {filteredImages.length} von {imageList.length} Bildern
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            {selectedImage && imageList.length > 1 && (
              <div className="flex items-center gap-2 self-end pb-0.5">
                <Button variant="secondary" onClick={goToPrevious} disabled={currentIndex === 0} className="p-2">
                  <ChevronLeft size={18} />
                </Button>
                <span className="text-slate-400 text-sm min-w-[60px] text-center">
                  {currentIndex + 1} / {imageList.length}
                </span>
                <Button variant="secondary" onClick={goToNext} disabled={currentIndex === imageList.length - 1} className="p-2">
                  <ChevronRight size={18} />
                </Button>
              </div>
            )}

            {/* Upload Button (nur für Labeler/Admin) */}
            {canEdit && (
              <div className="self-end">
                <input
                  type="file"
                  id="image-upload"
                  accept=".jpg,.jpeg,.png"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  onClick={() => document.getElementById('image-upload').click()}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  {isUploading ? 'Hochladen...' : 'Upload'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ============================================ */}
        {/* MAIN IMAGE PREVIEW */}
        {/* ============================================ */}
        <div className="card">
          {/* Image Display */}
          {previewUrl ? (
            <div className="relative w-full max-w-3xl mx-auto">
              <img
                ref={imgRef}
                src={previewUrl}
                alt={selectedImage}
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
                <p className="text-slate-500">Wählen Sie ein Bild aus dem Dropdown</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {selectedImage && (
            <div className="flex flex-wrap gap-3 mt-4">
              <Button variant="primary" onClick={handleProcessImage} disabled={isProcessing} className="flex items-center gap-2">
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
                <Button variant="danger" onClick={handleDeleteImage} disabled={isDeleting} className="flex items-center gap-2 ml-auto">
                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  Löschen
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* PATCHES GRID */}
        {/* ============================================ */}
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
                    <img src={`data:image/jpeg;base64,${patch.image_base64}`} alt={`Patch ${idx + 1}`} className="w-full h-auto" />
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