'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Cpu, 
  Database, 
  Brain,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Archive,
  BarChart3,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/buttons/Button';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import detectorService from '@/api/detectorService';

export default function MLTrainingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // ========================================
  // ACCESS CONTROL
  // ========================================
  
  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

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

  // Training Config
  const [trainingConfig, setTrainingConfig] = useState({
    epochs: 50,
    batchSize: 16,
    modelArch: 'yolov8n.pt'
  });

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadTrainingStatus(),
        loadModelInfo(),
        loadDatasetStats()
      ]);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // TRAINING STATUS
  // ========================================

  const loadTrainingStatus = async () => {
    try {
      const status = await detectorService.getTrainingStatus();
      setTrainingStatus(status);
      
      // Start polling if training is running
      if (status.is_running && !isPollingTraining) {
        startTrainingPolling();
      }
    } catch (err) {
      console.error("Error loading training status:", err);
    }
  };

  const startTrainingPolling = useCallback(() => {
    setIsPollingTraining(true);
    
    const poll = async () => {
      try {
        const status = await detectorService.getTrainingStatus();
        setTrainingStatus(status);
        
        if (status.is_running) {
          setTimeout(poll, 3000); // Poll every 3 seconds
        } else {
          setIsPollingTraining(false);
          // Refresh model info after training completes
          loadModelInfo();
          if (status.status === 'completed') {
            setSuccessMessage("Training erfolgreich abgeschlossen!");
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
        setIsPollingTraining(false);
      }
    };
    
    poll();
  }, []);

  // ========================================
  // MODEL INFO
  // ========================================

  const loadModelInfo = async () => {
    try {
      const info = await detectorService.getModelInfo();
      setModelInfo(info);
    } catch (err) {
      console.error("Error loading model info:", err);
    }
  };

  // ========================================
  // DATASET STATS
  // ========================================

  const loadDatasetStats = async () => {
    try {
      const stats = await detectorService.getDatasetStats();
      setDatasetStats(stats);
    } catch (err) {
      console.error("Error loading dataset stats:", err);
    }
  };

  // ========================================
  // START TRAINING
  // ========================================

  const handleStartTraining = async () => {
    if (!datasetStats?.output_dataset_ready) {
      setError("Bitte zuerst das Dataset finalisieren (auf der Detector-Seite).");
      return;
    }

    const confirmTrain = window.confirm(
      `Training starten mit folgenden Einstellungen?\n\n` +
      `Epochen: ${trainingConfig.epochs}\n` +
      `Batch Size: ${trainingConfig.batchSize}\n` +
      `Modell: ${trainingConfig.modelArch}\n\n` +
      `Das aktuelle Modell wird archiviert.`
    );
    if (!confirmTrain) return;

    try {
      const result = await detectorService.startTraining(trainingConfig);
      setTrainingStatus({
        is_running: true,
        status: 'running',
        job_id: result.job_id,
        started_at: new Date().toISOString(),
        current_epoch: 0,
        total_epochs: trainingConfig.epochs,
        progress_percent: 0
      });
      setSuccessMessage("Training gestartet!");
      startTrainingPolling();
    } catch (err) {
      setError(`Training konnte nicht gestartet werden: ${err.message}`);
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

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-slate-200 mb-2">Zugriff verweigert</h1>
          <p className="text-slate-400">Diese Seite ist nur für Administratoren zugänglich.</p>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER - Main Content
  // ========================================

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-400 flex items-center gap-3">
              <Brain size={32} />
              CNN Training
            </h1>
            <p className="text-slate-400 mt-1">YOLO Model Training und Verwaltung</p>
          </div>
          
          <Button variant="secondary" onClick={loadAllData} className="flex items-center gap-2">
            <RefreshCw size={18} />
            Aktualisieren
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

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-amber-400" size={40} />
            <span className="ml-3 text-slate-300">Lade Daten...</span>
          </div>
        ) : (
          <>
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Training Status Card */}
              <div className="card">
                <div className="flex items-center gap-3 mb-3">
                  <Cpu className="text-amber-400" size={24} />
                  <h2 className="text-lg font-semibold text-slate-200">Training Status</h2>
                </div>
                
                {trainingStatus?.is_running ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin text-amber-400" size={16} />
                      <span className="text-amber-400">Training läuft...</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-amber-500 h-2 rounded-full transition-all"
                        style={{ width: `${trainingStatus.progress_percent || 0}%` }}
                      />
                    </div>
                    <p className="text-slate-400 text-sm">
                      Epoch {trainingStatus.current_epoch} / {trainingStatus.total_epochs}
                    </p>
                    {trainingStatus.metrics?.loss && (
                      <p className="text-slate-500 text-xs">
                        Loss: {trainingStatus.metrics.loss.toFixed(4)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className={
                        trainingStatus?.status === 'completed' ? 'text-green-400' :
                        trainingStatus?.status === 'failed' ? 'text-red-400' :
                        'text-slate-400'
                      }>
                        {trainingStatus?.status === 'completed' ? '✓ Abgeschlossen' :
                         trainingStatus?.status === 'failed' ? '✗ Fehlgeschlagen' :
                         'Bereit'}
                      </span>
                    </div>
                    {trainingStatus?.finished_at && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Beendet:</span>
                        <span className="text-slate-200">
                          {new Date(trainingStatus.finished_at).toLocaleString('de-CH')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Model Info Card */}
              <div className="card">
                <div className="flex items-center gap-3 mb-3">
                  <BarChart3 className="text-amber-400" size={24} />
                  <h2 className="text-lg font-semibold text-slate-200">Modell Info</h2>
                </div>
                
                {modelInfo?.model_available ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className="text-green-400 flex items-center gap-1">
                        <CheckCircle size={14} /> Verfügbar
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Grösse:</span>
                      <span className="text-slate-200">{modelInfo.model_size_mb} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Aktualisiert:</span>
                      <span className="text-slate-200">
                        {new Date(modelInfo.last_modified).toLocaleDateString('de-CH')}
                      </span>
                    </div>
                    {modelInfo.classes && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <p className="text-xs text-slate-500 mb-1">Klassen:</p>
                        <div className="flex flex-wrap gap-1">
                          {modelInfo.classes.map(cls => (
                            <span key={cls} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                              {cls}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-500 text-sm">
                    <AlertCircle size={18} className="inline mr-2" />
                    Kein trainiertes Modell vorhanden
                  </div>
                )}
              </div>

              {/* Dataset Stats Card */}
              <div className="card">
                <div className="flex items-center gap-3 mb-3">
                  <Database className="text-amber-400" size={24} />
                  <h2 className="text-lg font-semibold text-slate-200">Dataset</h2>
                </div>
                
                {datasetStats ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Raw Images:</span>
                      <span className="text-slate-200">{datasetStats.raw_images}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Patches:</span>
                      <span className="text-slate-200">{datasetStats.patches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Annotationen:</span>
                      <span className="text-slate-200">{datasetStats.annotations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bounding Boxes:</span>
                      <span className="text-slate-200">{datasetStats.total_bboxes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Dataset bereit:</span>
                      <span className={datasetStats.output_dataset_ready ? 'text-green-400' : 'text-yellow-400'}>
                        {datasetStats.output_dataset_ready ? 'Ja' : 'Nein'}
                      </span>
                    </div>
                    
                    {/* Class Distribution */}
                    {datasetStats.class_distribution && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <p className="text-xs text-slate-500 mb-2">Klassenverteilung:</p>
                        <div className="grid grid-cols-4 gap-1 text-xs">
                          {Object.entries(datasetStats.class_distribution).map(([cls, count]) => (
                            <div key={cls} className="text-center">
                              <span className="text-slate-400">{cls}:</span>
                              <span className="text-slate-200 ml-1">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-500 text-sm">
                    <Loader2 className="animate-spin inline mr-2" size={16} />
                    Lade...
                  </div>
                )}
              </div>
            </div>

            {/* Training Configuration & Start */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="text-amber-400" size={24} />
                <h2 className="text-lg font-semibold text-slate-200">Training Konfiguration</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Epochs */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Epochen</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={trainingConfig.epochs}
                    onChange={(e) => setTrainingConfig(prev => ({ ...prev, epochs: parseInt(e.target.value) || 50 }))}
                    disabled={trainingStatus?.is_running}
                    className="form-input w-full"
                  />
                </div>
                
                {/* Batch Size */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Batch Size</label>
                  <select
                    value={trainingConfig.batchSize}
                    onChange={(e) => setTrainingConfig(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                    disabled={trainingStatus?.is_running}
                    className="form-input w-full"
                  >
                    <option value="4">4</option>
                    <option value="8">8</option>
                    <option value="16">16</option>
                    <option value="32">32</option>
                  </select>
                </div>
                
                {/* Model Architecture */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Modell Architektur</label>
                  <select
                    value={trainingConfig.modelArch}
                    onChange={(e) => setTrainingConfig(prev => ({ ...prev, modelArch: e.target.value }))}
                    disabled={trainingStatus?.is_running}
                    className="form-input w-full"
                  >
                    <option value="yolov8n.pt">YOLOv8 Nano (schnell)</option>
                    <option value="yolov8s.pt">YOLOv8 Small</option>
                    <option value="yolov8m.pt">YOLOv8 Medium</option>
                    <option value="yolov8l.pt">YOLOv8 Large (langsam)</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  variant="primary"
                  onClick={handleStartTraining}
                  disabled={trainingStatus?.is_running || !datasetStats?.output_dataset_ready}
                  className="flex items-center gap-2"
                >
                  {trainingStatus?.is_running ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Play size={18} />
                  )}
                  {trainingStatus?.is_running ? 'Training läuft...' : 'Training starten'}
                </Button>
                
                {!datasetStats?.output_dataset_ready && (
                  <span className="text-yellow-400 text-sm">
                    ⚠️ Dataset muss zuerst finalisiert werden
                  </span>
                )}
              </div>
            </div>

            {/* Archived Datasets - MIT SCROLLBAR */}
            {datasetStats?.archived_datasets?.length > 0 && (
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <Archive className="text-amber-400" size={24} />
                  <h2 className="text-lg font-semibold text-slate-200">
                    Archivierte Datasets ({datasetStats.archived_datasets.length})
                  </h2>
                </div>
                
                {/* SCROLLBARE LISTE - max-h-64 = 256px */}
                <div className="max-h-64 overflow-y-auto border border-slate-700 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-800">
                      <tr className="text-left text-slate-400 border-b border-slate-700">
                        <th className="p-3">Dateiname</th>
                        <th className="p-3">Grösse</th>
                        <th className="p-3">Erstellt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datasetStats.archived_datasets.map((archive, idx) => (
                        <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                          <td className="p-3 text-slate-300">{archive.filename}</td>
                          <td className="p-3 text-slate-400">{archive.size_mb} MB</td>
                          <td className="p-3 text-slate-400">
                            {new Date(archive.created).toLocaleString('de-CH')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}