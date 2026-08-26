import type { BlurTextParameters } from "./definition";
import { getWordProgress } from "./timeline";

type RenderContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

type TextUnit = { text: string; width: number; revealIndex: number | null };

function getUnits(context: RenderContext, line: string, splitBy: BlurTextParameters["splitBy"], startIndex: number) {
  const parts = splitBy === "character" ? Array.from(line) : splitBy === "word" ? line.match(/\s+|\S+/g) ?? [] : [line];
  let index = startIndex;
  const units: TextUnit[] = parts.map((text) => {
    const revealIndex = text.trim() ? index++ : null;
    return { text, width: context.measureText(text).width, revealIndex };
  });
  return { units, nextIndex: index };
}

export function renderBlurTextFrame(
  context: RenderContext,
  width: number,
  height: number,
  parameters: BlurTextParameters,
  time: number,
) {
  context.clearRect(0, 0, width, height);
  if (!parameters.text.trim()) return;

  const lines = parameters.text.split("\n");
  const unit = Math.min(width, height) / 1080;
  let fontPx = 112 * unit * parameters.fontSize;
  const setFont = () => {
    context.font = `700 ${fontPx}px "${parameters.fontFamily.replaceAll('"', '\\"')}", sans-serif`;
  };
  setFont();
  const maxMeasured = Math.max(...lines.map((line) => context.measureText(line).width), 1);
  if (maxMeasured > width * 0.86) {
    fontPx *= width * 0.86 / maxMeasured;
    setFont();
  }

  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = parameters.color;
  const lineHeight = fontPx * 1.18;
  const startY = height / 2 - (lines.length - 1) * lineHeight / 2;
  let revealIndex = 0;

  lines.forEach((line, lineIndex) => {
    const { units, nextIndex } = getUnits(context, line, parameters.splitBy, revealIndex);
    revealIndex = nextIndex;
    let x = (width - units.reduce((sum, item) => sum + item.width, 0)) / 2;
    for (const item of units) {
      if (item.revealIndex === null) {
        x += item.width;
        continue;
      }
      const progress = getWordProgress(time, item.revealIndex, parameters.stagger, parameters.duration);
      const distance = fontPx * parameters.distance * (1 - progress);
      const dx = parameters.direction === "left" ? -distance : parameters.direction === "right" ? distance : 0;
      const dy = parameters.direction === "up" ? distance : parameters.direction === "down" ? -distance : 0;
      context.save();
      context.globalAlpha = progress;
      context.filter = `blur(${(1 - progress) * parameters.blur * unit}px)`;
      context.fillText(item.text, x + dx, startY + lineIndex * lineHeight + dy);
      context.restore();
      x += item.width;
    }
  });
}
