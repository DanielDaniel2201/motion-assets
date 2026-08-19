import assert from "node:assert/strict";
import test from "node:test";
import { cardStackDefinition } from "../src/assets/card-stack/definition.ts";
import { getCardFrame } from "../src/assets/card-stack/timeline.ts";

test("lays out and times every supported card count", () => {
  const parameters = cardStackDefinition.defaultParameters;
  let previousDuration = 0;

  for (let count = cardStackDefinition.minInputCount; count <= cardStackDefinition.maxInputCount; count += 1) {
    const duration = cardStackDefinition.getDuration(parameters, count);
    assert.ok(duration > previousDuration);
    previousDuration = duration;

    const frames = Array.from({ length: count }, (_, index) =>
      getCardFrame(index, { width: 800, height: 1000 }, duration, 1920, 1080, parameters, count),
    );
    assert.ok(frames.every((frame) => Object.values(frame).every(Number.isFinite)));
    assert.ok(frames.every((frame) => frame.x > 0 && frame.x < 1920));
    assert.ok(frames.every((frame) => frame.opacity === 1));
    assert.ok(frames[0].x < frames.at(-1)!.x);
  }
});
