import type { ProgressBarParameters } from "./definition";
import {
  colorWithAlpha,
  formatTimecode,
  getChapterLayouts,
  getProgress,
  getProgressBarMetrics,
  getTickMarks,
} from "./timeline";

type RenderContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const LABEL_FONT = 'Inter, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';

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

function paintHaloText(
  context: RenderContext,
  text: string,
  x: number,
  y: number,
  fill: string,
  font: string,
  align: CanvasTextAlign,
  baseline: CanvasTextBaseline,
  halo: number,
) {
  context.save();
  context.font = font;
  context.textAlign = align;
  context.textBaseline = baseline;
  context.lineJoin = "round";
  context.miterLimit = 2;
  context.lineWidth = halo;
  context.strokeStyle = "rgba(0,0,0,0.48)";
  context.strokeText(text, x, y);
  context.fillStyle = fill;
  context.fillText(text, x, y);
  context.restore();
}

export function renderProgressBarFrame(
  context: RenderContext,
  width: number,
  height: number,
  parameters: ProgressBarParameters,
  time: number,
) {
  context.clearRect(0, 0, width, height);

  const metrics = getProgressBarMetrics(width, height, parameters);
  const progress = getProgress(time, parameters.duration);
  const ticks = getTickMarks(
    parameters.duration,
    parameters.minorTickInterval,
    parameters.majorTickInterval,
    metrics.padX,
    metrics.barWidth,
  );
  const chapters = getChapterLayouts(parameters.chapters, time, parameters.duration, metrics);
  const fillWidth = metrics.barWidth * progress;
  const playheadX = metrics.padX + fillWidth;
  const trackTop = metrics.barY - metrics.thickness / 2;
  const color = parameters.barColor;

  for (const tick of ticks) {
    const passed = tick.x <= playheadX + 0.5;
    const tickHeight = tick.major ? metrics.majorTickH : metrics.minorTickH;
    const tickWidth = tick.major ? Math.max(2, 2.4 * metrics.unit * parameters.size) : Math.max(1.2, 1.6 * metrics.unit * parameters.size);
    context.fillStyle = colorWithAlpha(color, passed ? (tick.major ? 0.92 : 0.62) : tick.major ? 0.42 : 0.22);
    context.fillRect(
      tick.x - tickWidth / 2,
      trackTop - tickHeight - 4 * metrics.unit,
      tickWidth,
      tickHeight,
    );

    if (tick.major) {
      paintHaloText(
        context,
        formatTimecode(tick.time),
        tick.x,
        metrics.barY + metrics.thickness / 2 + metrics.timeFontPx + 8 * metrics.unit,
        colorWithAlpha(color, passed ? 0.86 : 0.4),
        `500 ${metrics.timeFontPx}px ${LABEL_FONT}`,
        "center",
        "alphabetic",
        Math.max(3, metrics.timeFontPx * 0.28),
      );
    }
  }

  roundedRect(
    context,
    metrics.padX,
    trackTop,
    metrics.barWidth,
    metrics.thickness,
    metrics.radius,
  );
  context.fillStyle = colorWithAlpha(color, 0.22);
  context.fill();

  if (fillWidth > 0.5) {
    context.save();
    context.shadowColor = colorWithAlpha(color, 0.45);
    context.shadowBlur = 16 * metrics.unit * parameters.size;
    roundedRect(
      context,
      metrics.padX,
      trackTop,
      Math.max(metrics.thickness, fillWidth),
      metrics.thickness,
      metrics.radius,
    );
    context.fillStyle = color;
    context.fill();
    context.restore();
  }

  for (const chapter of chapters) {
    const markerY = metrics.barY;
    const markerR = Math.max(metrics.thickness * 0.72, 5.5 * metrics.unit * parameters.size);
    context.beginPath();
    context.arc(chapter.x, markerY, markerR, 0, Math.PI * 2);
    context.fillStyle = colorWithAlpha(color, chapter.reached ? 1 : 0.45);
    context.fill();
    context.beginPath();
    context.arc(chapter.x, markerY, markerR * 0.42, 0, Math.PI * 2);
    context.fillStyle = chapter.reached ? "rgba(12,13,10,0.88)" : colorWithAlpha(color, 0.2);
    context.fill();

    if (!chapter.label) continue;

    const pop = chapter.reached ? 0.92 + 0.12 * chapter.appear : 1;
    const emphasis = chapter.active ? 1.06 : 1;
    context.save();
    context.translate(chapter.x, chapter.y);
    context.scale(pop * emphasis, pop * emphasis);
    context.globalAlpha = chapter.reached ? 1 : 0.46;
    paintHaloText(
      context,
      chapter.label,
      0,
      0,
      color,
      `${chapter.active ? 700 : 600} ${metrics.fontPx}px ${LABEL_FONT}`,
      "center",
      "bottom",
      Math.max(3.5, metrics.fontPx * 0.26),
    );
    context.restore();
  }

  context.save();
  context.shadowColor = colorWithAlpha(color, 0.55);
  context.shadowBlur = 14 * metrics.unit * parameters.size;
  context.beginPath();
  context.arc(playheadX, metrics.barY, metrics.playheadR, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
  context.restore();

  context.beginPath();
  context.arc(playheadX, metrics.barY, metrics.playheadR * 0.38, 0, Math.PI * 2);
  context.fillStyle = "rgba(12,13,10,0.82)";
  context.fill();

  const needleH = metrics.majorTickH + metrics.thickness;
  context.fillStyle = colorWithAlpha(color, 0.9);
  context.fillRect(
    playheadX - Math.max(1, 1.2 * metrics.unit),
    metrics.barY - needleH,
    Math.max(2, 2.2 * metrics.unit),
    needleH,
  );
}
