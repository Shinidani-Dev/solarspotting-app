'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Sun,
  Play,
  Image as ImageIcon,
  Sparkles,
  Info,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Grid as GridIcon,
  EyeOff as GridOffIcon,
  X,
  Search,
  ChevronDown
} from 'lucide-react';
import demoService from '@/api/demoService';
import ClassInfoPanel from '@/components/ui/ClassInfoPanel';

// Class colors
const CLASS_COLORS = {
  A: "#22c55e",
  B: "#3b82f6",
  C: "#eab308",
  D: "#f97316",
  E: "#ef4444",
  F: "#a855f7",
  H: "#06b6d4",
};

export default function DemoPage() {
  // ========================================
  // STATE
  // ========================================
  
  // Images
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  
  // Search & Dropdown
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  const [showGlobalGrid, setShowGlobalGrid] = useState(false);

  // Image display
  const imgRef = useRef(null);
  const [renderSize, setRenderSize] = useState({ width: 0, height: 0 });

  // Selected Patch Modal
  const [selectedPatch, setSelectedPatch] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResults, setDetectionResults] = useState([]);

  // Model info
  const [modelInfo, setModelInfo] = useState(null);

  // UI
  const [error, setError] = useState(null);

  // ========================================
  // FILTERED IMAGES
  // ========================================
  
  const filteredImages = images.filter(filename =>
    filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {
    loadDemoData();
  }, []);

  const loadDemoData = async () => {
    setIsLoadingImages(true);
    try {
      const [imagesResult, modelResult] = await Promise.all([
        demoService.listImages(),
        demoService.getModelInfo()
      ]);
      setImages(imagesResult.files || []);
      setModelInfo(modelResult);
    } catch (err) {
      setError("Fehler beim Laden der Demo-Daten");
      console.error(err);
    } finally {
      setIsLoadingImages(false);
    }
  };

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
  }, [selectedImage]);

  // ========================================
  // IMAGE SELECTION
  // ========================================

  const handleSelectImage = (filename) => {
    setSelectedImage(filename);
    setProcessedData(null);
    setShowGlobalGrid(false);
    setError(null);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  // ========================================
  // PROCESS IMAGE
  // ========================================

  const handleProcessImage = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await demoService.processImage(selectedImage);
      setProcessedData(result);
    } catch (err) {
      setError("Fehler bei der Verarbeitung des Bildes");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // ========================================
  // DETECTION
  // ========================================

  const handlePatchClick = (patch) => {
    setSelectedPatch(patch);
    setDetectionResults([]);
  };

  const handleDetect = async () => {
    if (!selectedPatch) return;

    setIsDetecting(true);
    setError(null);

    try {
      const result = await demoService.detectOnPatch(selectedPatch.image_base64, 0.25);
      setDetectionResults(result.predictions || []);
    } catch (err) {
      setError("Fehler bei der Erkennung. Ist ein Modell verfügbar?");
      console.error(err);
    } finally {
      setIsDetecting(false);
    }
  };

  const closePatchModal = () => {
    setSelectedPatch(null);
    setDetectionResults([]);
  };

  // ========================================
  // CLEAR ERROR
  // ========================================

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      <ClassInfoPanel />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <Sun className="text-amber-400" size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-amber-400">SolarSpotting Demo</h1>
              <p className="text-slate-400 mt-1">Testen Sie unsere KI-gestützte Sonnenfleckenerkennung</p>
            </div>
          </div>

          {/* Model Status */}
          <div className="flex items-center gap-4 mt-6">
            {modelInfo?.model_available ? (
              <div className="flex items-center gap-2 text-green-400 bg-green-500/10 px-4 py-2 rounded-lg">
                <CheckCircle size={18} />
                <span>Modell bereit</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-400 bg-yellow-500/10 px-4 py-2 rounded-lg">
                <AlertCircle size={18} />
                <span>Kein Modell verfügbar</span>
              </div>
            )}
            
            {modelInfo?.classes && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Klassen:</span>
                <div className="flex gap-1">
                  {modelInfo.classes.map(cls => (
                    <span 
                      key={cls} 
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: `${CLASS_COLORS[cls]}30`, color: CLASS_COLORS[cls] }}
                    >
                      {cls}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        
        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 flex items-center gap-3">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-start gap-3">
          <Info className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-slate-400">
            <p className="font-medium text-slate-300 mb-1">So funktioniert die Demo:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Wählen Sie ein SDO-Bild aus dem Dropdown</li>
              <li>Klicken Sie Process Image um Patches zu generieren</li>
              <li>Klicken Sie auf einen Patch und dann Auto-Detect</li>
              <li>Das Modell erkennt Sonnenflecken und klassifiziert sie</li>
            </ol>
            <p className="mt-2 text-slate-500">
              <strong>Hinweis:</strong> In der Demo werden keine Daten gespeichert.
            </p>
          </div>
        </div>

        {/* ============================================ */}
        {/* IMAGE SELECTION */}
        {/* ============================================ */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="relative max-w-md" ref={dropdownRef}>
            <label className="block text-sm text-slate-400 mb-1">Demo-Bild auswählen</label>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={isLoadingImages}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-left hover:border-amber-500/50 transition-colors disabled:opacity-50"
            >
              {isLoadingImages ? (
                <span className="flex items-center gap-2 text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  Lade Bilder...
                </span>
              ) : (
                <span className={selectedImage ? 'text-slate-200' : 'text-slate-500'}>
                  {selectedImage || 'Bild auswählen...'}
                </span>
              )}
              <ChevronDown size={18} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden">
                {/* Search Input */}
                <div className="p-2 border-b border-slate-700">
                  <div className="relative">
                    <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Suchen..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                      autoFocus
                    />
                  </div>
                </div>
                
                {/* Options List */}
                <div className="max-h-60 overflow-y-auto">
                  {filteredImages.length === 0 ? (
                    <div className="px-3 py-4 text-slate-500 text-sm text-center">
                      {images.length === 0 ? 'Keine Demo-Bilder verfügbar' : 'Keine Treffer'}
                    </div>
                  ) : (
                    filteredImages.map((filename) => (
                      <button
                        key={filename}
                        onClick={() => handleSelectImage(filename)}
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
                  {filteredImages.length} von {images.length} Bildern
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================ */}
        {/* MAIN IMAGE PREVIEW */}
        {/* ============================================ */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          {selectedImage ? (
            <div className="relative w-full max-w-3xl mx-auto">
              <img
                ref={imgRef}
                src={demoService.getImageUrl(selectedImage)}
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
            <div className="h-64 flex items-center justify-center bg-slate-700/30 rounded-lg border border-slate-700">
              <div className="text-center">
                <ImageIcon size={48} className="mx-auto text-slate-600 mb-2" />
                <p className="text-slate-500">Wählen Sie ein Bild aus dem Dropdown oben</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {selectedImage && (
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={handleProcessImage}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-600 text-slate-900 font-medium rounded-lg transition-colors"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                {isProcessing ? 'Verarbeite...' : 'Process Image'}
              </button>

              <button
                onClick={() => setShowGlobalGrid(g => !g)}
                disabled={!processedData}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 rounded-lg transition-colors"
              >
                {showGlobalGrid ? <GridOffIcon size={18} /> : <GridIcon size={18} />}
                {showGlobalGrid ? 'Grid aus' : 'Grid ein'}
              </button>
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* PATCHES GRID */}
        {/* ============================================ */}
        {processedData?.patches?.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">
              Patches ({processedData.patches.length})
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {processedData.patches.map((patch, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePatchClick(patch)}
                  className="relative rounded-lg overflow-hidden border-2 border-slate-600 hover:border-amber-500 transition-all hover:scale-105"
                >
                  <img src={`data:image/jpeg;base64,${patch.image_base64}`} alt={`Patch ${idx + 1}`} className="w-full h-auto" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 text-xs text-slate-300">
                    x:{patch.px} y:{patch.py}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-slate-500 text-sm pt-8 border-t border-slate-800">
          <p>SolarSpotting - Bachelorarbeit Projekt</p>
          <p className="mt-1">
            <a href="/login" className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1">
              Anmelden für vollständigen Zugriff <ExternalLink size={14} />
            </a>
          </p>
        </div>
      </div>

      {/* Patch Detection Modal */}
      {selectedPatch && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-3xl relative">
            
            <button className="absolute top-4 right-4 text-slate-400 hover:text-amber-300" onClick={closePatchModal}>
              <X size={28} />
            </button>

            <div className="mb-4">
              <h2 className="text-2xl font-bold text-amber-400">Sonnenfleckenerkennung</h2>
              <p className="text-slate-400 text-sm mt-1">Klicken Sie auf Auto-Detect</p>
            </div>

            <div className="mb-4">
              <button
                onClick={handleDetect}
                disabled={isDetecting || !modelInfo?.model_available}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-600 text-slate-900 font-medium rounded-lg transition-colors"
              >
                {isDetecting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {isDetecting ? 'Erkennung läuft...' : 'Auto-Detect'}
              </button>
              {!modelInfo?.model_available && (
                <p className="text-yellow-400 text-sm mt-2">Kein Modell verfügbar</p>
              )}
            </div>

            <div className="relative mb-4">
              <img
                src={`data:image/jpeg;base64,${selectedPatch.image_base64}`}
                alt="Selected Patch"
                className="w-full h-auto rounded-lg border border-slate-700"
              />
              {detectionResults.length > 0 && (
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox="0 0 512 512" preserveAspectRatio="xMidYMid meet">
                  {detectionResults.map((det, idx) => {
                    const [x, y, w, h] = det.bbox;
                    const color = CLASS_COLORS[det.class] || "#888";
                    return (
                      <g key={idx}>
                        <rect x={x} y={y} width={w} height={h} fill="none" stroke={color} strokeWidth="3" />
                        <rect x={x} y={y - 20} width={50} height={20} fill={color} />
                        <text x={x + 4} y={y - 5} fill="white" fontSize="14" fontWeight="bold">
                          {det.class} {(det.confidence * 100).toFixed(0)}%
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            {detectionResults.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-slate-300 mb-2">Erkannte Sonnenflecken ({detectionResults.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {detectionResults.map((det, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-800 rounded-lg p-2 border border-slate-700">
                      <span className="w-4 h-4 rounded" style={{ backgroundColor: CLASS_COLORS[det.class] || "#888" }} />
                      <span className="text-slate-200 font-medium">{det.class}</span>
                      <span className="text-slate-500 text-sm">({(det.confidence * 100).toFixed(0)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : !isDetecting && (
              <p className="text-slate-500 text-center py-4">Klicken Sie auf Auto-Detect</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}