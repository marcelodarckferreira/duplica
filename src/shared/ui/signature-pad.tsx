import { Eraser } from "lucide-react";
import { forwardRef, PointerEvent as ReactPointerEvent, useImperativeHandle, useRef, useState } from "react";
import { cn } from "../lib/utils";

export interface SignaturePadHandle {
  isEmpty: () => boolean;
  toDataUrl: () => string;
  clear: () => void;
}

// Pad de assinatura desenhada à mão (mouse/touch/caneta via Pointer Events),
// sem dependência externa — exporta a assinatura como PNG base64 (data URL)
// pro back-end guardar junto da confirmação de entrega.
export const SignaturePad = forwardRef<SignaturePadHandle, { className?: string }>(function SignaturePad(props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  function getContext() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  // Escala de CSS px (tamanho renderizado, ex.: um modal estreito) pro
  // buffer real do canvas (600x220) — sem isso o traço fica confinado a um
  // canto quando o canvas é exibido menor que sua resolução interna.
  function pointFromEvent(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(event);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = getContext();
    const last = lastPointRef.current;
    if (!ctx || !last) return;
    const point = pointFromEvent(event);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#16201b";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    setIsEmpty(false);
  }

  function endStroke(event: ReactPointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    lastPointRef.current = null;
    canvasRef.current?.releasePointerCapture(event.pointerId);
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }

  useImperativeHandle(ref, () => ({
    isEmpty: () => isEmpty,
    toDataUrl: () => canvasRef.current?.toDataURL("image/png") ?? "",
    clear,
  }));

  return (
    <div className={cn("grid gap-1.5", props.className)}>
      <div className="relative h-40 w-full overflow-hidden rounded border border-border bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={220}
          className="h-full w-full touch-none [appearance:none]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
        />
        {isEmpty && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted">
            Assine aqui
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={clear}
        className="inline-flex w-fit items-center gap-1.5 rounded border-0 bg-transparent p-0 text-xs font-bold text-muted [appearance:none] hover:text-text"
      >
        <Eraser size={13} />
        Limpar assinatura
      </button>
    </div>
  );
});
