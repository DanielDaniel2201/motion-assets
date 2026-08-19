import type { SourceImage } from "../types";
import type { CardStackParameters } from "./definition";
import { getCardFrame, getCardSize } from "./timeline";

type RenderContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function roundedRect(
  context: RenderContext,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

export function renderCardStackFrame(
  context: RenderContext,
  width: number,
  height: number,
  images: SourceImage[],
  parameters: CardStackParameters,
  time: number,
) {
  context.clearRect(0, 0, width, height);
  const unit = Math.min(width / 1920, height / 1080);

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const frame = getCardFrame(index, image, time, width, height, parameters, images.length);
    if (frame.opacity <= 0.001) continue;
    const size = getCardSize(image, width, height);
    const imageWidth = size.width - size.border * 2;
    const imageHeight = size.height - size.border * 2;

    context.save();
    context.translate(frame.x, frame.y);
    context.rotate((frame.rotation * Math.PI) / 180);
    context.scale(frame.scale, frame.scale);
    context.globalAlpha = frame.opacity;

    context.shadowColor = "rgba(16, 20, 34, 0.3)";
    context.shadowBlur = 34 * unit;
    context.shadowOffsetY = 18 * unit;
    roundedRect(
      context,
      -frame.width / 2,
      -frame.height / 2,
      frame.width,
      frame.height,
      24 * unit,
    );
    context.fillStyle = "#f7f7f5";
    context.fill();

    context.shadowColor = "transparent";
    roundedRect(
      context,
      -imageWidth / 2,
      -imageHeight / 2,
      imageWidth,
      imageHeight,
      12 * unit,
    );
    context.clip();
    context.drawImage(
      image.source,
      -imageWidth / 2,
      -imageHeight / 2,
      imageWidth,
      imageHeight,
    );
    context.restore();
  }
}
