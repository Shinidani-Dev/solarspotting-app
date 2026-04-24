'use client';

import { useState } from 'react';
import { X, Maximize2, Minimize2, Eye, EyeOff } from 'lucide-react';

export default function ImageFullscreen({ src, alt = 'Image', className = '', overlay = null, overlayOpacity = 0.5 }) {
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const [showOverlay,   setShowOverlay]   = useState(true);
  const [localOpacity,  setLocalOpacity]  = useState(overlayOpacity);

  return (
    <>
      {/* Thumbnail */}
      <div className={`relative group ${className}`}>
        <img
          src={src}
          alt={alt}
          className="w-full h-auto border rounded-lg border-slate-700"
        />
        {overlay && (
          <img
            src={overlay}
            alt={`${alt} overlay`}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none rounded-lg"
            style={{ opacity: overlayOpacity }}
          />
        )}
        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute p-2 transition-opacity duration-200 border rounded-md opacity-0 top-2 right-2 bg-slate-900/80 hover:bg-slate-800 text-amber-400 group-hover:opacity-100 border-slate-700"
          aria-label="Open fullscreen"
        >
          <Maximize2 size={20} />
        </button>
      </div>

      {/* Fullscreen modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-6 bg-black/95"
          onClick={() => setIsFullscreen(false)}
        >
          {/* Top-right close buttons */}
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 border rounded-md bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700"
              aria-label="Exit fullscreen"
            >
              <Minimize2 size={22} />
            </button>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 border rounded-md bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>

          {/* Image (stops click-through to backdrop) */}
          <div
            className="relative flex-shrink-0"
            style={{ maxWidth: '90vw', maxHeight: overlay ? '78vh' : '88vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={src}
              alt={alt}
              className="object-contain rounded-lg"
              style={{ maxWidth: '90vw', maxHeight: overlay ? '78vh' : '88vh' }}
            />
            {overlay && showOverlay && (
              <img
                src={overlay}
                alt={`${alt} overlay`}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none rounded-lg"
                style={{ opacity: localOpacity }}
              />
            )}
          </div>

          {/* Mask controls (only when overlay exists) */}
          {overlay && (
            <div
              className="flex items-center gap-5 px-5 py-3 border rounded-xl bg-slate-900/90 border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowOverlay((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700"
              >
                {showOverlay ? <EyeOff size={16} /> : <Eye size={16} />}
                {showOverlay ? 'Hide Mask' : 'Show Mask'}
              </button>

              <label className="flex items-center gap-3 text-xs text-slate-400">
                Opacity&nbsp;({localOpacity.toFixed(2)})
                <input
                  type="range"
                  min="0" max="1" step="0.05"
                  value={localOpacity}
                  onChange={(e) => setLocalOpacity(parseFloat(e.target.value))}
                  className="w-36 accent-amber-400"
                  disabled={!showOverlay}
                />
              </label>
            </div>
          )}

          {/* Label */}
          <div className="absolute bottom-4 left-4 px-4 py-2 border rounded-md bg-slate-900/80 border-slate-700">
            <p className="text-sm text-slate-300">{alt}</p>
          </div>
        </div>
      )}
    </>
  );
}
