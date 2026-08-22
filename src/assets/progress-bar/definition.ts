import type { MotionAssetDefinition } from "../types";

export type ProgressChapter = {
  id: string;
  time: number;
  label: string;
};

export type ProgressBarParameters = {
  duration: number;
  separatorThickness: number;
  fontSize: number;
  fontFamily: string;
  baseColor: string;
  progressColor: string;
  chapters: ProgressChapter[];
};

export const MIN_DURATION = 3;
export const MAX_DURATION = 600;
export const MAX_CHAPTERS = 16;

const isFiniteNumber = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

export const BAR_COLOR_PRESETS = [
  "#ffffff",
  "#d9ff55",
  "#ffd166",
  "#5ce1e6",
  "#ff6b6b",
  "#c084fc",
] as const;

export const defaultProgressChapters: ProgressChapter[] = [
  { id: "chapter-intro", time: 0, label: "开场" },
  { id: "chapter-topic", time: 8, label: "主题" },
  { id: "chapter-outro", time: 20, label: "总结" },
];

export function cloneProgressBarParameters(
  parameters: ProgressBarParameters,
): ProgressBarParameters {
  return {
    ...parameters,
    chapters: parameters.chapters.map((chapter) => ({ ...chapter })),
  };
}

export function parseProgressBarParameters(value: unknown): ProgressBarParameters | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as Partial<ProgressBarParameters>;
  if (
    !isFiniteNumber(draft.duration, MIN_DURATION, MAX_DURATION)
    || !isFiniteNumber(draft.separatorThickness, 0.4, 2.2)
    || !isFiniteNumber(draft.fontSize, 0.5, 2)
    || typeof draft.fontFamily !== "string"
    || !draft.fontFamily
    || !isHexColor(draft.baseColor)
    || !isHexColor(draft.progressColor)
    || !Array.isArray(draft.chapters)
    || draft.chapters.length > MAX_CHAPTERS
    || !draft.chapters.every((chapter) =>
      chapter
      && typeof chapter.id === "string"
      && typeof chapter.label === "string"
      && chapter.label.length <= 24
      && isFiniteNumber(chapter.time, 0, draft.duration!),
    )
  ) return null;
  return cloneProgressBarParameters(draft as ProgressBarParameters);
}

export const progressBarDefinition: MotionAssetDefinition<ProgressBarParameters> = {
  id: "progress-bar",
  name: "Progress Bar",
  description: "Evenly spaced chapter labels and separators with a left-to-right color reveal.",
  minInputCount: 0,
  maxInputCount: 0,
  width: 1920,
  height: 1080,
  frameRate: 30,
  defaultParameters: {
    duration: 30,
    separatorThickness: 1,
    fontSize: 1,
    fontFamily: "Segoe UI",
    baseColor: "#ffffff",
    progressColor: "#d9ff55",
    chapters: defaultProgressChapters,
  },
  getDuration(parameters) {
    return parameters.duration;
  },
};
