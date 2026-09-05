import assert from "node:assert/strict";
import test from "node:test";
import { imageLineupDefinition } from "../src/assets/image-lineup/definition.ts";
import { getImageLineupFrame } from "../src/assets/image-lineup/timeline.ts";

const image = { width: 800, height: 1000 };
const parameters = imageLineupDefinition.defaultParameters;

test("alternates entrances into fixed, centered positions", () => {
  const firstStart = getImageLineupFrame(0, image, 0, 1920, 1080, parameters, 4);
  const secondStart = getImageLineupFrame(1, image, 0, 1920, 1080, parameters, 4);
  assert.ok(firstStart.y > 1080);
  assert.ok(secondStart.y < 0);

  const duration = imageLineupDefinition.getDuration(parameters, 4);
  const frames = Array.from({ length: 4 }, (_, index) =>
    getImageLineupFrame(index, image, duration, 1920, 1080, parameters, 4),
  );
  assert.deepEqual(frames.map(({ y }) => y), [540, 540, 540, 540]);
  assert.ok(frames[0].x < frames[1].x && frames[1].x < frames[2].x && frames[2].x < frames[3].x);
  assert.equal(frames.reduce((sum, frame) => sum + frame.x, 0) / frames.length, 960);
  assert.equal(getImageLineupFrame(0, image, 0.64, 1920, 1080, parameters, 4).x, frames[0].x);
  assert.ok(frames.every(({ opacity }) => opacity === 1));
});
