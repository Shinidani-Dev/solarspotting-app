'use client';

import { useState, useEffect } from 'react';
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
  const [thumbnailUrls, setThumbnailUrls] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Paging State
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalPatches, setTotalPatches] = useState(0);
  const [labeledCount, setLabeledCount] = useState(0);
  const [unlabeledCount, setUnlabeledCount] = useState(0);
  const ITEMS_PER_PAGE = 42;

  // Selected patch for modal
  const [selectedPatchIndex, setSelectedPatchIndex] = useState(null);
  const [selectedPatchImage, setSelectedPatchImage] = useState(null);

  // Filter & View
  const [filterMode, setFilterMode] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  // ========================================
  // CLEANUP
  // ========================================

  useEffect(() => {
    return () => {
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
      loadPatches(0);
    }
  }, [canAccess]);

  const loadPatches = async (page = 0) => {
    setIsLoading(true);
    try {
      const result = await detectorService.listDatasetPatches({
        skip: page,
        limit: ITEMS_PER_PAGE
      });
      
      setPatches(result.patches || []);
      setCurrentPage(result.page || 0);
      setTotalPages(result.total_pages || 0);
      setTotalPatches(result.total || 0);
      setLabeledCount(result.labeled_count || 0);
      setUnlabeledCount(result.unlabeled_count || 0);
      
      if (result.patches?.length > 0) {
        loadThumbnails(result.patches);
      }
    } catch (err) {
      setError(`Error while loading: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadThumbnails = async (patchesToLoad) => {
    setIsLoadingThumbnails(true);
    const newUrls = { ...thumbnailUrls };
    
    for (const patch of patchesToLoad) {
      if (newUrls[patch.filename]) continue;
      
      try {
        const response = await apiClient.get(`/labeling/dataset/patch/${patch.filename}/image`, {
          responseType: 'blob'
        });
        newUrls[patch.filename] = URL.createObjectURL(response.data);
      } catch (err) {
        newUrls[patch.filename] = null;
      }
    }
    
    setThumbnailUrls(newUrls);
    setIsLoadingThumbnails(false);
  };

  // ========================================
  // PAGINATION
  // ========================================

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      loadPatches(newPage);
    }
  };

  // ========================================
  // CLIENT-SIDE FILTER (current page only)
  // ========================================

  const filteredPatches = patches.filter(patch => {
    if (filterMode === 'labeled' && !patch.has_annotation) return false;
    if (filterMode === 'unlabeled' && patch.has_annotation) return false;
    if (searchTerm && !patch.filename.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  // ========================================
  // PATCH SELECTION
  // ========================================

  const loadPatchImage = async (patch) => {
    if (thumbnailUrls[patch.filename]) {
      return thumbnailUrls[patch.filename];
    }
    
    try {
      const response = await apiClient.get(`/labeling/dataset/patch/${patch.filename}/image`, {
        responseType: 'blob'
      });
      return URL.createObjectURL(response.data);
    } catch (err) {
      return null;
    }
  };

  const handleFinalizeDataset = async () => {
    const confirmFinalize = window.confirm(
      "Finalise dataset? The existing dataset will be archived."
    );
    if (!confirmFinalize) return;

    try {
      const result = await detectorService.finalizeDataset();
      setSuccessMessage(`Dataset created! Train: ${result.train_images}, Val: ${result.val_images}`);
    } catch (err) {
      setError(`Creation failed: ${err.message}`);
    }
  };

  const handlePatchClick = async (index) => {
    const patch = filteredPatches[index];
    setSelectedPatchIndex(index);
    
    if (selectedPatchImage && !Object.values(thumbnailUrls).includes(selectedPatchImage)) {
      URL.revokeObjectURL(selectedPatchImage);
    }
    
    const imageUrl = await loadPatchImage(patch);
    setSelectedPatchImage(imageUrl);
  };

  const handleNavigatePatch = async (direction) => {
    const newIndex = selectedPatchIndex + direction;
    if (newIndex >= 0 && newIndex < filteredPatches.length) {
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
      if (thumbnailUrls[patchFilename]) {
        URL.revokeObjectURL(thumbnailUrls[patchFilename]);
        setThumbnailUrls(prev => {
          const newUrls = { ...prev };
          delete newUrls[patchFilename];
          return newUrls;
        });
      }
      setSuccessMessage("Patch deleted");
      loadPatches(currentPage);
    } else {
      setPatches(prev => prev.map(p => 
        p.filename === patchFilename 
          ? { ...p, has_annotation: true }
          : p
      ));
      setSuccessMessage("Annotation saved");
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
  // RENDER
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
          <h1 className="text-2xl font-bold text-slate-200 mb-2">Access denied</h1>
          <p className="text-slate-400">This page is only accessible for labeler and administrators.</p>
        </div>
      </div>
    );
  }

  const selectedPatch = selectedPatchIndex !== null ? filteredPatches[selectedPatchIndex] : null;

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-400 flex items-center gap-3">
              <Database size={32} />
              Manage dataset
            </h1>
            <p className="text-slate-400 mt-1">Edit patches and anotations</p>
          </div>
          
          <Button variant="secondary" onClick={handleFinalizeDataset} className="flex items-center gap-2">
            <FolderOpen size={18} />
            Finalise dataset
          </Button>
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
              <p className="text-2xl font-bold text-slate-200">{totalPatches}</p>
              <p className="text-slate-400 text-sm">Total Patches</p>
            </div>
          </div>
          
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Tag className="text-green-400" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{labeledCount}</p>
              <p className="text-slate-400 text-sm">Labeled</p>
            </div>
          </div>
          
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <AlertCircle className="text-yellow-400" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">{unlabeledCount}</p>
              <p className="text-slate-400 text-sm">Without label</p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder="Searching patch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input w-full pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-500" />
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="form-input"
              >
                <option value="all">All ({totalPatches})</option>
                <option value="labeled">Labeled ({labeledCount})</option>
                <option value="unlabeled">-Without label ({unlabeledCount})</option>
              </select>
            </div>

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

            <Button variant="secondary" onClick={() => loadPatches(currentPage)} className="p-2">
              <RefreshCw size={18} />
            </Button>
          </div>
        </div>

        {/* Pagination - Top */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="secondary"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft size={18} />
              Previous
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Seite</span>
              <select
                value={currentPage}
                onChange={(e) => handlePageChange(parseInt(e.target.value))}
                className="form-input w-20 text-center"
              >
                {Array.from({ length: totalPages }, (_, i) => (
                  <option key={i} value={i}>{i + 1}</option>
                ))}
              </select>
              <span className="text-slate-400">von {totalPages}</span>
            </div>
            
            <Button
              variant="secondary"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight size={18} />
            </Button>
          </div>
        )}

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
                ? 'No patches found with selected filters.' 
                : 'Dataset does not contain any patches'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
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
                  <div className="aspect-square bg-slate-800">
                    {thumbnailUrl ? (
                      <img src={thumbnailUrl} alt={patch.filename} className="w-full h-full object-cover" />
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
                  
                  {patch.has_annotation && (
                    <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                      <CheckCircle size={12} className="text-white" />
                    </div>
                  )}
                  
                  {patch.annotation_count > 0 && (
                    <div className="absolute top-1 left-1 bg-amber-500 rounded-full px-2 py-0.5 text-xs font-bold text-slate-900">
                      {patch.annotation_count}
                    </div>
                  )}
                  
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-2 py-1 text-xs text-slate-300 truncate">
                    {patch.filename.replace(/\.jpg$/i, '').slice(-20)}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  <th className="pb-3 pl-4">Preview</th>
                  <th className="pb-3">Filename</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Labels</th>
                  <th className="pb-3 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatches.map((patch, index) => {
                  const thumbnailUrl = thumbnailUrls[patch.filename];
                  
                  return (
                    <tr key={patch.filename} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                      <td className="py-2 pl-4">
                        <div className="w-12 h-12 bg-slate-800 rounded border border-slate-700 overflow-hidden">
                          {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt={patch.filename} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="text-slate-600" size={20} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-slate-300">{patch.filename}</td>
                      <td className="py-3">
                        {patch.has_annotation ? (
                          <span className="inline-flex items-center gap-1 text-green-400">
                            <CheckCircle size={14} /> Labeled
                          </span>
                        ) : (
                          <span className="text-slate-500">Ohne Label</span>
                        )}
                      </td>
                      <td className="py-3 text-slate-400">{patch.annotation_count || 0} Boxes</td>
                      <td className="py-3 pr-4 text-right">
                        <Button variant="secondary" onClick={() => handlePatchClick(index)} className="text-xs">
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination - Bottom */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="secondary"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft size={18} />
              Previous
            </Button>
            
            <span className="text-slate-400">
              Page {currentPage + 1} of {totalPages} ({totalPatches} Patches)
            </span>
            
            <Button
              variant="secondary"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight size={18} />
            </Button>
          </div>
        )}
      </div>

      {/* Patch Modal */}
      {selectedPatch && (
        <DatasetPatchModal
          patch={selectedPatch}
          patchImageUrl={selectedPatchImage}
          onClose={handleModalClose}
          onSaved={handlePatchUpdated}
          currentIndex={selectedPatchIndex}
          totalCount={filteredPatches.length}
          onNavigate={handleNavigatePatch}
        />
      )}
    </div>
  );
}