'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Heading from '@/components/ui/texts/Heading';
import Card from '@/components/ui/cards/Card';
import Button from '@/components/ui/buttons/Button';
import ImageFullscreen from '@/components/ui/images/ImageFullscreen';
import { detectCircle, computeProfile } from '@/api/protuberancesService';

// ─── resize helper ────────────────────────────────────────────────────────────

function resizeTo4k(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const c = document.createElement('canvas');
      c.width = c.height = 4096;
      c.getContext('2d').drawImage(img, 0, 0, 4096, 4096);
      c.toBlob(
        (blob) => resolve(new File([blob], file.name, { type: 'image/png' })),
        'image/png',
      );
    };
    img.src = url;
  });
}

// ─── canvas drawing ───────────────────────────────────────────────────────────

/**
 * Draw the image + ellipse overlay onto the canvas.
 *
 * Zoom works by narrowing the viewport in 2048-space so the circle center
 * always appears at the canvas centre.  The image (4096×4096) is drawn
 * into the full canvas via drawImage cropping — no CSS transforms needed.
 *
 * Solar PA convention (clockwise from North):
 *   0° = N (top, −Y)   90° = W (right, +X)
 *   180° = S (bottom)  270° = E (left, −X)
 */
function drawCanvas(canvas, img, cx, cy, rx, ry, rExt, lineWidth, zoom) {
  const W = canvas.width;
  const H = canvas.height;
  if (!W || !H) return;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Dark background (shown when view extends past image border)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, H);

  // ── image ──────────────────────────────────────────────────────────────────
  if (img?.complete && img?.naturalWidth) {
    // Viewport in 2048-server-space, centred on (cx, cy)
    const viewSize = 2048 / zoom;
    const vx = cx - viewSize / 2;
    const vy = cy - viewSize / 2;

    // img is 4096×4096 → imgScale = 2  (server coord × 2 = image pixel)
    const imgScale = img.naturalWidth / 2048;
    const srcX = vx * imgScale;
    const srcY = vy * imgScale;
    const srcW = viewSize * imgScale;
    const srcH = viewSize * imgScale;

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, W, H);
  }

  // ── overlay ────────────────────────────────────────────────────────────────
  // At any zoom level the circle centre maps to (W/2, H/2).
  const sc  = W / (2048 / zoom);   // canvas pixels per server unit
  const ccx = W / 2;
  const ccy = H / 2;
  const srx = rx  * sc;
  const sry = ry  * sc;
  const sox = (rx + rExt) * sc;
  const soy = (ry + rExt) * sc;
  const lw  = Math.max(0.5, lineWidth);

  // Inner ellipse — disk boundary (green)
  ctx.strokeStyle = 'rgba(0,255,100,0.9)';
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(ccx, ccy, Math.max(1, srx), Math.max(1, sry), 0, 0, 2 * Math.PI);
  ctx.stroke();

  // Outer ellipse — search band (blue)
  ctx.strokeStyle = 'rgba(0,180,255,0.65)';
  ctx.lineWidth = Math.max(0.5, lw * 0.6);
  ctx.beginPath();
  ctx.ellipse(ccx, ccy, Math.max(1, sox), Math.max(1, soy), 0, 0, 2 * Math.PI);
  ctx.stroke();

  // Compass ticks + labels
  // N=top(−Y)  W=right(+X)  S=bottom(+Y)  E=left(−X)
  const ticks = [
    { l: 'N', ix: ccx,       iy: ccy - sry, ox: ccx,       oy: ccy - soy },
    { l: 'W', ix: ccx + srx, iy: ccy,       ox: ccx + sox, oy: ccy       },
    { l: 'S', ix: ccx,       iy: ccy + sry, ox: ccx,       oy: ccy + soy },
    { l: 'E', ix: ccx - srx, iy: ccy,       ox: ccx - sox, oy: ccy       },
  ];
  const lblGap = Math.max(10, sc * 8);
  const lblPos = [
    { lx: ccx,             ly: ccy - soy - lblGap },
    { lx: ccx + sox + lblGap, ly: ccy             },
    { lx: ccx,             ly: ccy + soy + lblGap },
    { lx: ccx - sox - lblGap, ly: ccy             },
  ];

  const fs = Math.max(10, Math.min(22, sc * 9));
  ctx.font         = `bold ${fs}px monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth    = Math.max(0.5, lw * 0.5);

  ticks.forEach(({ l, ix, iy, ox, oy }, i) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(ox, oy);
    ctx.stroke();

    const { lx, ly } = lblPos[i];
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(l, lx + 1, ly + 1);
    ctx.fillStyle = 'white';
    ctx.fillText(l, lx, ly);
  });

  // Centre crosshair
  const arm = Math.max(4, (srx + sry) / 2 / 20);
  ctx.strokeStyle = 'rgba(0,220,255,0.9)';
  ctx.lineWidth   = Math.max(0.5, lw * 0.8);
  ctx.beginPath();
  ctx.moveTo(ccx - arm, ccy); ctx.lineTo(ccx + arm, ccy);
  ctx.moveTo(ccx, ccy - arm); ctx.lineTo(ccx, ccy + arm);
  ctx.stroke();

  ctx.fillStyle = 'rgba(0,220,255,0.9)';
  ctx.beginPath();
  ctx.arc(ccx, ccy, Math.max(2, sc * 2), 0, 2 * Math.PI);
  ctx.fill();
}

// ─── small reusable components ────────────────────────────────────────────────

function Nudge({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-1.5 py-0.5 text-xs font-mono rounded border border-slate-600
                 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white
                 active:scale-95 select-none"
    >
      {label}
    </button>
  );
}

function NudgeRow({ label, value, onDelta, step = [10, 5, 1, 0.5] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="w-8 text-right text-xs text-slate-400 font-mono shrink-0">{label}</span>
      {step.map((d) => (
        <Nudge key={`-${d}`} label={d < 1 ? '−½' : `−${d}`} onClick={() => onDelta(-d)} />
      ))}
      <input
        type="number"
        step={step[step.length - 1]}
        value={typeof value === 'number' ? (Number.isInteger(value) ? value : +value.toFixed(1)) : value}
        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onDelta(v - value); }}
        className="w-20 px-1.5 py-0.5 text-xs font-mono rounded bg-slate-900 border border-slate-700
                   text-slate-200 text-center"
      />
      {[...step].reverse().map((d) => (
        <Nudge key={`+${d}`} label={d < 1 ? '+½' : `+${d}`} onClick={() => onDelta(d)} />
      ))}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ProtuberancesPage() {
  const [originalUrl,    setOriginalUrl]    = useState(null);
  const [detection,      setDetection]      = useState(null);
  const [adjCx,          setAdjCx]          = useState(0);
  const [adjCy,          setAdjCy]          = useState(0);
  const [adjRx,          setAdjRx]          = useState(0);
  const [adjRy,          setAdjRy]          = useState(0);
  const [rExtension,     setRExtension]     = useState(80);
  const [lineWidth,      setLineWidth]      = useState(3);
  const [zoom,           setZoom]           = useState(1);
  const [imageReady,     setImageReady]     = useState(false);
  const [result,         setResult]         = useState(null);
  const [loadingDetect,  setLoadingDetect]  = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error,          setError]          = useState(null);

  const fileRef      = useRef(null);
  const resizedRef   = useRef(null);
  const imageRef     = useRef(null);    // loaded HTMLImageElement
  const containerRef = useRef(null);   // canvas wrapper div
  const canvasRef    = useRef(null);

  // ── load image into imageRef when URL changes ────────────────────────────────
  useEffect(() => {
    if (!originalUrl) return;
    setImageReady(false);
    const img = new Image();
    img.onload  = () => { imageRef.current = img; setImageReady(true); };
    img.onerror = () => setError('Could not load image preview.');
    img.src = originalUrl;
  }, [originalUrl]);

  // ── redraw whenever any drawing parameter or zoom changes ────────────────────
  useEffect(() => {
    if (!imageReady || !detection || !canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas    = canvasRef.current;

    const redraw = () => {
      const W = container.offsetWidth;
      const H = container.offsetHeight || W;
      if (!W) return;
      canvas.width  = W;
      canvas.height = H;
      drawCanvas(canvas, imageRef.current, adjCx, adjCy, adjRx, adjRy, rExtension, lineWidth, zoom);
    };

    redraw();
    const ro = new ResizeObserver(redraw);
    ro.observe(container);
    return () => ro.disconnect();
  }, [imageReady, detection, adjCx, adjCy, adjRx, adjRy, rExtension, lineWidth, zoom]);

  // ── upload + auto-detect ─────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const raw = e.target.files[0];
    if (!raw) return;

    if (originalUrl) URL.revokeObjectURL(originalUrl);
    ['annotatedUrl', 'multiOtsuUrl', 'binarizedUrl'].forEach((k) => {
      if (result?.[k]) URL.revokeObjectURL(result[k]);
    });

    setResult(null);
    setDetection(null);
    setImageReady(false);
    setError(null);
    setZoom(1);
    setLoadingDetect(true);

    try {
      const resized = await resizeTo4k(raw);
      resizedRef.current = resized;
      setOriginalUrl(URL.createObjectURL(resized));

      const det = await detectCircle(resized);
      setDetection(det);
      setAdjCx(det.cx);
      setAdjCy(det.cy);
      setAdjRx(det.r);
      setAdjRy(det.r);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDetect(false);
    }
  };

  // ── compute profile ──────────────────────────────────────────────────────────
  const handleComputeProfile = async () => {
    if (!resizedRef.current || !detection) return;
    setLoadingProfile(true);
    setError(null);
    try {
      const data = await computeProfile(
        resizedRef.current, rExtension,
        adjCx, adjCy, adjRx, adjRy,
      );
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  const isAdjusted = detection && (
    adjCx !== detection.cx || adjCy !== detection.cy ||
    adjRx !== detection.r  || adjRy !== detection.r
  );
  const maxCount = result ? Math.max(...result.profile.map((p) => p.count), 1) : 1;

  return (
    <div className="space-y-5">
      <Heading>Protuberances</Heading>

      {/* ── Upload ───────────────────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="secondary" onClick={() => fileRef.current.click()} disabled={loadingDetect}>
            Upload Solar Image
          </Button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleUpload} />
          <span className="text-xs text-slate-500">JPG or PNG — resized to 4 K before sending</span>
          {loadingDetect && <span className="text-sm text-amber-400">Detecting sun disk…</span>}
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </Card>

      {/* ── Adjustment panel ─────────────────────────────────────────────────── */}
      {originalUrl && detection && (
        <Card>
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-500">
            Center &amp; Ellipse Adjustment
          </p>

          <div className="flex gap-6">

            {/* LEFT: canvas preview */}
            <div className="flex flex-col gap-2 shrink-0" style={{ width: 'min(58vw, 600px)' }}>
              <div
                ref={containerRef}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 overflow-hidden"
                style={{ aspectRatio: '1 / 1' }}
              >
                <canvas
                  ref={canvasRef}
                  style={{ display: 'block', width: '100%', height: '100%' }}
                />
              </div>

              {/* Zoom buttons */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 shrink-0">Zoom</span>
                {[1, 2, 4, 8, 16].map((z) => (
                  <button
                    key={z}
                    onClick={() => setZoom(z)}
                    className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                      zoom === z
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-slate-600 bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {z}×
                  </button>
                ))}
                <span className="text-xs text-slate-600">centres on circle</span>
              </div>
            </div>

            {/* RIGHT: controls */}
            <div className="flex-1 min-w-0 space-y-3">

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Position</p>
                <NudgeRow label="cx" value={adjCx} onDelta={(d) => setAdjCx((v) => v + d)} />
                <NudgeRow label="cy" value={adjCy} onDelta={(d) => setAdjCy((v) => v + d)} />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Ellipse</p>
                <NudgeRow
                  label="R↔↕"
                  value={+((adjRx + adjRy) / 2).toFixed(1)}
                  onDelta={(d) => { setAdjRx((v) => v + d); setAdjRy((v) => v + d); }}
                  step={[10, 5, 1, 0.5]}
                />
                <NudgeRow label="rx" value={adjRx} onDelta={(d) => setAdjRx((v) => v + d)} step={[5, 1, 0.5]} />
                <NudgeRow label="ry" value={adjRy} onDelta={(d) => setAdjRy((v) => v + d)} step={[5, 1, 0.5]} />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Appearance</p>
                <label className="flex flex-col gap-1 text-xs text-slate-400">
                  Circle thickness ({lineWidth} px)
                  <input type="range" min="1" max="12" step="0.5" value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))} className="w-36 accent-amber-400" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-400">
                  Search depth ({rExtension} px beyond limb)
                  <input type="range" min="20" max="300" step="10" value={rExtension}
                    onChange={(e) => setRExtension(Number(e.target.value))} className="w-36 accent-amber-400" />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
                <Button onClick={handleComputeProfile} disabled={loadingProfile}>
                  {loadingProfile ? 'Computing…' : 'Compute Profile'}
                </Button>
                {isAdjusted && (
                  <button
                    onClick={() => { setAdjCx(detection.cx); setAdjCy(detection.cy); setAdjRx(detection.r); setAdjRy(detection.r); }}
                    className="text-xs text-slate-500 hover:text-slate-300 underline"
                  >
                    Reset to detected
                  </button>
                )}
              </div>

            </div>
          </div>
        </Card>
      )}

      {/* ── Results ──────────────────────────────────────────────────────────── */}
      {result && (
        <Card>
          <div className="space-y-6">

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {[
                { label: 'cx',     value: result.cx.toFixed(1) },
                { label: 'cy',     value: result.cy.toFixed(1) },
                { label: 'rx',     value: result.rx.toFixed(1) },
                { label: 'ry',     value: result.ry.toFixed(1) },
                { label: 'rx out', value: result.rxOut.toFixed(1) },
                { label: 'ry out', value: result.ryOut.toFixed(1) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-lg font-mono font-semibold text-amber-400">{value}</p>
                  <p className="text-xs text-slate-600">px</p>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Images</p>
              <div className="flex gap-6 overflow-x-auto pb-2">
                <div className="flex-shrink-0 w-80 space-y-1">
                  <p className="text-xs text-slate-400">Annotated + compass</p>
                  <ImageFullscreen src={result.annotatedUrl} alt="Detected ellipse" />
                </div>
                <div className="flex-shrink-0 w-80 space-y-1">
                  <p className="text-xs text-slate-400">
                    Multi-Otsu —
                    <span className="text-slate-600"> ■</span> dark
                    <span className="text-amber-400"> ■</span> middle
                    <span className="text-slate-300"> ■</span> bright
                  </p>
                  <ImageFullscreen src={result.multiOtsuUrl} alt="Multi-Otsu" />
                </div>
                <div className="flex-shrink-0 w-80 space-y-1">
                  <p className="text-xs text-slate-400">Protuberance binary</p>
                  <ImageFullscreen src={result.binarizedUrl} alt="Binary" />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Profile — white px / degree &nbsp;(0°=N · 90°=W · 180°=S · 270°=E)
              </p>
              <div className="overflow-auto max-h-96 rounded-lg border border-slate-700">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-800 text-slate-400 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-2 text-left w-28">Degree</th>
                      <th className="px-4 py-2 text-right w-24">Px count</th>
                      <th className="px-4 py-2">Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.profile.map(({ degree, count }) => (
                      <tr key={degree} className="border-t border-slate-800 hover:bg-slate-800/40">
                        <td className="px-4 py-1 font-mono text-slate-300">{degree}°</td>
                        <td className="px-4 py-1 font-mono text-right text-amber-400">{count}</td>
                        <td className="px-4 py-1">
                          <div className="h-2 rounded-sm bg-amber-500/70"
                            style={{ width: `${(count / maxCount) * 100}%`, minWidth: count > 0 ? 2 : 0 }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </Card>
      )}
    </div>
  );
}
