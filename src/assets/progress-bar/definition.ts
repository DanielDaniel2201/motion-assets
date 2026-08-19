import type { MotionAssetDefinition } from "../types";

export type ProgressChapter = {
  id: string;
  time: number;
  label: string;
};

export type ProgressBarParameters = {
  duration: number;
  size: number;
  barThickness: number;
  fontSize: number;
  minorTickInterval: number;
  majorTickInterval: number;
  barColor: string;
  chapters: ProgressChapter[];
};

export const MIN_DURATION = 3;
export const MAX_DURATION = 90;
export const MAX_CHAPTERS = 16;

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

export const progressBarDefinition: MotionAssetDefinition<ProgressBarParameters> = {
  id: "progress-bar",
  name: "Progress Bar",
  description: "A timed ruler overlay with chapter labels, ticks, and a real Alpha channel.",
  minInputCount: 0,
  maxInputCount: 0,
  width: 1920,
  height: 1080,
  frameRate: 30,
  defaultParameters: {
    duration: 30,
    size: 1,
    barThickness: 1,
    fontSize: 1,
    minorTickInterval: 1,
    majorTickInterval: 5,
    barColor: "#ffffff",
    chapters: defaultProgressChapters,
  },
  getDuration(parameters) {
    return parameters.duration;
  },
};
