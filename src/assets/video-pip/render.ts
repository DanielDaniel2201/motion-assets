import type { VideoPipParameters } from "./definition";
import { getVideoPipFrame, type VideoDimensions } from "./timeline";

type RenderContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function drawCursor(context: RenderContext, x: number, y: number, unit: number, opacity: number) {
  context.save();
  context.translate(x, y);
  context.globalAlpha = opacity;
  context.shadowColor = "rgba(0,0,0,.28)";
  context.shadowBlur = 8 * unit;
  context.shadowOffsetY = 3 * unit;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(0, 39 * unit);
  context.lineTo(10 * unit, 30 * unit);
  context.lineTo(18 * unit, 47 * unit);
  context.lineTo(27 * unit, 43 * unit);
  context.lineTo(19 * unit, 26 * unit);
  context.lineTo(33 * unit, 25 * unit);
  context.closePath();
  context.fillStyle = "#fff";
  context.strokeStyle = "#171815";
  context.lineWidth = 3 * unit;
  context.lineJoin = "round";
  context.fill();
  context.stroke();
  context.restore();
}

export function renderVideoPipFrame(
  context: RenderContext,
  width: number,
  height: number,
  video: CanvasImageSource | null,
  videoDimensions: VideoDimensions,
  parameters: VideoPipParameters,
  time: number,
) {
  context.clearRect(0, 0, width, height);
  const frame = getVideoPipFrame(videoDimensions, time, width, height, parameters);
  const unit = Math.min(width / 1920, height / 1080);

  if (video && frame.width > 1 && frame.height > 1) {
    const radius = Math.min(18 * unit, frame.width / 8, frame.height / 8);
    context.save();
    context.shadowColor = "rgba(9,12,18,.34)";
    context.shadowBlur = 30 * unit;
    context.shadowOffsetY = 14 * unit;
    context.beginPath();
    context.roundRect(frame.x, frame.y, frame.width, frame.height, radius);
    context.fillStyle = "#111";
    context.fill();
    context.shadowColor = "transparent";
    context.clip();
    context.drawImage(video, frame.x, frame.y, frame.width, frame.height);
    context.restore();

    context.save();
    context.beginPath();
    context.roundRect(frame.x, frame.y, frame.width, frame.height, radius);
    context.strokeStyle = "rgba(255,255,255,.82)";
    context.lineWidth = Math.max(1, 2 * unit);
    context.stroke();
    context.restore();
  }

  drawCursor(context, frame.cursorX, frame.cursorY, unit, frame.cursorOpacity);
}
