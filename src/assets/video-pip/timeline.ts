import type { VideoPipParameters } from "./definition";

const DRAG_START = 0.9;

export type VideoDimensions = { width: number; height: number };

export type VideoPipFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  cursorX: number;
  cursorY: number;
  cursorOpacity: number;
  reveal: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;
const easeOutCubic = (value: number) => 1 - Math.pow(1 - clamp01(value), 3);
const easeInOutCubic = (value: number) => {
  const x = clamp01(value);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

export function getVideoPipFrame(
  video: VideoDimensions,
  time: number,
  canvasWidth: number,
  canvasHeight: number,
  parameters: VideoPipParameters,
): VideoPipFrame {
  const anchorX = canvasWidth * 0.15;
  const anchorY = canvasHeight * 0.14;
  const aspect = video.width / video.height;
  let finalWidth = canvasWidth * 0.68;
  let finalHeight = finalWidth / aspect;
  const maxHeight = canvasHeight * 0.68;
  if (finalHeight > maxHeight) {
    finalHeight = maxHeight;
    finalWidth = finalHeight * aspect;
  }

  const move = easeInOutCubic((time - 0.18) / 0.72);
  const reveal = easeInOutCubic((time - DRAG_START) / parameters.dragDuration);
  const cursorAtAnchorX = mix(canvasWidth / 2, anchorX, move);
  const cursorAtAnchorY = mix(canvasHeight / 2, anchorY, move);
  const fadeAfterDrag = clamp01((time - DRAG_START - parameters.dragDuration) / 0.18);

  return {
    x: anchorX,
    y: anchorY,
    width: finalWidth * reveal,
    height: finalHeight * reveal,
    cursorX: mix(cursorAtAnchorX, anchorX + finalWidth, reveal),
    cursorY: mix(cursorAtAnchorY, anchorY + finalHeight, reveal),
    cursorOpacity: easeOutCubic(time / 0.16) * (1 - fadeAfterDrag),
    reveal,
  };
}
