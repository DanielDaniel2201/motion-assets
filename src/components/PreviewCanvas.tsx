import { useEffect, useRef, useState, type ReactNode } from "react";

type PreviewCanvasProps = {
  width: number;
  height: number;
  duration: number;
  replayToken: number;
  label: string;
  empty?: ReactNode;
  draw: (context: CanvasRenderingContext2D, width: number, height: number, time: number) => void;
};

export function PreviewCanvas({
  width,
  height,
  duration,
  replayToken,
  label,
  empty,
  draw,
}: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  const [progress, setProgress] = useState(0);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const safeDuration = Math.max(0.001, duration);
    let animationFrame = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const time = Math.min(safeDuration, (now - startedAt) / 1000);
      drawRef.current(context, canvas.width, canvas.height, time);
      setProgress(time / safeDuration);
      if (time < safeDuration) animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [duration, height, replayToken, width]);

  return (
    <div className="preview-canvas-wrap" style={{ aspectRatio: `${width}/${height}` }}>
      <canvas ref={canvasRef} width={width / 2} height={height / 2} aria-label={label} />
      {empty}
      <div className="preview-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
    </div>
  );
}
