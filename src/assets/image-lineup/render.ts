import type { SourceImage } from "../types";
import type { ImageLineupParameters } from "./definition";
import { getImageLineupFrame } from "./timeline";

type RenderContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function renderImageLineupFrame(
  context: RenderContext,
  width: number,
  height: number,
  images: SourceImage[],
  parameters: ImageLineupParameters,
  time: number,
) {
  context.clearRect(0, 0, width, height);
  const unit = Math.min(width / 1920, height / 1080);

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const frame = getImageLineupFrame(index, image, time, width, height, parameters, images.length);
    if (frame.opacity <= 0) continue;

    context.save();
    context.globalAlpha = frame.opacity;
    context.shadowColor = "rgba(16, 20, 34, 0.25)";
    context.shadowBlur = 28 * unit;
    context.shadowOffsetY = 12 * unit;
    context.beginPath();
    context.roundRect(frame.x - frame.width / 2, frame.y - frame.height / 2, frame.width, frame.height, 14 * unit);
    context.clip();
    context.drawImage(image.source, frame.x - frame.width / 2, frame.y - frame.height / 2, frame.width, frame.height);
    context.restore();
  }
}
