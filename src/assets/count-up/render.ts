import type { CountUpParameters } from "./definition";
import { formatCount, getCountValue } from "./timeline";

type RenderContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function renderCountUpFrame(
  context: RenderContext,
  width: number,
  height: number,
  parameters: CountUpParameters,
  time: number,
) {
  context.clearRect(0, 0, width, height);
  const unit = Math.min(width, height) / 1080;
  const value = getCountValue(parameters.start, parameters.end, time, parameters.duration, parameters.easing);
  const text = formatCount(value, parameters.decimals, parameters.prefix, parameters.suffix, parameters.separator);
  let fontPx = 180 * unit * parameters.fontSize;
  context.font = `700 ${fontPx}px "${parameters.fontFamily.replaceAll('"', '\\"')}", sans-serif`;
  const measured = context.measureText(text).width;
  if (measured > width * 0.86) {
    fontPx *= width * 0.86 / measured;
    context.font = `700 ${fontPx}px "${parameters.fontFamily.replaceAll('"', '\\"')}", sans-serif`;
  }
  context.fillStyle = parameters.color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, width / 2, height / 2);
}
