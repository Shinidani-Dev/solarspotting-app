'use client';

import { useState } from 'react';
import ImageFullscreen from '@/components/ui/images/ImageFullscreen';
import { MapPin, Image as ImageIcon } from 'lucide-react';

/**
 * PatchesDisplay Component
 * 
 * Displays patches with their information (center coordinates, etc.)
 * and allows viewing patch images in fullscreen
 * 
 * Props:
 * - patches: array (required) - Array of patch objects with the following structure:
 *   {
 *     id: number,
 *     image_url: string,
 *     center_x: number,
 *     center_y: number,
 *     width: number,
 *     height: number,
 *     confidence: number (optional),
 *     label: string (optional)
 *   }
 * - title: string - Title for the patches section
 * - className: string - Additional CSS classes
 */
export default function PatchesDisplay({ 
  patches = [], 
  title = 'Detected Patches',
  className = '' 
}) {
  if (!patches || patches.length === 0) {
    return (
      <div className={`p-6 bg-slate-800 border border-slate-700 rounded-lg ${className}`}>
        <h2 className="mb-4 text-xl font-semibold text-amber-400">{title}</h2>
        <p className="text-slate-400">No patches detected</p>
      </div>
    );
  }

  return (
    <div className={`p-6 bg-slate-800 border border-slate-700 rounded-lg ${className}`}>
      <h2 className="mb-6 text-xl font-semibold text-amber-400">{title}</h2>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {patches.map((patch, index) => (
          <PatchCard key={patch.id || index} patch={patch} index={index} />
        ))}
      </div>
      
      {/* Summary Info */}
      <div className="pt-6 mt-6 border-t border-slate-700">
        <p className="text-slate-400">
          Total patches detected: <span className="font-semibold text-amber-400">{patches.length}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * PatchCard Component
 * 
 * Individual patch card displaying image and information
 */
function PatchCard({ patch, index }) {
  return (
    <div className="overflow-hidden transition-colors duration-200 border rounded-lg bg-slate-900/50 border-slate-700 hover:border-amber-500/50">
      {/* Patch Image */}
      <div className="aspect-square bg-slate-950">
        <ImageFullscreen 
          src={patch.image_url} 
          alt={`Patch ${index + 1}${patch.label ? ` - ${patch.label}` : ''}`}
          className="w-full h-full"
        />
      </div>
      
      {/* Patch Information */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-200">
            Patch #{index + 1}
          </h3>
          {patch.label && (
            <span className="px-2 py-1 text-xs border rounded-full bg-amber-500/20 text-amber-400 border-amber-500/30">
              {patch.label}
            </span>
          )}
        </div>
        
        {/* Center Coordinates */}
        <div className="space-y-1">
          <div className="flex items-center text-sm text-slate-400">
            <MapPin size={14} className="mr-2" />
            <span className="font-medium">Center Coordinates:</span>
          </div>
          <div className="pl-6 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">X:</span>
              <span className="font-mono text-slate-200">
                {patch.center_x?.toFixed(2) ?? 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Y:</span>
              <span className="font-mono text-slate-200">
                {patch.center_y?.toFixed(2) ?? 'N/A'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Dimensions */}
        <div className="space-y-1">
          <div className="flex items-center text-sm text-slate-400">
            <ImageIcon size={14} className="mr-2" />
            <span className="font-medium">Dimensions:</span>
          </div>
          <div className="pl-6 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Width:</span>
              <span className="font-mono text-slate-200">
                {patch.width?.toFixed(0) ?? 'N/A'} px
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Height:</span>
              <span className="font-mono text-slate-200">
                {patch.height?.toFixed(0) ?? 'N/A'} px
              </span>
            </div>
          </div>
        </div>
        
        {/* Confidence Score (if available) */}
        {patch.confidence !== undefined && (
          <div className="pt-2 border-t border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Confidence:</span>
              <span className={`font-semibold ${
                patch.confidence >= 0.8 ? 'text-green-400' :
                patch.confidence >= 0.6 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {(patch.confidence * 100).toFixed(1)}%
              </span>
            </div>
            {/* Confidence Bar */}
            <div className="w-full h-2 mt-2 rounded-full bg-slate-700">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  patch.confidence >= 0.8 ? 'bg-green-500' :
                  patch.confidence >= 0.6 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${patch.confidence * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}