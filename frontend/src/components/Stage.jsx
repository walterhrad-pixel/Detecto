import { useCallback, useEffect, useRef, useState } from "react";
import { clamp01, insideZone, normalizeRect } from "../lib/geometry";

const BOX = "#FF5A1F";
const ZONE = "#FFD400";

function sourceSize(el) {
  if (!el) return null;
  if (el instanceof HTMLVideoElement) return { w: el.videoWidth, h: el.videoHeight };
  return { w: el.naturalWidth, h: el.naturalHeight };
}

export default function Stage({ source, people, imageSize, showBoxes, zone, drawMode, onZoneChange, live, children }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const dragStart = useRef(null);
  const [wrapWidth, setWrapWidth] = useState(0);
  const [draft, setDraft] = useState(null);
  const latest = useRef({});
  latest.current = { source, people, imageSize, showBoxes, zone, draft };

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => setWrapWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const { source: src, people: list, imageSize: size, showBoxes: boxes, zone: z, draft: d } = latest.current;
    if (!canvas || !src) return;
    const dims = sourceSize(src.el);
    if (!dims || !dims.w) return;

    const dpr = window.devicePixelRatio || 1;
    const maxHeight = Math.min(window.innerHeight * 0.66, 700);
    const aspect = dims.w / dims.h;
    const cssW = Math.max(1, Math.min(wrapRef.current.clientWidth, maxHeight * aspect));
    const cssH = cssW / aspect;
    const pxW = Math.round(cssW * dpr);
    const pxH = Math.round(cssH * dpr);
    if (canvas.width !== pxW || canvas.height !== pxH) {
      canvas.width = pxW;
      canvas.height = pxH;
    }
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(src.el, 0, 0, pxW, pxH);

    const activeZone = d || z;
    if (activeZone) {
      ctx.fillStyle = "rgba(255, 212, 0, 0.14)";
      ctx.strokeStyle = ZONE;
      ctx.lineWidth = 2 * dpr;
      ctx.setLineDash([8 * dpr, 6 * dpr]);
      ctx.fillRect(activeZone.x * pxW, activeZone.y * pxH, activeZone.w * pxW, activeZone.h * pxH);
      ctx.strokeRect(activeZone.x * pxW, activeZone.y * pxH, activeZone.w * pxW, activeZone.h * pxH);
      ctx.setLineDash([]);
    }

    if (!boxes || !size || !list) return;
    const sx = pxW / size.width;
    const sy = pxH / size.height;
    ctx.font = `600 ${Math.round(12 * dpr)}px "Archivo Variable", system-ui, sans-serif`;
    ctx.textBaseline = "middle";

    list.forEach((person) => {
      const [x1, y1, x2, y2] = person.box;
      const flagged = z && insideZone(person.box, z, size);
      const color = flagged ? ZONE : BOX;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5 * dpr;
      ctx.strokeRect(x1 * sx, y1 * sy, (x2 - x1) * sx, (y2 - y1) * sy);

      const label = person.confidence.toFixed(2);
      const chipH = 20 * dpr;
      const chipW = ctx.measureText(label).width + 12 * dpr;
      const chipY = y1 * sy - chipH >= 0 ? y1 * sy - chipH : y1 * sy;
      ctx.fillStyle = color;
      ctx.fillRect(x1 * sx, chipY, chipW, chipH);
      ctx.fillStyle = flagged ? "#15191C" : "#FFFFFF";
      ctx.fillText(label, x1 * sx + 6 * dpr, chipY + chipH / 2 + dpr * 0.5);
    });
  }, []);

  useEffect(() => {
    paint();
  }, [paint, source, people, imageSize, showBoxes, zone, draft, wrapWidth]);

  useEffect(() => {
    if (!live) return undefined;
    let frame;
    const loop = () => {
      paint();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [live, paint]);

  function point(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: clamp01((event.clientX - rect.left) / rect.width), y: clamp01((event.clientY - rect.top) / rect.height) };
  }

  function onPointerDown(event) {
    if (!drawMode) return;
    canvasRef.current.setPointerCapture(event.pointerId);
    dragStart.current = point(event);
    setDraft(normalizeRect(dragStart.current, dragStart.current));
  }

  function onPointerMove(event) {
    if (!drawMode || !dragStart.current) return;
    setDraft(normalizeRect(dragStart.current, point(event)));
  }

  function onPointerUp(event) {
    if (!drawMode || !dragStart.current) return;
    const rect = normalizeRect(dragStart.current, point(event));
    dragStart.current = null;
    setDraft(null);
    if (rect.w > 0.03 && rect.h > 0.03) onZoneChange(rect);
  }

  return (
    <div ref={wrapRef} className={`stage${drawMode ? " is-drawing" : ""}`}>
      {source ? (
        <canvas
          ref={canvasRef}
          className="stage-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          aria-label="Detection result with bounding boxes"
        />
      ) : (
        children
      )}
    </div>
  );
}
