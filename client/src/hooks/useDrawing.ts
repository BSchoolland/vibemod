import { useCallback, useRef, useState } from 'react';

export interface DrawingPayload {
  dataUrl: string;
  width: number;
  height: number;
}

const STROKE_COLOR = '#FF1493';
const STROKE_WIDTH = 4;

export function useDrawing() {
  const [drawMode, setDrawMode] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const setCanvas = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
  }, []);

  const ensureSize = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w === 0 || h === 0) return;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
  }, []);

  const getCtx = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return null;
    const context = c.getContext('2d');
    if (!context) return null;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = STROKE_WIDTH;
    context.strokeStyle = STROKE_COLOR;
    return context;
  }, []);

  const localPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    ensureSize();
    if (!getCtx()) return;
    drawingRef.current = true;
    lastPosRef.current = localPos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = getCtx();
    if (!ctx || !lastPosRef.current) return;
    const pos = localPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
    if (!hasDrawing) setHasDrawing(true);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    lastPosRef.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const clear = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const context = c.getContext('2d');
    context?.clearRect(0, 0, c.width, c.height);
    setHasDrawing(false);
  }, []);

  const toggleDraw = useCallback(() => {
    setDrawMode((v) => !v);
  }, []);

  const getDrawing = useCallback((): DrawingPayload | null => {
    const c = canvasRef.current;
    if (!c || !hasDrawing) return null;
    return {
      dataUrl: c.toDataURL('image/png'),
      width: c.width,
      height: c.height,
    };
  }, [hasDrawing]);

  return {
    drawMode,
    toggleDraw,
    setDrawMode,
    hasDrawing,
    clear,
    getDrawing,
    canvasProps: {
      ref: setCanvas,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}

export type UseDrawing = ReturnType<typeof useDrawing>;
