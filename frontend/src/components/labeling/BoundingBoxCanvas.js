'use client';

import { useRef, useEffect, useState } from 'react';

export default function BoundingBoxCanvas({
  image,
  grid,
  showGrid,
  boxes,
  setBoxes,
  classes,
  selectedClass
}) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);

  const [startPoint, setStartPoint] = useState(null);

  // Draw loop
  useEffect(() => {
    if (!canvasRef.current || !imgRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;

    canvas.width = img.width;
    canvas.height = img.height;

    // Draw Image
    ctx.drawImage(img, 0, 0);

    // Grid
    if (showGrid && grid) {
      ctx.strokeStyle = "rgba(74,80,255,0.5)";
      ctx.lineWidth = 1;

      grid.patch_lat_lines.forEach(line => {
        ctx.beginPath();
        line.points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      });

      grid.patch_lon_lines.forEach(line => {
        ctx.beginPath();
        line.points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      });
    }

    // Draw bounding boxes
    boxes.forEach((b, idx) => {
      const color = classes.find(c => c.name === b.class)?.color || "#ff0000";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(b.bbox[0], b.bbox[1], b.bbox[2], b.bbox[3]);

      // draw label
      ctx.fillStyle = color + "cc";
      ctx.font = "14px sans-serif";
      ctx.fillText(b.class, b.bbox[0] + 4, b.bbox[1] - 6);
    });

  }, [image, grid, boxes, showGrid, classes]);

  // Mouse events
  const handleMouseDown = (e) => {
    if (!selectedClass) {
      alert("Bitte zuerst eine Klasse auswählen!");
      return;
    }

    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setStartPoint({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      className: selectedClass
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !startPoint) return;

    setIsDrawing(false);

    const rect = canvasRef.current.getBoundingClientRect();
    const endX = lastX;
    const endY = lastY;

    const x = Math.min(startPoint.x, endX);
    const y = Math.min(startPoint.y, endY);
    const w = Math.abs(startPoint.x - endX);
    const h = Math.abs(startPoint.y - endY);

    if (w < 5 || h < 5) return;

    // add new box
    setBoxes(prev => [
      ...prev,
      { class: startPoint.className, bbox: [x, y, w, h] }
    ]);
  };

  let lastX = 0;
  let lastY = 0;

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const rect = canvasRef.current.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;

    // preview drawing
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;

    ctx.drawImage(img, 0, 0);

    // redraw grid
    if (showGrid && grid) {
      ctx.strokeStyle = "rgba(74,80,255,0.5)";
      ctx.lineWidth = 1;

      grid.patch_lat_lines.forEach(line => {
        ctx.beginPath();
        line.points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      });

      grid.patch_lon_lines.forEach(line => {
        ctx.beginPath();
        line.points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      });
    }

    // existing boxes
    boxes.forEach(b => {
      const color = classes.find(c => c.name === b.class)?.color || "#ff0000";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(b.bbox[0], b.bbox[1], b.bbox[2], b.bbox[3]);
    });

    // draw preview
    const x = Math.min(startPoint.x, lastX);
    const y = Math.min(startPoint.y, lastY);
    const w = Math.abs(startPoint.x - lastX);
    const h = Math.abs(startPoint.y - lastY);

    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
  };

  return (
    <div className="flex justify-center w-full">
      <div className="relative">
        <img
          ref={imgRef}
          src={image}
          alt="patch"
          className="hidden"
          onLoad={() => canvasRef.current && canvasRef.current.getContext("2d")}
        />

        <canvas
          ref={canvasRef}
          className="border rounded shadow-lg border-slate-700 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        />
      </div>
    </div>
  );
}
