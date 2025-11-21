'use client';

import { useState, useRef, useEffect } from 'react';
import { Grid as GridIcon, EyeOff as GridOffIcon } from "lucide-react";
import Button from '@/components/ui/buttons/Button';

export default function OriginalImageViewer({ data }) {
  const [showGrid, setShowGrid] = useState(false);
  const imgRef = useRef(null);
  const [renderSize, setRenderSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!imgRef.current) return;

    const updateSize = () => {
      // Null-Check hinzugefügt!
      if (!imgRef.current) return;
      
      setRenderSize({
        width: imgRef.current.clientWidth,
        height: imgRef.current.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      // Null-Check auch hier!
      if (imgRef.current) {
        updateSize();
      }
    });
    
    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  if (!data) {
    return (
      <div className="p-6 mb-6 text-center card text-slate-400">
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
    <div className="p-6 mb-6 card">

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-amber-400">Originalbild</h2>

        <Button
          variant="secondary"
          onClick={() => setShowGrid((s) => !s)}
        >
          {showGrid ? <GridOffIcon size={18} className="mr-2" /> : <GridIcon size={18} className="mr-2" />}
          {showGrid ? 'Grid ausblenden' : 'Grid einblenden'}
        </Button>
      </div>

      <div className="mb-4 space-y-1 text-sm text-slate-400">
        <p>
          <span className="text-slate-500">Filename:</span>{' '}
          <span className="font-mono text-slate-200">{file_name}</span>
        </p>
        <p>
          <span className="text-slate-500">Datum:</span>{' '}
          <span className="text-slate-200">{metadata.date}</span>
        </p>
        <p>
          <span className="text-slate-500">Uhrzeit:</span>{' '}
          <span className="text-slate-200">{metadata.time}</span>
        </p>
      </div>

      <div className="relative w-full max-w-3xl mx-auto">

        <img
          ref={imgRef}
          src={imgSrc}
          className="w-full border-2 rounded-lg shadow-lg border-slate-700"
          alt="Original Sun"
          onLoad={() => {
            // Update size when image is loaded
            if (imgRef.current) {
              setRenderSize({
                width: imgRef.current.clientWidth,
                height: imgRef.current.clientHeight,
              });
            }
          }}
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
                      strokeWidth="2"
                      points={line.points.map(p => `${p.px},${p.py}`).join(' ')}
                    />
                  ))}

                  {lon_lines.map((line, idx) => (
                    <polyline
                      key={`lon-${idx}`}
                      fill="none"
                      stroke="rgba(74,80,255,0.5)"
                      strokeWidth="2"
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