import type { CardStackParameters } from "./definition";

export type ImageDimensions = { width: number; height: number };

export type CardFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  opacity: number;
  reveal: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - clamp01(value), 3);
}

export function easeInOutCubic(value: number) {
  const x = clamp01(value);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeOutBack(value: number) {
  const x = clamp01(value);
  const c1 = 1.45;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

const mix = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

export function getCardSize(
  image: ImageDimensions,
  canvasWidth: number,
  canvasHeight: number,
) {
  const unit = Math.min(canvasWidth / 1920, canvasHeight / 1080);
  const maxWidth = 520 * unit;
  const maxHeight = 610 * unit;
  const aspect = image.width / image.height;
  let width = maxWidth;
  let height = width / aspect;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }
  const minimumSide = 260 * unit;
  if (width < minimumSide) {
    const scale = minimumSide / width;
    width *= scale;
    height = Math.min(maxHeight, height * scale);
  }
  if (height < minimumSide * 0.7) {
    const scale = (minimumSide * 0.7) / height;
    height *= scale;
    width = Math.min(maxWidth, width * scale);
  }
  const border = 18 * unit;
  return { width: width + border * 2, height: height + border * 2, border };
}

export function getCardFrame(
  index: number,
  image: ImageDimensions,
  time: number,
  canvasWidth: number,
  canvasHeight: number,
  parameters: CardStackParameters,
  inputCount: number,
): CardFrame {
  const size = getCardSize(image, canvasWidth, canvasHeight);
  const entranceStart = index * parameters.stagger;
  const entranceDuration = 0.56 / parameters.animationSpeed;
  const entrance = clamp01((time - entranceStart) / entranceDuration);
  const entranceEase = easeOutBack(entrance);
  const spreadStart = parameters.stagger * Math.max(0, inputCount - 1) + entranceDuration * 0.72;
  const spreadDuration = 0.92 / parameters.animationSpeed;
  const unfold = easeInOutCubic((time - spreadStart) / spreadDuration);
  const unit = Math.min(canvasWidth / 1920, canvasHeight / 1080);

  const center = (inputCount - 1) / 2;
  const offset = index - center;
  const position = center === 0 ? 0 : offset / center;
  const stackX = canvasWidth * (0.5 + position * 0.028);
  const stackY = canvasHeight * (0.524 - position * 0.022);
  const finalX = canvasWidth * (0.5 + position * 0.3 * parameters.spread);
  const finalY = canvasHeight * (0.5 + (index % 2 ? -0.035 : 0.035) * parameters.spread * 0.7);
  const launchX = stackX + offset * 34 * unit;
  const launchY = stackY + (150 + Math.abs(offset) * 24) * unit;
  const stackRotation = position * 4.4;
  const launchRotation = stackRotation + (index % 2 ? 13 : -13);
  const finalRotation = position * 10.5 * parameters.rotation;

  const enteredX = mix(launchX, stackX, entranceEase);
  const enteredY = mix(launchY, stackY, entranceEase);
  const enteredRotation = mix(launchRotation, stackRotation, entranceEase);

  return {
    x: mix(enteredX, finalX, unfold),
    y: mix(enteredY, finalY, unfold),
    width: size.width,
    height: size.height,
    rotation: mix(enteredRotation, finalRotation, unfold),
    scale: mix(0.62, 1, entranceEase),
    opacity: easeOutCubic(entrance / 0.48),
    reveal: entrance,
  };
}
