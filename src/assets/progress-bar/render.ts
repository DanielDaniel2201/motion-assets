import type { ProgressBarParameters } from "./definition";
import {
  colorWithAlpha,
  getChapterLayouts,
  getProgress,
  getProgressBarMetrics,
  getSeparatorXs,
  type ProgressBarMetrics,
} from "./timeline";

type RenderContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const FALLBACK_FONTS = '"PingFang SC", "Microsoft YaHei", sans-serif';

function paintContent(
  context: RenderContext,
  metrics: ProgressBarMetrics,
  parameters: ProgressBarParameters,
  color: string,
) {
  const chapters = getChapterLayouts(parameters.chapters, parameters.duration, metrics);
  const font = `600 ${metrics.fontPx}px "${parameters.fontFamily.replaceAll('"', '\\"')}", ${FALLBACK_FONTS}`;

  context.save();
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.lineWidth = Math.max(2.5 * metrics.unit, metrics.fontPx * 0.08);
  context.strokeStyle = "rgba(0,0,0,0.5)";
  context.fillStyle = color;
  for (const chapter of chapters) {
    if (!chapter.label) continue;
    context.strokeText(chapter.label, chapter.x, chapter.y);
    context.fillText(chapter.label, chapter.x, chapter.y);
  }
  context.restore();

  context.save();
  context.fillStyle = color;
  context.shadowColor = colorWithAlpha(color, 0.38);
  context.shadowBlur = 10 * metrics.unit;
  for (const x of getSeparatorXs(parameters.chapters, parameters.duration, metrics)) {
    context.fillRect(
      x - metrics.separatorWidth / 2,
      metrics.centerY - metrics.separatorHeight / 2,
      metrics.separatorWidth,
      metrics.separatorHeight,
    );
  }
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
  context.fillStyle = parameters.baseColor;
  context.fillRect(
    metrics.padX,
    metrics.centerY - metrics.separatorHeight / 2,
    metrics.contentWidth * progress,
    metrics.separatorHeight,
  );
  paintContent(context, metrics, parameters, parameters.progressColor);
}
