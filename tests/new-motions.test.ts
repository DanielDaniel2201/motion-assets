import assert from "node:assert/strict";
import test from "node:test";
import { getWordProgress } from "../src/assets/blur-text/timeline.ts";
import { formatCount, getCountValue } from "../src/assets/count-up/timeline.ts";
import { getLoopOffset, getSequenceWidth } from "../src/assets/logo-loop/timeline.ts";

test("new motion timelines reach stable endpoints and wrap", () => {
  assert.equal(getWordProgress(0, 0, 0.1, 2), 0);
  assert.equal(getWordProgress(2, 0, 0.1, 2), 1);
  assert.equal(getCountValue(10, 20, 0, 2), 10);
  assert.equal(getCountValue(10, 20, 1, 2, "linear"), 15);
  assert.equal(getCountValue(10, 20, 2, 2), 20);
  assert.equal(formatCount(1234.5, 2, "$", "+"), "$1,234.50+");
  assert.equal(formatCount(1234.5, 0, "", "", false), "1235");

  const sequenceWidth = getSequenceWidth([100, 200], 20);
  assert.equal(sequenceWidth, 340);
  assert.equal(getLoopOffset(0, 1000, 0.1, "left", sequenceWidth), 0);
  assert.equal(getLoopOffset(3.4, 1000, 0.1, "left", sequenceWidth), 0);
  assert.equal(getLoopOffset(1, 1000, 0.1, "right", sequenceWidth), 240);
});
