'use client';

import { useState, useRef, useEffect } from 'react';
import { Grid, Grid as GridIcon, EyeOff as GridOffIcon } from "lucide-react";

export default function OriginalImageViewer({ data }) {
  const [showGrid, setShowGrid] = useState(false);
  const imgRef = useRef(null);
  const [renderSize, setRenderSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!imgRef.current) return;

    const updateSize = () => {
      setRenderSize({
        width: imgRef.current.clientWidth,
        height: imgRef.current.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  if (!data) {
    return (
      <div className="card p-6 mb-6 text-slate-400">
        Kein Bild geladen…
      </div>
    );
  }

  const base64 = data.image_base64;
  const imgSrc = `data:image/jpeg;base64,${base64}`;
  const grid = data.global_grid;
  const { file_name, metadata } = data;

  const { lat_lines, lon_lines, image_shape } = grid;

  const originalWidth = image_shape?.[1] || 2048;
  const originalHeight = image_shape?.[0] || 2048;

  return (
    <div className="card p-6 mb-6">

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-amber-400">Originalbild</h2>

        <button
          className="btn-secondary flex items-center gap-2"
          onClick={() => setShowGrid((s) => !s)}
        >
          {showGrid ? <GridOffIcon size={18} /> : <GridIcon size={18} />}
          {showGrid ? 'Grid ausblenden' : 'Grid einblenden'}
        </button>
      </div>

      <div className="text-slate-400 text-sm mb-4">
        <p>Filename: <span className="text-slate-200">{file_name}</span></p>
        <p>Datum: <span className="text-slate-200">{metadata.date}</span></p>
        <p>Uhrzeit: <span className="text-slate-200">{metadata.time}</span></p>
      </div>

      <div className="relative w-full max-w-3xl mx-auto">

        <img
          ref={imgRef}
          src={imgSrc}
          className="rounded border border-slate-700 shadow-lg w-full"
          alt="Original Sun"
        />

        {showGrid && renderSize.width > 0 && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={renderSize.width}
                height={renderSize.height}
                style={{ zIndex: 10 }}
              >
                <g
                  transform={`scale(${renderSize.width / originalWidth}, ${renderSize.height / originalHeight})`}
                >
                  {lat_lines.map((line, idx) => (
                    <polyline
                      key={`lat-${idx}`}
                      fill="none"
                      stroke="rgba(74,80,255,0.5)"
                      strokeWidth="1"
                      points={line.points.map(p => `${p.px},${p.py}`).join(' ')}
                    />
                  ))}

                  {lon_lines.map((line, idx) => (
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
    </div>
  );
}
