export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function getWordProgress(time: number, index: number, stagger: number, duration: number) {
  const revealDuration = Math.max(0.25, duration - Math.max(0, index) * stagger);
  const progress = clamp01((time - index * stagger) / revealDuration);
  return 1 - (1 - progress) ** 3;
}
