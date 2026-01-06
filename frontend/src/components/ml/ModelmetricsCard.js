/**
 * ModelMetricsCard.js
 * 
 * Zeigt die Model-Metriken (mAP, AP pro Klasse) auf der ML-Training Page an.
 * 
 * Integration in die bestehende page.js:
 * 1. Diese Komponente importieren
 * 2. Im Model Info Card Bereich einbinden
 * 
 * Die modelInfo Response enthält jetzt zusätzlich:
 * {
 *   ...
 *   "metrics": {
 *     "mAP50": 0.75,
 *     "mAP50_95": 0.45,
 *     "ap_per_class": {
 *       "A": 0.82,
 *       "B": 0.71,
 *       ...
 *     },
 *     "extracted_at": "2025-01-06T..."
 *   }
 * }
 */

import { BarChart2, Target } from 'lucide-react';

/**
 * Kompakte Metrik-Anzeige für das Model Info Card
 */
export function ModelMetricsDisplay({ metrics }) {
  if (!metrics) {
    return (
      <p className="text-slate-500 text-sm mt-2">
        Keine Metriken verfügbar
      </p>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-700">
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 className="text-amber-400" size={16} />
        <span className="text-sm font-medium text-slate-300">Performance Metrics</span>
      </div>
      
      {/* mAP Scores */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">mAP@50</p>
          <p className="text-xl font-bold text-amber-400">
            {metrics.mAP50 !== null ? `${(metrics.mAP50 * 100).toFixed(1)}%` : '-'}
          </p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">mAP@50-95</p>
          <p className="text-xl font-bold text-slate-300">
            {metrics.mAP50_95 !== null ? `${(metrics.mAP50_95 * 100).toFixed(1)}%` : '-'}
          </p>
        </div>
      </div>

      {/* Per-Class AP */}
      {metrics.ap_per_class && Object.keys(metrics.ap_per_class).length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">AP per Class (IoU=0.5)</p>
          <div className="space-y-2">
            {Object.entries(metrics.ap_per_class).map(([className, ap]) => (
              <div key={className} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-6">{className}</span>
                <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${ap * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-300 w-12 text-right">
                  {(ap * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extraction timestamp */}
      {metrics.extracted_at && (
        <p className="text-xs text-slate-600 mt-3">
          Extracted: {new Date(metrics.extracted_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

/**
 * Standalone Card für Model Metriken
 */
export function ModelMetricsCard({ modelInfo }) {
  if (!modelInfo?.model_available) {
    return null;
  }

  const metrics = modelInfo.metrics;

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-3">
        <Target className="text-amber-400" size={24} />
        <h2 className="text-lg font-semibold text-slate-200">Model Performance</h2>
      </div>

      {metrics ? (
        <>
          {/* Main mAP Display */}
          <div className="text-center py-4">
            <p className="text-sm text-slate-500 mb-1">Mean Average Precision</p>
            <p className="text-4xl font-bold text-amber-400">
              {metrics.mAP50 !== null ? `${(metrics.mAP50 * 100).toFixed(1)}%` : '-'}
            </p>
            <p className="text-xs text-slate-600 mt-1">@ IoU=0.5</p>
          </div>

          {/* Secondary mAP */}
          <div className="bg-slate-900/30 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">mAP@50-95</span>
              <span className="text-lg font-semibold text-slate-300">
                {metrics.mAP50_95 !== null ? `${(metrics.mAP50_95 * 100).toFixed(1)}%` : '-'}
              </span>
            </div>
          </div>

          {/* Per-Class Breakdown */}
          {metrics.ap_per_class && Object.keys(metrics.ap_per_class).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">
                Average Precision per Class
              </h3>
              <div className="space-y-2">
                {Object.entries(metrics.ap_per_class)
                  .sort((a, b) => b[1] - a[1]) // Sort by AP descending
                  .map(([className, ap]) => (
                    <div key={className} className="flex items-center gap-3">
                      <span className="text-sm font-mono text-amber-400 w-8">
                        {className}
                      </span>
                      <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${ap * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-300 w-14 text-right font-medium">
                        {(ap * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-slate-500 text-center py-4">
          Keine Metriken verfügbar. Trainieren Sie zuerst ein Modell.
        </p>
      )}
    </div>
  );
}

export default ModelMetricsCard;