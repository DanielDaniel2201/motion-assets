import type { ProgressBarParameters, ProgressChapter } from "./definition";

export type ProgressBarMetrics = {
  unit: number;
  padX: number;
  centerY: number;
  contentWidth: number;
  fontPx: number;
  separatorWidth: number;
  separatorHeight: number;
};

export type ChapterLayout = ProgressChapter & {
  start: number;
  end: number;
  x: number;
  y: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function getProgress(time: number, duration: number) {
  if (duration <= 0) return 1;
  return clamp01(time / duration);
}

export function colorWithAlpha(hex: string, alpha: number) {
  const raw = hex.trim().replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((part) => `${part}${part}`).join("") : raw;
  const value = Number.parseInt(full.padEnd(6, "0").slice(0, 6), 16);
  if (!Number.isFinite(value)) return `rgba(255,255,255,${alpha})`;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function formatTimecode(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe - minutes * 60;
  const whole = Math.floor(remainder + 1e-9);
  const fraction = remainder - whole;
  const base = `${minutes}:${String(whole).padStart(2, "0")}`;
  if (fraction < 0.05) return base;
  return `${base}${fraction.toFixed(1).slice(1)}`;
}

export function parseTimecode(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isFinite(seconds) ? seconds : null;
  }
  const match = trimmed.match(/^(\d+):([0-5]?\d)(?:\.(\d+))?$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const fraction = match[3] ? Number(`0.${match[3]}`) : 0;
  return minutes * 60 + seconds + fraction;
}

export function getProgressBarMetrics(
  width: number,
  height: number,
  parameters: ProgressBarParameters,
): ProgressBarMetrics {
  const unit = Math.min(width, height) / 1080;
  const fontPx = 48 * unit * parameters.fontSize;
  const padX = Math.max(40 * unit, width * 0.04);
  return {
    unit,
    padX,
    centerY: height * (height > width ? 0.8 : 0.84),
    contentWidth: Math.max(1, width - padX * 2),
    fontPx,
    separatorWidth: Math.max(2 * unit, 4 * unit * parameters.separatorThickness),
    separatorHeight: fontPx * 1.75,
  };
}

export function timeToX(time: number, duration: number, metrics: ProgressBarMetrics) {
  return metrics.padX + getProgress(time, duration) * metrics.contentWidth;
}

export function normalizeChapters(chapters: ProgressChapter[], duration: number) {
  return chapters
    .map((chapter) => ({
      ...chapter,
      time: Math.max(0, Math.min(duration, chapter.time)),
      label: chapter.label.trim(),
    }))
    .sort((a, b) => a.time - b.time || a.label.localeCompare(b.label));
}

export function getChapterLayouts(
  chapters: ProgressChapter[],
  duration: number,
  metrics: ProgressBarMetrics,
): ChapterLayout[] {
  const normalized = normalizeChapters(chapters, duration);
  return normalized.map((chapter, index) => {
    const start = index === 0 ? 0 : chapter.time;
    const end = normalized[index + 1]?.time ?? duration;
    return {
      ...chapter,
      start,
      end,
      x: timeToX((start + end) / 2, duration, metrics),
      y: metrics.centerY,
    };
  });
}

export function getSeparatorXs(
  chapters: ProgressChapter[],
  duration: number,
  metrics: ProgressBarMetrics,
) {
  return normalizeChapters(chapters, duration)
    .slice(1)
    .map((chapter) => timeToX(chapter.time, duration, metrics));
}
