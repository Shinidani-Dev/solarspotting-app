'use client';

import { useState, useEffect } from 'react';
import { 
  Upload, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FolderOpen,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/buttons/Button';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import detectorService from '@/api/detectorService';
import apiClient from '@/api/apiClient';

const MONTH_NAMES = [
  '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export default function DetectorPage() {
  const { user } = useAuth();
  const router = useRouter();
  const canEdit = user?.role === 'admin' || user?.is_labeler;

  // ========================================
  // STATE
  // ========================================
  
  const [imageList, setImageList] = useState([]);
  const [thumbnailUrls, setThumbnailUrls] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  
  // Paging
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const IMAGES_PER_PAGE = 32;
  
  // Filters
  const [filterYear, setFilterYear] = useState(null);
  const [filterMonth, setFilterMonth] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);

  // Upload
  const [isUploading, setIsUploading] = useState(false);

  // Messages
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {
    loadImages(0);
  }, []);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      Object.values(thumbnailUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  // ========================================
  // LOAD IMAGES
  // ========================================

  const loadImages = async (page = 0, year = filterYear, month = filterMonth) => {
    setIsLoading(true);
    try {
      const result = await detectorService.listImages({
        year,
        month,
        skip: page,
        limit: IMAGES_PER_PAGE
      });

      setImageList(result.files || []);
      setCurrentPage(result.page || 0);
      setTotalPages(result.total_pages || 0);
      setTotalImages(result.total || 0);
      setAvailableYears(result.available_years || []);
      setAvailableMonths(result.available_months || []);

      // Load thumbnails
      if (result.files?.length > 0) {
        loadThumbnails(result.files);
      }
    } catch (err) {
      setError(`Fehler beim Laden: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadThumbnails = async (filenames) => {
    setIsLoadingThumbnails(true);
    const newUrls = { ...thumbnailUrls };

    for (const filename of filenames) {
      if (newUrls[filename]) continue;

      try {
        const response = await apiClient.get(`/labeling/image/${filename}`, {
          responseType: 'blob'
        });
        newUrls[filename] = URL.createObjectURL(response.data);
      } catch (err) {
        console.warn(`Could not load thumbnail for ${filename}`);
        newUrls[filename] = null;
      }
    }

    setThumbnailUrls(newUrls);
    setIsLoadingThumbnails(false);
  };

  // ========================================
  // FILTER & PAGINATION HANDLERS
  // ========================================

  const handleYearChange = (year) => {
    const newYear = year === '' ? null : parseInt(year);
    setFilterYear(newYear);
    setCurrentPage(0);
    loadImages(0, newYear, filterMonth);
  };

  const handleMonthChange = (month) => {
    const newMonth = month === '' ? null : parseInt(month);
    setFilterMonth(newMonth);
    setCurrentPage(0);
    loadImages(0, filterYear, newMonth);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      loadImages(newPage);
    }
  };

  const clearFilters = () => {
    setFilterYear(null);
    setFilterMonth(null);
    setCurrentPage(0);
    loadImages(0, null, null);
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
      
      await loadImages(currentPage);
    } catch (err) {
      setError(`Upload fehlgeschlagen: ${err.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // ========================================
  // IMAGE CLICK → Navigate to detail page
  // ========================================

  const handleImageClick = (filename) => {
    router.push(`/detector/${encodeURIComponent(filename)}`);
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
  // RENDER
  // ========================================

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-400">Sunspot Detector</h1>
            <p className="text-slate-400 mt-1">SDO Bilder verarbeiten und Sonnenflecken annotieren</p>
          </div>
          
          <div className="flex items-center gap-3">
            {canEdit && (
              <Button variant="secondary" onClick={handleFinalizeDataset} className="flex items-center gap-2">
                <FolderOpen size={18} />
                Dataset finalisieren
              </Button>
            )}
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

        {/* Filter & Actions Bar */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-4">
            {/* Year Filter */}
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-slate-500" />
              <select
                value={filterYear || ''}
                onChange={(e) => handleYearChange(e.target.value)}
                className="form-input w-32"
              >
                <option value="">Alle Jahre</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <select
              value={filterMonth || ''}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="form-input w-40"
            >
              <option value="">Alle Monate</option>
              {availableMonths.map(month => (
                <option key={month} value={month}>{MONTH_NAMES[month]}</option>
              ))}
            </select>

            {/* Clear Filters */}
            {(filterYear || filterMonth) && (
              <Button variant="secondary" onClick={clearFilters} className="text-sm">
                Filter zurücksetzen
              </Button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Image Count */}
            <span className="text-slate-400 text-sm">
              {totalImages} Bilder
            </span>

            {/* Refresh */}
            <Button
              variant="secondary"
              onClick={() => loadImages(currentPage)}
              className="p-2"
            >
              <RefreshCw size={18} />
            </Button>

            {/* Upload Button */}
            {canEdit && (
              <>
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
                  variant="primary"
                  onClick={() => document.getElementById('image-upload').click()}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  {isUploading ? 'Hochladen...' : 'Upload'}
                </Button>
              </>
            )}
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
              Zurück
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
              Weiter
              <ChevronRight size={18} />
            </Button>
          </div>
        )}

        {/* Image Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-amber-400" size={40} />
            <span className="ml-3 text-slate-300">Lade Bilder...</span>
          </div>
        ) : imageList.length === 0 ? (
          <div className="text-center py-20">
            <ImageIcon className="mx-auto text-slate-600 mb-4" size={48} />
            <p className="text-slate-400">
              {(filterYear || filterMonth) 
                ? 'Keine Bilder gefunden mit diesen Filtern' 
                : 'Keine Bilder vorhanden'}
            </p>
            {canEdit && (
              <p className="text-slate-500 text-sm mt-2">
                Laden Sie SDO Bilder hoch, um zu beginnen.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {imageList.map((filename) => {
              const thumbnailUrl = thumbnailUrls[filename];
              
              return (
                <button
                  key={filename}
                  onClick={() => handleImageClick(filename)}
                  className="relative rounded-lg overflow-hidden border-2 border-slate-600 hover:border-amber-500 transition-all hover:scale-105 bg-slate-800"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={filename}
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
                  
                  {/* Filename */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-2 py-1 text-xs text-slate-300 truncate">
                    {filename.substring(0, 15)}...
                  </div>
                </button>
              );
            })}
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
              Zurück
            </Button>
            
            <span className="text-slate-400">
              Seite {currentPage + 1} von {totalPages} ({totalImages} Bilder)
            </span>
            
            <Button
              variant="secondary"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="flex items-center gap-2"
            >
              Weiter
              <ChevronRight size={18} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}