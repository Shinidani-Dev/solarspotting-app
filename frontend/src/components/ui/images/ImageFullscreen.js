'use client';

import { useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

/**
 * ImageFullscreen Component
 * 
 * Displays an image with the ability to toggle fullscreen mode
 * 
 * Props:
 * - src: string (required) - Image URL
 * - alt: string - Alt text for the image
 * - className: string - Additional CSS classes for the image container
 */
export default function ImageFullscreen({ src, alt = 'Image', className = '' }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <>
      {/* Normal View */}
      <div className={`relative group ${className}`}>
        <img 
          src={src} 
          alt={alt}
          className="w-full h-auto border rounded-lg border-slate-700"
        />
        
        {/* Fullscreen Button (appears on hover) */}
        <button
          onClick={toggleFullscreen}
          className="absolute p-2 transition-opacity duration-200 border rounded-md opacity-0 top-2 right-2 bg-slate-900/80 hover:bg-slate-800 text-amber-400 group-hover:opacity-100 border-slate-700"
          aria-label="Toggle fullscreen"
        >
          <Maximize2 size={20} />
        </button>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95"
          onClick={toggleFullscreen}
        >
          <div className="relative flex items-center justify-center w-full h-full">
            {/* Close Button */}
            <button
              onClick={toggleFullscreen}
              className="absolute z-10 p-2 border rounded-md top-4 right-4 bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700"
              aria-label="Close fullscreen"
            >
              <X size={24} />
            </button>

            {/* Minimize Button */}
            <button
              onClick={toggleFullscreen}
              className="absolute z-10 p-2 border rounded-md top-4 right-16 bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700"
              aria-label="Exit fullscreen"
            >
              <Minimize2 size={24} />
            </button>

            {/* Fullscreen Image */}
            <img 
              src={src} 
              alt={alt}
              className="object-contain max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Image Info */}
            <div className="absolute px-4 py-2 border rounded-md bottom-4 left-4 bg-slate-900/80 border-slate-700">
              <p className="text-sm text-slate-300">{alt}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}