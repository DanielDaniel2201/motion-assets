import assert from "node:assert/strict";
import test from "node:test";
import { progressBarDefinition } from "../src/assets/progress-bar/definition.ts";
import {
  colorWithAlpha,
  formatTimecode,
  getChapterLayouts,
  getProgress,
  getProgressBarMetrics,
  getSeparatorXs,
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
  assert.equal(parseTimecode("0:08"), 8);
  assert.equal(parseTimecode("1:30.5"), 90.5);
  assert.equal(parseTimecode("nope"), null);
  assert.equal(formatTimecode(8), "0:08");
});

test("chapter widths follow timestamp durations", () => {
  const metrics = getProgressBarMetrics(1920, 1080, parameters);
  const layouts = getChapterLayouts(parameters.chapters, parameters.duration, metrics);
  const separators = getSeparatorXs(parameters.chapters, parameters.duration, metrics);
  assert.equal(layouts.length, 3);
  assert.equal(separators.length, 2);
  assert.deepEqual(layouts.map(({ start, end }) => [start, end]), [[0, 8], [8, 20], [20, 30]]);
  assert.equal(layouts[0]?.x, timeToX(4, 30, metrics));
  assert.equal(layouts[1]?.x, timeToX(14, 30, metrics));
  assert.deepEqual(separators, [timeToX(8, 30, metrics), timeToX(20, 30, metrics)]);
});

test("every output ratio keeps the chapter row on canvas", () => {
  for (const format of OUTPUT_FORMATS) {
    const metrics = getProgressBarMetrics(format.width, format.height, {
      ...parameters,
      fontSize: 1.4,
      separatorThickness: 1.8,
    });
    const chapters = getChapterLayouts(parameters.chapters, parameters.duration, metrics);
    assert.ok(metrics.centerY > 0 && metrics.centerY < format.height, `${format.id} centerY`);
    assert.ok(metrics.padX > 0 && metrics.contentWidth < format.width);
    assert.ok(chapters.every((chapter) => chapter.y > 0 && chapter.x >= 0 && chapter.x <= format.width));
  }
});

test("bar color keeps a usable alpha pair", () => {
  assert.equal(colorWithAlpha("#d9ff55", 0.5), "rgba(217,255,85,0.5)");
  assert.equal(colorWithAlpha("#fff", 1), "rgba(255,255,255,1)");
});
