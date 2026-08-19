import { useEffect, useRef, useState } from "react";
import type { CardStackParameters } from "../assets/card-stack/definition";
import { cardStackDefinition } from "../assets/card-stack/definition";
import { renderCardStackFrame } from "../assets/card-stack/render";
import type { SourceImage } from "../assets/types";

type PreviewCanvasProps = {
  images: SourceImage[];
  parameters: CardStackParameters;
  replayToken: number;
  width: number;
  height: number;
};

export function PreviewCanvas({ images, parameters, replayToken, width, height }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const duration = cardStackDefinition.getDuration(
      parameters,
      Math.max(images.length, cardStackDefinition.minInputCount),
    );
    let animationFrame = 0;
    const startedAt = performance.now();

    const draw = (now: number) => {
      const time = Math.min(duration, (now - startedAt) / 1000);
      renderCardStackFrame(context, canvas.width, canvas.height, images, parameters, time);
      setProgress(time / duration);
      if (time < duration) animationFrame = requestAnimationFrame(draw);
    };
    animationFrame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrame);
  }, [height, images, parameters, replayToken, width]);

  return (
    <div className="preview-canvas-wrap" style={{ aspectRatio: `${width}/${height}` }}>
      <canvas ref={canvasRef} width={width / 2} height={height / 2} aria-label="Card Stack animation preview" />
      {images.length === 0 && (
        <div className="preview-empty" aria-hidden="true">
          <div className="ghost-card ghost-one" />
          <div className="ghost-card ghost-two" />
          <div className="ghost-card ghost-three" />
          <p>Add 2–8 images to begin</p>
        </div>
      )}
      <div className="preview-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
    </div>
  );
}
