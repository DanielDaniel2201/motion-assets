import type { ProgressBarParameters, ProgressChapter } from "./definition";

export type ProgressBarMetrics = {
  unit: number;
  padX: number;
  barY: number;
  barWidth: number;
  thickness: number;
  radius: number;
  fontPx: number;
  timeFontPx: number;
  minorTickH: number;
  majorTickH: number;
  playheadR: number;
};

export type TickMark = {
  time: number;
  x: number;
  major: boolean;
};

export type ChapterLayout = {
  id: string;
  time: number;
  label: string;
  x: number;
  y: number;
  active: boolean;
  reached: boolean;
  appear: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function easeOutBack(value: number) {
  const x = clamp01(value);
  const c1 = 1.45;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export function getProgress(time: number, duration: number) {
  if (duration <= 0) return 1;
  return clamp01(time / duration);
}

export function nearTime(a: number, b: number, epsilon = 1e-6) {
  return Math.abs(a - b) <= epsilon;
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

export function iterateIntervals(duration: number, interval: number) {
  if (!(duration > 0)) return [0];
  if (!(interval > 0)) return [0, duration];
  const times: number[] = [];
  const steps = Math.floor(duration / interval + 1e-9);
  for (let index = 0; index <= steps; index += 1) {
    times.push(Number((index * interval).toFixed(6)));
  }
  const last = times.at(-1) ?? 0;
  if (duration - last > 1e-6) times.push(Number(duration.toFixed(6)));
  return times;
}

export function isMajorTick(time: number, duration: number, majorInterval: number) {
  if (nearTime(time, 0) || nearTime(time, duration)) return true;
  if (!(majorInterval > 0)) return false;
  const steps = time / majorInterval;
  return Math.abs(steps - Math.round(steps)) < 1e-6;
}

export function getProgressBarMetrics(
  width: number,
  height: number,
  parameters: ProgressBarParameters,
): ProgressBarMetrics {
  const unit = Math.min(width, height) / 1080;
  const scale = parameters.size;
  const fontPx = 22 * unit * scale * parameters.fontSize;
  const timeFontPx = Math.max(11 * unit * scale, fontPx * 0.58);
  const thickness = Math.max(3 * unit, 7 * unit * scale * parameters.barThickness);
  const minorTickH = 11 * unit * scale;
  const majorTickH = 22 * unit * scale;
  const playheadR = Math.max(thickness * 0.95, 7 * unit * scale);
  const padX = Math.max(40 * unit * scale, width * 0.055);
  const reservedBelow = timeFontPx + playheadR + 18 * unit * scale;
  const reservedAbove = majorTickH + fontPx * 2.6 + 16 * unit * scale;
  const preferredY = height * (height > width ? 0.8 : 0.855);
  const barY = Math.min(
    height - reservedBelow,
    Math.max(reservedAbove, preferredY),
  );

  return {
    unit,
    padX,
    barY,
    barWidth: Math.max(1, width - padX * 2),
    thickness,
    radius: thickness / 2,
    fontPx,
    timeFontPx,
    minorTickH,
    majorTickH,
    playheadR,
  };
}

export function timeToX(time: number, duration: number, padX: number, barWidth: number) {
  return padX + getProgress(time, duration) * barWidth;
}

export function getTickMarks(
  duration: number,
  minorInterval: number,
  majorInterval: number,
  padX: number,
  barWidth: number,
): TickMark[] {
  const times = new Set<number>([0, Number(duration.toFixed(6))]);
  for (const time of iterateIntervals(duration, minorInterval)) times.add(time);
  for (const time of iterateIntervals(duration, majorInterval)) times.add(time);
  return [...times]
    .sort((a, b) => a - b)
    .map((time) => ({
      time,
      x: timeToX(time, duration, padX, barWidth),
      major: isMajorTick(time, duration, majorInterval),
    }));
}

export function estimateLabelWidth(label: string, fontPx: number) {
  let width = 0;
  for (const character of label) {
    width += /[\u3400-\u9fff]/.test(character) ? fontPx : fontPx * 0.56;
  }
  return width + fontPx * 0.35;
}

export function normalizeChapters(
  chapters: ProgressChapter[],
  duration: number,
): ProgressChapter[] {
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
  time: number,
  duration: number,
  metrics: ProgressBarMetrics,
): ChapterLayout[] {
  const { padX, barWidth, barY, fontPx, majorTickH, unit } = metrics;
  const normalized = normalizeChapters(chapters, duration);
  const activeId = [...normalized].reverse().find((chapter) => time + 1e-6 >= chapter.time)?.id;
  const baseY = barY - majorTickH - fontPx * 0.55 - 8 * unit;
  const placed: ChapterLayout[] = [];

  for (const chapter of normalized) {
    const reached = time + 1e-6 >= chapter.time;
    const appear = easeOutBack((time - chapter.time) / 0.34);
    const x = timeToX(chapter.time, duration, padX, barWidth);
    let y = baseY;
    const halfWidth = estimateLabelWidth(chapter.label || " ", fontPx) / 2;
    for (const previous of placed) {
      const previousHalf = estimateLabelWidth(previous.label || " ", fontPx) / 2;
      const overlaps = Math.abs(x - previous.x) < halfWidth + previousHalf + fontPx * 0.4;
      if (overlaps && Math.abs(y - previous.y) < fontPx * 1.05) {
        y = previous.y - fontPx * 1.2;
      }
    }
    placed.push({
      id: chapter.id,
      time: chapter.time,
      label: chapter.label,
      x,
      y,
      active: chapter.id === activeId,
      reached,
      appear,
    });
  }

  return placed;
}
