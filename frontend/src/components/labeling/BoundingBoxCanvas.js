'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

// Handle size for resize detection
const HANDLE_SIZE = 8;

export default function BoundingBoxCanvas({
  image,
  grid,
  showGrid,
  boxes,
  setBoxes,
  classes,
  selectedClass  // NEU: Als prop statt document.getElementById
}) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);

  // Drag/Resize state
  const [dragState, setDragState] = useState(null);
  // dragState = { boxIndex, mode: 'move' | 'resize', handle: 'nw'|'ne'|'sw'|'se'|null, offsetX, offsetY }

  const [hoveredBox, setHoveredBox] = useState(null);
  const [cursor, setCursor] = useState('crosshair');

  // Mouse position for live preview
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Get box color
  const getBoxColor = (className) => {
    return classes.find(c => c.name === className)?.color || "#ff0000";
  };

  // Check if point is near a resize handle
  const getResizeHandle = (box, x, y) => {
    const [bx, by, bw, bh] = box.bbox;
    const handles = {
      'nw': { x: bx, y: by },
      'ne': { x: bx + bw, y: by },
      'sw': { x: bx, y: by + bh },
      'se': { x: bx + bw, y: by + bh }
    };

    for (const [name, pos] of Object.entries(handles)) {
      if (Math.abs(x - pos.x) < HANDLE_SIZE && Math.abs(y - pos.y) < HANDLE_SIZE) {
        return name;
      }
    }
    return null;
  };

  // Check if point is inside a box
  const getBoxAtPoint = (x, y) => {
    for (let i = boxes.length - 1; i >= 0; i--) {
      const [bx, by, bw, bh] = boxes[i].bbox;
      if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
        return i;
      }
    }
    return -1;
  };

  // Draw everything
  const draw = useCallback(() => {
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

      if (grid.patch_lat_lines) {
        grid.patch_lat_lines.forEach(line => {
          ctx.beginPath();
          line.points.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.stroke();
        });
      }

      if (grid.patch_lon_lines) {
        grid.patch_lon_lines.forEach(line => {
          ctx.beginPath();
          line.points.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.stroke();
        });
      }
    }

    // Draw bounding boxes
    boxes.forEach((b, idx) => {
      const color = getBoxColor(b.class);
      const isHovered = idx === hoveredBox;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.strokeRect(b.bbox[0], b.bbox[1], b.bbox[2], b.bbox[3]);

      // Draw label
      ctx.fillStyle = color + "cc";
      ctx.font = "14px sans-serif";
      const label = b.confidence 
        ? `${b.class} (${(b.confidence * 100).toFixed(0)}%)`
        : b.class;
      ctx.fillText(label, b.bbox[0] + 4, b.bbox[1] - 6);

      // Draw resize handles if hovered
      if (isHovered) {
        const [bx, by, bw, bh] = b.bbox;
        ctx.fillStyle = color;
        
        // Corner handles
        const handles = [
          [bx, by],
          [bx + bw, by],
          [bx, by + bh],
          [bx + bw, by + bh]
        ];
        
        handles.forEach(([hx, hy]) => {
          ctx.fillRect(
            hx - HANDLE_SIZE/2, 
            hy - HANDLE_SIZE/2, 
            HANDLE_SIZE, 
            HANDLE_SIZE
          );
        });
      }
    });

    // Draw preview rectangle while drawing
    if (isDrawing && startPoint) {
      const x = Math.min(startPoint.x, lastPosRef.current.x);
      const y = Math.min(startPoint.y, lastPosRef.current.y);
      const w = Math.abs(startPoint.x - lastPosRef.current.x);
      const h = Math.abs(startPoint.y - lastPosRef.current.y);

      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  }, [image, grid, boxes, showGrid, classes, hoveredBox, isDrawing, startPoint]);

  // Redraw on changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Get mouse position relative to canvas
  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Mouse down handler
  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    const { x, y } = pos;

    // Check for resize handle first
    for (let i = boxes.length - 1; i >= 0; i--) {
      const handle = getResizeHandle(boxes[i], x, y);
      if (handle) {
        setDragState({
          boxIndex: i,
          mode: 'resize',
          handle,
          startBox: [...boxes[i].bbox],
          startX: x,
          startY: y
        });
        return;
      }
    }

    // Check if clicking inside a box (for moving)
    const boxIndex = getBoxAtPoint(x, y);
    if (boxIndex >= 0) {
      const box = boxes[boxIndex];
      setDragState({
        boxIndex,
        mode: 'move',
        handle: null,
        offsetX: x - box.bbox[0],
        offsetY: y - box.bbox[1],
        startBox: [...box.bbox]
      });
      return;
    }

    // Otherwise start drawing new box
    if (!selectedClass) {
      alert("Please select a class first");
      return;
    }

    setIsDrawing(true);
    setStartPoint({ x, y, className: selectedClass });
    lastPosRef.current = { x, y };
  };

  // Mouse move handler
  const handleMouseMove = (e) => {
    const pos = getMousePos(e);
    const { x, y } = pos;
    lastPosRef.current = { x, y };

    // Handle dragging/resizing
    if (dragState) {
      const { boxIndex, mode, handle, offsetX, offsetY, startBox, startX, startY } = dragState;
      const newBoxes = [...boxes];
      const box = { ...newBoxes[boxIndex] };

      if (mode === 'move') {
        box.bbox = [
          x - offsetX,
          y - offsetY,
          box.bbox[2],
          box.bbox[3]
        ];
      } else if (mode === 'resize') {
        const dx = x - startX;
        const dy = y - startY;
        let [bx, by, bw, bh] = startBox;

        switch (handle) {
          case 'nw':
            bx += dx;
            by += dy;
            bw -= dx;
            bh -= dy;
            break;
          case 'ne':
            by += dy;
            bw += dx;
            bh -= dy;
            break;
          case 'sw':
            bx += dx;
            bw -= dx;
            bh += dy;
            break;
          case 'se':
            bw += dx;
            bh += dy;
            break;
        }

        // Ensure minimum size
        if (bw >= 10 && bh >= 10) {
          box.bbox = [bx, by, bw, bh];
        }
      }

      // Remove confidence when manually edited
      delete box.confidence;
      newBoxes[boxIndex] = box;
      setBoxes(newBoxes);
      draw();
      return;
    }

    // Handle drawing preview
    if (isDrawing) {
      draw();
      return;
    }

    // Update cursor and hover state
    let newCursor = 'crosshair';
    let newHoveredBox = null;

    // Check for resize handles
    for (let i = boxes.length - 1; i >= 0; i--) {
      const handle = getResizeHandle(boxes[i], x, y);
      if (handle) {
        if (handle === 'nw' || handle === 'se') newCursor = 'nwse-resize';
        else newCursor = 'nesw-resize';
        newHoveredBox = i;
        break;
      }
    }

    // Check if hovering over a box
    if (newHoveredBox === null) {
      const boxIndex = getBoxAtPoint(x, y);
      if (boxIndex >= 0) {
        newCursor = 'move';
        newHoveredBox = boxIndex;
      }
    }

    setCursor(newCursor);
    if (newHoveredBox !== hoveredBox) {
      setHoveredBox(newHoveredBox);
    }
  };

  // Mouse up handler
  const handleMouseUp = () => {
    if (dragState) {
      setDragState(null);
      return;
    }

    if (!isDrawing || !startPoint) return;

    setIsDrawing(false);

    const x = Math.min(startPoint.x, lastPosRef.current.x);
    const y = Math.min(startPoint.y, lastPosRef.current.y);
    const w = Math.abs(startPoint.x - lastPosRef.current.x);
    const h = Math.abs(startPoint.y - lastPosRef.current.y);

    // Minimum size check
    if (w < 10 || h < 10) {
      setStartPoint(null);
      return;
    }

    // Add new box
    setBoxes(prev => [
      ...prev,
      { class: startPoint.className, bbox: [x, y, w, h] }
    ]);
    setStartPoint(null);
  };

  // Mouse leave handler
  const handleMouseLeave = () => {
    setHoveredBox(null);
    setCursor('crosshair');
  };

  return (
    <div className="w-full flex justify-center">
      <div className="relative">
        <img
          ref={imgRef}
          src={image}
          alt="patch"
          className="hidden"
          onLoad={() => draw()}
        />

        <canvas
          ref={canvasRef}
          className="rounded border border-slate-700 shadow-lg"
          style={{ cursor }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </div>
    </div>
  );
}