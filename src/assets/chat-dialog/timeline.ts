const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function getMessageProgress(index: number, time: number, interval: number) {
  const revealDuration = Math.min(0.42, Math.max(0.22, interval * 0.55));
  const progress = clamp01((time - index * interval) / revealDuration);
  return 1 - Math.pow(1 - progress, 3);
}

export function getCenteredBlockTop(canvasHeight: number, blockHeight: number) {
  return (canvasHeight - blockHeight) / 2;
}
