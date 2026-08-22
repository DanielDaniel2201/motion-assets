import assert from "node:assert/strict";
import test from "node:test";
import { VIDEO_PIP_DRAG_START, videoPipDefinition } from "../src/assets/video-pip/definition.ts";
import { getVideoPipFrame } from "../src/assets/video-pip/timeline.ts";
import { OUTPUT_FORMATS } from "../src/export/formats.ts";

test("PiP drag preserves the uploaded video ratio and safe upper-left inset", () => {
  const parameters = { ...videoPipDefinition.defaultParameters, videoDuration: 5 };
  assert.equal(getVideoPipFrame({ width: 16, height: 9 }, VIDEO_PIP_DRAG_START, 1920, 1080, parameters).reveal, 0);
  for (const format of OUTPUT_FORMATS) {
    for (const video of [{ width: 1920, height: 1080 }, { width: 1080, height: 1920 }]) {
      const frame = getVideoPipFrame(
        video,
        videoPipDefinition.getDuration(parameters, 1),
        format.width,
        format.height,
        parameters,
      );
      assert.ok(frame.x > 0 && frame.y > 0);
      assert.ok(frame.x + frame.width < format.width && frame.y + frame.height < format.height);
      assert.ok(Math.abs(frame.width / frame.height - video.width / video.height) < 0.001);
      assert.equal(frame.reveal, 1);
    }
  }
  assert.equal(videoPipDefinition.getDuration(parameters, 1), VIDEO_PIP_DRAG_START + 5);
});
