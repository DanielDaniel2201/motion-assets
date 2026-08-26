import type { SourceImage } from "../types";
import type { LogoLoopParameters } from "./definition";
import { getLogoWidths, getLoopOffset, getSequenceWidth } from "./timeline";

type RenderContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function renderLogoLoopFrame(
  context: RenderContext,
  width: number,
  height: number,
  images: SourceImage[],
  parameters: LogoLoopParameters,
  time: number,
) {
  context.clearRect(0, 0, width, height);
  if (!images.length) return;

  const logoHeight = Math.min(width, height) * parameters.logoSize;
  const gap = Math.min(width, height) * parameters.gap;
  const widths = getLogoWidths(images, logoHeight);
  const sequenceWidth = getSequenceWidth(widths, gap);
  if (sequenceWidth <= 0) return;

  const offset = getLoopOffset(time, width, parameters.speed, parameters.direction, sequenceWidth);
  const y = height * parameters.positionY - logoHeight / 2;
  let x = -offset - sequenceWidth;
  while (x < width + sequenceWidth) {
    for (let index = 0; index < images.length; index += 1) {
      context.drawImage(images[index].source, x, y, widths[index], logoHeight);
      x += widths[index] + gap;
    }
  }

  if (parameters.fadeEdges > 0) {
    const edge = Math.min(width / 2, width * parameters.fadeEdges);
    const mask = context.createLinearGradient(0, 0, width, 0);
    mask.addColorStop(0, "rgba(255,255,255,0)");
    mask.addColorStop(edge / width, "rgba(255,255,255,1)");
    mask.addColorStop(1 - edge / width, "rgba(255,255,255,1)");
    mask.addColorStop(1, "rgba(255,255,255,0)");
    context.save();
    context.globalCompositeOperation = "destination-in";
    context.fillStyle = mask;
    context.fillRect(0, 0, width, height);
    context.restore();
  }
}
