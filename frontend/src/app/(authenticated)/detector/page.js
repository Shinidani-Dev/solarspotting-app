'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Upload, 
  Play, 
  RefreshCw, 
  Database, 
  Cpu, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Grid as GridIcon,
  EyeOff as GridOffIcon,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/buttons/Button';
import detectorService from '@/api/detectorService';
import apiClient from '@/api/apiClient';
import DetectorPatchModal from '@/components/detector/Detectorpatchmodal';

export default function DetectorPage() {
  // ========================================
  // STATE
  // ========================================
  
  // Training Status
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [isPollingTraining, setIsPollingTraining] = useState(false);

  // Model Info
  const [modelInfo, setModelInfo] = useState(null);

  // Dataset Stats
  const [datasetStats, setDatasetStats] = useState(null);

  // Image List
  const [imageList, setImageList] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  // Processing
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  const [showGlobalGrid, setShowGlobalGrid] = useState(false);
  
  // Original Image URL (blob) and render size for grid overlay
  const [originalImageUrl, setOriginalImageUrl] = useState(null);
  const imgRef = useRef(null);
  const [renderSize, setRenderSize] = useState({ width: 0, height: 0 });

  // Patches
  const [labeledPatches, setLabeledPatches] = useState(new Set());
  const [selectedPatch, setSelectedPatch] = useState(null);

  // UI State
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {
    loadInitialData();
  }, []);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (originalImageUrl) {
        URL.revokeObjectURL(originalImageUrl);
      }
    };
  }, [originalImageUrl]);

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
  }, [originalImageUrl]);

  const loadInitialData = async () => {
    try {
      const [status, model, stats, images] = await Promise.all([
        detectorService.getTrainingStatus().catch(() => null),
        detectorService.getModelInfo().catch(() => null),
        detectorService.getDatasetStats().catch(() => null),
        detectorService.listImages().catch(() => ({ files: [] }))
      ]);

      setTrainingStatus(status);
      setModelInfo(model);
      setDatasetStats(stats);
      setImageList(images.files || []);

      if (status?.is_running) {
        startTrainingPolling();
      }
    } catch (err) {
      console.error("Error loading initial data:", err);
    }
  };

  // ========================================
  // TRAINING POLLING
  // ========================================

  const startTrainingPolling = useCallback(() => {
    if (isPollingTraining) return;
    setIsPollingTraining(true);

    const pollInterval = setInterval(async () => {
      try {
        const status = await detectorService.getTrainingStatus();
        setTrainingStatus(status);

        if (!status.is_running) {
          clearInterval(pollInterval);
          setIsPollingTraining(false);

          const model = await detectorService.getModelInfo();
          setModelInfo(model);

          if (status.status === 'completed') {
            setSuccessMessage("Training erfolgreich abgeschlossen!");
          } else if (status.status === 'failed') {
            setError(`Training fehlgeschlagen: ${status.message}`);
          }
        }
      } catch (err) {
        clearInterval(pollInterval);
        setIsPollingTraining(false);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isPollingTraining]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      await detectorService.uploadImage(file);
      setSuccessMessage(`Bild "${file.name}" hochgeladen!`);
      
      const images = await detectorService.listImages();
      setImageList(images.files || []);
      setSelectedImage(file.name);
    } catch (err) {
      setError(`Upload fehlgeschlagen: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcess = async () => {
    if (!selectedImage) {
      setError("Bitte zuerst ein Bild auswählen.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessedData(null);
    setOriginalImageUrl(null);

    try {
      const result = await detectorService.processImage(selectedImage);
      setProcessedData(result);
      setLabeledPatches(new Set());
      setSuccessMessage(`${result.total_patches} Patches generiert!`);
      
      // Load original image with auth
      try {
        const imageResponse = await apiClient.get(`/labeling/image/${selectedImage}`, {
          responseType: 'blob'
        });
        const blobUrl = URL.createObjectURL(imageResponse.data);
        setOriginalImageUrl(blobUrl);
      } catch (imgErr) {
        console.error("Could not load original image:", imgErr);
      }
    } catch (err) {
      setError(`Processing fehlgeschlagen: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePatchSelect = (patch) => {
    setSelectedPatch({
      ...patch,
      image_base64: patch.image_base64
    });
  };

  const handlePatchSaved = (patchFile, deleted = false) => {
    if (deleted) {
      setLabeledPatches(prev => {
        const next = new Set(prev);
        next.delete(patchFile);
        return next;
      });
    } else {
      setLabeledPatches(prev => new Set([...prev, patchFile]));
    }
    
    detectorService.getDatasetStats().then(setDatasetStats).catch(() => {});
  };

  const handleFinalizeDataset = async () => {
    const confirmFinalize = window.confirm(
      "Dataset finalisieren? Dies erstellt die Train/Val Aufteilung neu."
    );
    if (!confirmFinalize) return;

    try {
      const result = await detectorService.finalizeDataset();
      setSuccessMessage(`Dataset erstellt: ${result.train_images} Train, ${result.val_images} Val`);
      
      const stats = await detectorService.getDatasetStats();
      setDatasetStats(stats);
    } catch (err) {
      setError(`Dataset-Erstellung fehlgeschlagen: ${err.message}`);
    }
  };

  const handleStartTraining = async () => {
    if (!datasetStats?.output_dataset_ready) {
      setError("Bitte zuerst Dataset finalisieren.");
      return;
    }

    const confirmTrain = window.confirm(
      "Training starten? Das aktuelle Modell wird archiviert."
    );
    if (!confirmTrain) return;

    try {
      const result = await detectorService.startTraining({ epochs: 50 });
      setTrainingStatus({
        is_running: true,
        status: 'running',
        job_id: result.job_id,
        started_at: new Date().toISOString()
      });
      setSuccessMessage("Training gestartet!");
      startTrainingPolling();
    } catch (err) {
      setError(`Training konnte nicht gestartet werden: ${err.message}`);
    }
  };

  // Clear messages after timeout
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

  // Grid data from processedData
  const globalGrid = processedData?.global_grid;
  const originalWidth = globalGrid?.image_shape?.[1] || 2048;
  const originalHeight = globalGrid?.image_shape?.[0] || 2048;

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-400">
              ☀️ Sunspot Detector
            </h1>
            <p className="text-slate-400 mt-1">
              SDO Bilder hochladen, Sonnenflecken erkennen und Modell trainieren
            </p>
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

        {/* Status Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Training Status Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <Cpu className="text-amber-400" size={24} />
              <h2 className="text-lg font-semibold text-slate-200">Training Status</h2>
            </div>
            {trainingStatus?.is_running ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <Loader2 className="animate-spin" size={18} />
                  <span>Training läuft...</span>
                </div>
                <p className="text-slate-500 text-sm">
                  Job ID: {trainingStatus.job_id}
                </p>
                <p className="text-slate-500 text-sm">
                  Gestartet: {new Date(trainingStatus.started_at).toLocaleTimeString()}
                </p>
              </div>
            ) : trainingStatus?.status === 'completed' ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle size={18} />
                <span>Letztes Training erfolgreich</span>
              </div>
            ) : trainingStatus?.status === 'failed' ? (
              <div className="text-red-400">
                <p>Training fehlgeschlagen</p>
                <p className="text-sm text-slate-500">{trainingStatus.message}</p>
              </div>
            ) : (
              <p className="text-slate-500">Kein Training aktiv</p>
            )}
          </div>

          {/* Model Info Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="text-amber-400" size={24} />
              <h2 className="text-lg font-semibold text-slate-200">Aktives Modell</h2>
            </div>
            {modelInfo?.model_available ? (
              <div className="space-y-1 text-sm">
                <p className="text-green-400">✓ Modell verfügbar</p>
                <p className="text-slate-400">
                  Grösse: {modelInfo.model_size_mb} MB
                </p>
                <p className="text-slate-400">
                  Aktualisiert: {new Date(modelInfo.last_modified).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <p className="text-slate-500">Kein Modell trainiert</p>
            )}
          </div>

          {/* Dataset Stats Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <Database className="text-amber-400" size={24} />
              <h2 className="text-lg font-semibold text-slate-200">Dataset</h2>
            </div>
            {datasetStats ? (
              <div className="space-y-1 text-sm">
                <p className="text-slate-400">
                  Bilder: <span className="text-slate-200">{datasetStats.raw_images}</span>
                </p>
                <p className="text-slate-400">
                  Patches: <span className="text-slate-200">{datasetStats.patches}</span>
                </p>
                <p className="text-slate-400">
                  Annotationen: <span className="text-slate-200">{datasetStats.annotations}</span>
                </p>
                <p className="text-slate-400">
                  Dataset Ready: {datasetStats.output_dataset_ready ? (
                    <span className="text-green-400">✓ Ja</span>
                  ) : (
                    <span className="text-yellow-400">✗ Nein</span>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-slate-500">Laden...</p>
            )}
          </div>
        </div>

        {/* Main Actions */}
        <div className="card">
          <h2 className="text-xl font-semibold text-amber-400 mb-4">Aktionen</h2>
          
          <div className="flex flex-wrap gap-4 items-center">
            {/* Upload */}
            <label className="inline-flex items-center justify-center font-medium rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-amber-500 text-slate-900 hover:bg-amber-400 active:bg-amber-600 focus:ring-amber-500 text-sm px-4 py-2 cursor-pointer gap-2">
              {isUploading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Upload size={18} />
              )}
              {isUploading ? "Uploading..." : "Bild hochladen"}
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>

            {/* Image Selection */}
            {imageList.length > 0 && (
              <select
                className="form-input w-64"
                value={selectedImage || ""}
                onChange={(e) => setSelectedImage(e.target.value)}
              >
                <option value="">-- Bild auswählen --</option>
                {imageList.map((img) => (
                  <option key={img} value={img}>{img}</option>
                ))}
              </select>
            )}

            {/* Process Button */}
            <Button
              variant="primary"
              onClick={handleProcess}
              disabled={!selectedImage || isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Play size={18} />
              )}
              {isProcessing ? "Processing..." : "Verarbeiten"}
            </Button>

            {/* Finalize Dataset */}
            <Button
              variant="secondary"
              onClick={handleFinalizeDataset}
              disabled={!datasetStats || datasetStats.annotations === 0}
              className="flex items-center gap-2"
            >
              <Database size={18} />
              Dataset finalisieren
            </Button>

            {/* Start Training */}
            <Button
              variant="primary"
              onClick={handleStartTraining}
              disabled={trainingStatus?.is_running || !datasetStats?.output_dataset_ready}
              className="flex items-center gap-2"
            >
              {trainingStatus?.is_running ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Cpu size={18} />
              )}
              Training starten
            </Button>

            {/* Refresh */}
            <Button
              variant="secondary"
              onClick={loadInitialData}
              className="flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Aktualisieren
            </Button>
          </div>
        </div>

        {/* Processed Image & Patches */}
        {processedData && (
          <div className="space-y-6">
            
            {/* Original Image Card - GROSS wie OriginalImageViewer */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold text-amber-400">Originalbild</h2>
                  <p className="text-slate-400 text-sm">
                    {processedData.filename} • {processedData.total_patches} Patches • 
                    Zentrum: ({processedData.sun_center.x}, {processedData.sun_center.y}) • 
                    Radius: {processedData.sun_radius.toFixed(0)}px
                  </p>
                </div>

                <Button
                  variant="secondary"
                  onClick={() => setShowGlobalGrid(g => !g)}
                  className="flex items-center gap-2"
                >
                  {showGlobalGrid ? <GridOffIcon size={18} /> : <GridIcon size={18} />}
                  {showGlobalGrid ? "Grid ausblenden" : "Grid einblenden"}
                </Button>
              </div>

              {/* Image Container - GROSS */}
              <div className="relative w-full max-w-3xl mx-auto">
                {originalImageUrl ? (
                  <>
                    <img
                      ref={imgRef}
                      src={originalImageUrl}
                      alt={processedData.filename}
                      className="rounded border border-slate-700 shadow-lg w-full"
                      onLoad={() => {
                        if (imgRef.current) {
                          setRenderSize({
                            width: imgRef.current.clientWidth,
                            height: imgRef.current.clientHeight,
                          });
                        }
                      }}
                    />

                    {/* Grid Overlay SVG */}
                    {showGlobalGrid && globalGrid && renderSize.width > 0 && (
                      <svg
                        className="absolute inset-0 pointer-events-none"
                        width={renderSize.width}
                        height={renderSize.height}
                        style={{ zIndex: 10 }}
                      >
                        <g
                          transform={`scale(${renderSize.width / originalWidth}, ${renderSize.height / originalHeight})`}
                        >
                          {/* Latitude lines */}
                          {globalGrid.lat_lines?.map((line, idx) => (
                            <polyline
                              key={`lat-${idx}`}
                              fill="none"
                              stroke="rgba(74,80,255,0.5)"
                              strokeWidth="1"
                              points={line.points.map(p => `${p.px},${p.py}`).join(' ')}
                            />
                          ))}

                          {/* Longitude lines */}
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
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-slate-800 rounded border border-slate-700">
                    <Loader2 size={32} className="animate-spin text-amber-400 mr-2" />
                    <span className="text-slate-400">Bild wird geladen...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Patches Grid */}
            <div className="card">
              <h2 className="text-xl font-semibold text-amber-400 mb-4">
                Patches ({processedData.patches.length})
              </h2>
              
              {processedData.patches.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  Keine Sonnenflecken-Kandidaten gefunden.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {processedData.patches.map((patch, idx) => {
                    const isLabeled = labeledPatches.has(patch.patch_file);
                    const imgSrc = `data:image/jpeg;base64,${patch.image_base64}`;

                    return (
                      <div
                        key={idx}
                        onClick={() => handlePatchSelect(patch)}
                        className={`
                          cursor-pointer group bg-slate-800/50 hover:bg-slate-800 
                          border rounded-xl overflow-hidden shadow-md 
                          transition-all duration-200
                          ${isLabeled 
                            ? 'border-green-500/50 ring-2 ring-green-500/20' 
                            : 'border-slate-700 hover:border-amber-400'
                          }
                        `}
                      >
                        <div className="relative">
                          <img
                            src={imgSrc}
                            alt={`Patch ${idx + 1}`}
                            className="w-full h-32 object-cover"
                          />
                          {isLabeled && (
                            <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                              <CheckCircle size={16} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="p-2 text-xs">
                          <p className="text-slate-300 truncate font-medium">
                            {patch.patch_file}
                          </p>
                          <p className="text-slate-500">
                            px: {patch.px}, py: {patch.py}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!processedData && (
          <div className="card text-center py-16">
            <ImageIcon size={64} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl text-slate-400 mb-2">
              Kein Bild verarbeitet
            </h3>
            <p className="text-slate-500">
              Lade ein SDO Bild hoch und klicke auf Verarbeiten um zu starten.
            </p>
          </div>
        )}

      </div>

      {/* Patch Modal */}
      {selectedPatch && (
        <DetectorPatchModal
          patch={selectedPatch}
          onClose={() => setSelectedPatch(null)}
          onSaved={handlePatchSaved}
        />
      )}
    </div>
  );
}