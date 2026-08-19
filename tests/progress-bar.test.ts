import assert from "node:assert/strict";
import test from "node:test";
import { progressBarDefinition } from "../src/assets/progress-bar/definition.ts";
import {
  colorWithAlpha,
  formatTimecode,
  getChapterLayouts,
  getProgress,
  getProgressBarMetrics,
  getTickMarks,
  iterateIntervals,
  parseTimecode,
  timeToX,
} from "../src/assets/progress-bar/timeline.ts";
import { OUTPUT_FORMATS } from "../src/export/formats.ts";

const parameters = progressBarDefinition.defaultParameters;

test("duration is the authored total length", () => {
  assert.equal(progressBarDefinition.getDuration({ ...parameters, duration: 42 }, 0), 42);
  assert.equal(progressBarDefinition.minInputCount, 0);
  assert.equal(progressBarDefinition.maxInputCount, 0);
});

test("progress is linear from 0 to 1", () => {
  assert.equal(getProgress(0, 20), 0);
  assert.equal(getProgress(10, 20), 0.5);
  assert.equal(getProgress(20, 20), 1);
  assert.equal(getProgress(-1, 20), 0);
  assert.equal(getProgress(25, 20), 1);
});

test("parses and formats chapter timestamps", () => {
  assert.equal(parseTimecode("8"), 8);
  assert.equal(parseTimecode("0:08"), 8);
  assert.equal(parseTimecode("1:30"), 90);
  assert.equal(parseTimecode("1:30.5"), 90.5);
  assert.equal(parseTimecode("nope"), null);
  assert.equal(formatTimecode(8), "0:08");
  assert.equal(formatTimecode(90), "1:30");
});

test("minor and major ticks stay on the bar", () => {
  const metrics = getProgressBarMetrics(1920, 1080, parameters);
  const ticks = getTickMarks(30, 1, 5, metrics.padX, metrics.barWidth);
  assert.ok(ticks.length >= 31);
  assert.equal(ticks[0]?.time, 0);
  assert.equal(ticks.at(-1)?.time, 30);
  assert.ok(ticks.every((tick) => tick.x >= metrics.padX && tick.x <= metrics.padX + metrics.barWidth));
  assert.ok(ticks.filter((tick) => tick.major).length >= 7);
  assert.deepEqual(
    iterateIntervals(10, 3),
    [0, 3, 6, 9, 10],
  );
});

test("chapter markers land on their timestamps", () => {
  const metrics = getProgressBarMetrics(1920, 1080, parameters);
  const layouts = getChapterLayouts(parameters.chapters, 8, 30, metrics);
  assert.equal(layouts.length, 3);
  assert.ok(layouts[0]?.reached);
  assert.ok(layouts[1]?.active);
  assert.equal(layouts[2]?.reached, false);
  assert.equal(layouts[1]?.x, timeToX(8, 30, metrics.padX, metrics.barWidth));
  assert.ok(layouts.every((chapter) => Number.isFinite(chapter.x) && Number.isFinite(chapter.y)));
});

test("every output ratio keeps the bar on canvas", () => {
  for (const format of OUTPUT_FORMATS) {
    const metrics = getProgressBarMetrics(format.width, format.height, {
      ...parameters,
      size: 1.6,
      fontSize: 1.4,
      barThickness: 1.8,
    });
    const ticks = getTickMarks(parameters.duration, 2, 10, metrics.padX, metrics.barWidth);
    const chapters = getChapterLayouts(parameters.chapters, parameters.duration, parameters.duration, metrics);
    assert.ok(metrics.barY > 0 && metrics.barY < format.height, `${format.id} barY`);
    assert.ok(metrics.padX > 0 && metrics.barWidth < format.width);
    assert.ok(ticks.every((tick) => tick.x >= 0 && tick.x <= format.width));
    assert.ok(chapters.every((chapter) => chapter.y > 0 && chapter.x >= 0 && chapter.x <= format.width));
  }
});

test("bar color keeps a usable alpha pair", () => {
  assert.equal(colorWithAlpha("#d9ff55", 0.5), "rgba(217,255,85,0.5)");
  assert.equal(colorWithAlpha("#fff", 1), "rgba(255,255,255,1)");
});
