import type { ImageDimensions } from "../card-stack/timeline.ts";
import { easeOutCubic, getCardSize } from "../card-stack/timeline.ts";
import type { ImageLineupParameters } from "./definition";

export type ImageLineupFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function getImageLineupFrame(
  index: number,
  image: ImageDimensions,
  time: number,
  canvasWidth: number,
  canvasHeight: number,
  parameters: ImageLineupParameters,
  inputCount: number,
): ImageLineupFrame {
  const cardSize = getCardSize(image, canvasWidth, canvasHeight);
  const width = cardSize.width - cardSize.border * 2;
  const height = cardSize.height - cardSize.border * 2;
  const unit = Math.min(canvasWidth / 1920, canvasHeight / 1080);
  const entranceDuration = 0.64 / parameters.animationSpeed;
  const interval = entranceDuration + parameters.stagger;
  const entrance = clamp01((time - index * interval) / entranceDuration);
  const entered = easeOutCubic(entrance);
  const center = (inputCount - 1) / 2;
  const availableStep = (canvasWidth / 2 - 284 * unit) / Math.max(1, center);
  const step = Math.max(0, Math.min(300 * unit * parameters.spread, availableStep));
  const centerY = canvasHeight / 2;
  const launchY = index % 2 === 0 ? canvasHeight + height / 2 : -height / 2;
  return {
    x: canvasWidth / 2 + (index - center) * step,
    y: launchY + (centerY - launchY) * entered,
    width,
    height,
    opacity: entrance,
  };
}
