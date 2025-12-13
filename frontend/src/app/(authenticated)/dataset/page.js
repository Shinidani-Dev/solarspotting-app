'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Database,
  Image as ImageIcon,
  Tag,
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Filter,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/buttons/Button';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import detectorService from '@/api/detectorService';
import apiClient from '@/api/apiClient';
import DatasetPatchModal from '@/components/dataset/DatasetPatchModal';



export default function DatasetPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // ========================================
  // ACCESS CONTROL
  // ========================================
  
  const canAccess = user?.role === 'admin' || user?.is_labeler;

  useEffect(() => {
    if (!authLoading && user && !canAccess) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router, canAccess]);

  // ========================================
  // STATE
  // ========================================
  
  const [patches, setPatches] = useState([]);
  const [thumbnailUrls, setThumbnailUrls] = useState({}); // filename -> blob URL
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Selected patch for modal
  const [selectedPatchIndex, setSelectedPatchIndex] = useState(null);
  const [selectedPatchImage, setSelectedPatchImage] = useState(null);

  // Filter & View
  const [filterMode, setFilterMode] = useState('all'); // all, labeled, unlabeled
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid, list

  // ========================================
  // CLEANUP BLOB URLs
  // ========================================

  useEffect(() => {
    return () => {
      // Cleanup all blob URLs on unmount
      Object.values(thumbnailUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  // ========================================
  // LOAD DATA
  // ========================================

  useEffect(() => {
    if (canAccess) {
      loadPatches();
    }
  }, [canAccess]);

  const loadPatches = async () => {
    setIsLoading(true);
    try {
      const result = await detectorService.listDatasetPatches();
      const patchList = result.patches || [];
      setPatches(patchList);
      
      // Load thumbnails for visible patches (first batch)
      if (patchList.length > 0) {
        loadThumbnails(patchList.slice(0, 24)); // Load first 24 thumbnails
      }
    } catch (err) {
      setError(`Fehler beim Laden: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load thumbnails in batches
  const loadThumbnails = async (patchesToLoad) => {
    setIsLoadingThumbnails(true);
    
    const newUrls = { ...thumbnailUrls };
    
    for (const patch of patchesToLoad) {
      if (newUrls[patch.filename]) continue; // Already loaded
      
      try {
        const response = await apiClient.get(`/labeling/dataset/patch/${patch.filename}/image`, {
          responseType: 'blob'
        });
        newUrls[patch.filename] = URL.createObjectURL(response.data);
      } catch (err) {
        console.warn(`Could not load thumbnail for ${patch.filename}`);
        newUrls[patch.filename] = null;
      }
    }
    
    setThumbnailUrls(newUrls);
    setIsLoadingThumbnails(false);
  };

  // Load more thumbnails when scrolling/filtering
  const loadMoreThumbnails = useCallback((patchesToLoad) => {
    const missing = patchesToLoad.filter(p => thumbnailUrls[p.filename] === undefined);
    if (missing.length > 0) {
      loadThumbnails(missing);
    }
  }, [thumbnailUrls]);

  // ========================================
  // FILTER & SEARCH
  // ========================================

  const filteredPatches = patches.filter(patch => {
    // Filter by annotation status
    if (filterMode === 'labeled' && !patch.has_annotation) return false;
    if (filterMode === 'unlabeled' && patch.has_annotation) return false;

    // Search by filename
    if (searchTerm && !patch.filename.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    return true;
  });

  // Load thumbnails for filtered patches
  useEffect(() => {
    if (filteredPatches.length > 0) {
      loadMoreThumbnails(filteredPatches.slice(0, 24));
    }
  }, [filterMode, searchTerm]);

  // Stats
  const labeledCount = patches.filter(p => p.has_annotation).length;
  const unlabeledCount = patches.filter(p => !p.has_annotation).length;

  // ========================================
  // PATCH SELECTION & NAVIGATION
  // ========================================

  const loadPatchImage = async (patch) => {
    // Check if already in thumbnails
    if (thumbnailUrls[patch.filename]) {
      return thumbnailUrls[patch.filename];
    }
    
    try {
      const response = await apiClient.get(`/labeling/dataset/patch/${patch.filename}/image`, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(response.data);
      return url;
    } catch (err) {
      console.error("Error loading patch image:", err);
      return null;
    }
  };

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


  const handlePatchClick = async (index) => {
    const patch = filteredPatches[index];
    setSelectedPatchIndex(index);
    
    // Revoke old URL if it's not a shared thumbnail
    if (selectedPatchImage && !Object.values(thumbnailUrls).includes(selectedPatchImage)) {
      URL.revokeObjectURL(selectedPatchImage);
    }
    
    const imageUrl = await loadPatchImage(patch);
    setSelectedPatchImage(imageUrl);
  };

  const handleNavigatePatch = async (direction) => {
    const newIndex = selectedPatchIndex + direction;
    if (newIndex >= 0 && newIndex < filteredPatches.length) {
      // Revoke old URL if needed
      if (selectedPatchImage && !Object.values(thumbnailUrls).includes(selectedPatchImage)) {
        URL.revokeObjectURL(selectedPatchImage);
      }
      
      setSelectedPatchIndex(newIndex);
      const patch = filteredPatches[newIndex];
      const imageUrl = await loadPatchImage(patch);
      setSelectedPatchImage(imageUrl);
    }
  };

  const handleModalClose = () => {
    if (selectedPatchImage && !Object.values(thumbnailUrls).includes(selectedPatchImage)) {
      URL.revokeObjectURL(selectedPatchImage);
    }
    setSelectedPatchIndex(null);
    setSelectedPatchImage(null);
  };

  const handlePatchUpdated = (patchFilename, wasDeleted = false) => {
    if (wasDeleted) {
      // Remove from list and cleanup thumbnail
      if (thumbnailUrls[patchFilename]) {
        URL.revokeObjectURL(thumbnailUrls[patchFilename]);
        setThumbnailUrls(prev => {
          const newUrls = { ...prev };
          delete newUrls[patchFilename];
          return newUrls;
        });
      }
      setPatches(prev => prev.filter(p => p.filename !== patchFilename));
      setSuccessMessage("Patch gelöscht");
      
      // Navigate to next or close if last
      if (selectedPatchIndex !== null) {
        const newFilteredLength = filteredPatches.length - 1;
        if (newFilteredLength === 0) {
          handleModalClose();
        } else if (selectedPatchIndex >= newFilteredLength) {
          handleNavigatePatch(-1);
        }
      }
    } else {
      // Mark as labeled
      setPatches(prev => prev.map(p => 
        p.filename === patchFilename 
          ? { ...p, has_annotation: true }
          : p
      ));
      setSuccessMessage("Annotation gespeichert");
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
  // RENDER - Access Control
  // ========================================

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-400" size={40} />
      </div>
    );
  }

  if (!user || !canAccess) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-slate-200 mb-2">Zugriff verweigert</h1>
          <p className="text-slate-400">Diese Seite ist nur für Labeler und Administratoren zugänglich.</p>
        </div>
      </div>
    );
  }

  // Current selected patch
  const selectedPatch = selectedPatchIndex !== null ? filteredPatches[selectedPatchIndex] : null;

  // ========================================
  // RENDER - Main Content
  // ========================================

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-400 flex items-center gap-3">
              <Database size={32} />
              Dataset verwalten
            </h1>
            <p className="text-slate-400 mt-1">
              Patches und Annotationen im Dataset bearbeiten
            </p>
          </div>
          
          {canAccess && (
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-slate-700 rounded-lg">
              <ImageIcon className="text-amber-400" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-200">{patches.length}</p>
              <p className="text-slate-400 text-sm">Total Patches</p>
            </div>
          </div>
          
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Tag className="text-green-400" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{labeledCount}</p>
              <p className="text-slate-400 text-sm">Gelabelt</p>
            </div>
          </div>
          
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <AlertCircle className="text-yellow-400" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">{unlabeledCount}</p>
              <p className="text-slate-400 text-sm">Ohne Label</p>
            </div>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder="Patch suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input w-full pl-10"
                />
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-500" />
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="form-input"
              >
                <option value="all">Alle ({patches.length})</option>
                <option value="labeled">Gelabelt ({labeledCount})</option>
                <option value="unlabeled">Ohne Label ({unlabeledCount})</option>
              </select>
            </div>

            {/* View Mode */}
            <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-slate-600 text-amber-400' : 'text-slate-400'}`}
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-slate-600 text-amber-400' : 'text-slate-400'}`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Patches Display */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-amber-400" size={40} />
            <span className="ml-3 text-slate-300">Lade Patches...</span>
          </div>
        ) : filteredPatches.length === 0 ? (
          <div className="text-center py-20">
            <ImageIcon className="mx-auto text-slate-600 mb-4" size={48} />
            <p className="text-slate-400">
              {searchTerm || filterMode !== 'all' 
                ? 'Keine Patches gefunden mit diesen Filtern' 
                : 'Keine Patches im Dataset vorhanden'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View with Thumbnails */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredPatches.map((patch, index) => {
              const thumbnailUrl = thumbnailUrls[patch.filename];
              
              return (
                <button
                  key={patch.filename}
                  onClick={() => handlePatchClick(index)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                    patch.has_annotation 
                      ? 'border-green-500' 
                      : 'border-slate-600 hover:border-amber-500'
                  }`}
                >
                  {/* Patch Thumbnail */}
                  <div className="aspect-square bg-slate-800">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={patch.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {isLoadingThumbnails ? (
                          <Loader2 className="animate-spin text-slate-600" size={24} />
                        ) : (
                          <ImageIcon className="text-slate-600" size={32} />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Labeled indicator */}
                  {patch.has_annotation && (
                    <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                      <CheckCircle size={12} className="text-white" />
                    </div>
                  )}
                  
                  {/* Annotation count */}
                  {patch.annotation_count > 0 && (
                    <div className="absolute top-1 left-1 bg-amber-500 rounded-full px-2 py-0.5 text-xs font-bold text-slate-900">
                      {patch.annotation_count}
                    </div>
                  )}
                  
                  {/* Filename */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-2 py-1 text-xs text-slate-300 truncate">
                    {patch.filename.replace(/\.jpg$/i, '').slice(-20)}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  <th className="pb-3 pl-4">Vorschau</th>
                  <th className="pb-3">Dateiname</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Annotationen</th>
                  <th className="pb-3 pr-4 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatches.map((patch, index) => {
                  const thumbnailUrl = thumbnailUrls[patch.filename];
                  
                  return (
                    <tr 
                      key={patch.filename} 
                      className="border-b border-slate-700/50 hover:bg-slate-800/50"
                    >
                      <td className="py-2 pl-4">
                        <div className="w-12 h-12 bg-slate-800 rounded border border-slate-700 overflow-hidden">
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={patch.filename}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="text-slate-600" size={20} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="text-slate-300">{patch.filename}</span>
                      </td>
                      <td className="py-3">
                        {patch.has_annotation ? (
                          <span className="inline-flex items-center gap-1 text-green-400">
                            <CheckCircle size={14} /> Gelabelt
                          </span>
                        ) : (
                          <span className="text-slate-500">Ohne Label</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="text-slate-400">{patch.annotation_count || 0} Boxen</span>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <Button
                          variant="secondary"
                          onClick={() => handlePatchClick(index)}
                          className="text-xs"
                        >
                          Bearbeiten
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Results count */}
        {!isLoading && filteredPatches.length > 0 && (
          <p className="text-center text-slate-500 text-sm">
            {filteredPatches.length} von {patches.length} Patches angezeigt
          </p>
        )}
      </div>

      {/* Patch Modal with Navigation */}
      {selectedPatch && (
        <DatasetPatchModal
          patch={selectedPatch}
          patchImageUrl={selectedPatchImage}
          onClose={handleModalClose}
          onSaved={handlePatchUpdated}
          // Navigation props
          currentIndex={selectedPatchIndex}
          totalCount={filteredPatches.length}
          onNavigate={handleNavigatePatch}
        />
      )}
    </div>
  );
}