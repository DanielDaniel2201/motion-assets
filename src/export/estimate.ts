export function formatExportEstimate(duration: number, width: number, height: number, frameRate: number) {
  const seconds = Math.max(5, Math.ceil(5 + duration * frameRate * width * height / 23_000_000));
  return seconds < 60 ? `~${seconds} sec` : `~${Math.ceil(seconds / 60)} min`;
}
