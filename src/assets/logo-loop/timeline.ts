import type { SourceImage } from "../types";

export function getLogoWidths(images: SourceImage[], logoHeight: number) {
  return images.map((image) => logoHeight * image.width / Math.max(1, image.height));
}

export function getSequenceWidth(widths: number[], gap: number) {
  return widths.reduce((sum, width) => sum + width + gap, 0);
}

export function getLoopOffset(
  time: number,
  canvasWidth: number,
  speed: number,
  direction: "left" | "right",
  sequenceWidth: number,
) {
  if (sequenceWidth <= 0) return 0;
  const distance = (Math.max(0, time) * canvasWidth * speed) % sequenceWidth;
  return direction === "left" ? distance : (sequenceWidth - distance) % sequenceWidth;
}
