const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function getContrastTextColor(color: string) {
  const value = Number.parseInt(color.replace("#", ""), 16);
  if (!Number.isFinite(value)) return "#000000";
  const channel = (shift: number) => {
    const normalized = ((value >> shift) & 255) / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
  return luminance > 0.4 ? "#000000" : "#ffffff";
}

export function getMessageProgress(index: number, time: number, interval: number) {
  const revealDuration = Math.min(0.42, Math.max(0.22, interval * 0.55));
  const progress = clamp01((time - index * interval) / revealDuration);
  return 1 - Math.pow(1 - progress, 3);
}

export function getCenteredBlockTop(canvasHeight: number, blockHeight: number) {
  return (canvasHeight - blockHeight) / 2;
}
