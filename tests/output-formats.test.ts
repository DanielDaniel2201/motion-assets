import assert from "node:assert/strict";
import test from "node:test";
import { createProResEncoder, ProResProfile } from "prores-wasm-encoder";
import { OUTPUT_FORMATS, PROGRESS_BAR_OUTPUT_FORMATS } from "../src/export/formats.ts";

test("MOV output formats use exact even-sized aspect ratios", () => {
  assert.deepEqual(OUTPUT_FORMATS.map(({ id }) => id), ["16:9", "9:16", "4:3", "3:4", "1:1"]);
  for (const format of OUTPUT_FORMATS) {
    const [ratioWidth, ratioHeight] = format.id.split(":").map(Number);
    assert.equal(format.width % 2, 0);
    assert.equal(format.height % 2, 0);
    assert.equal(format.width * ratioHeight, format.height * ratioWidth);
  }
});

test("Progress Bar exports every aspect ratio at 720p", () => {
  assert.deepEqual(
    PROGRESS_BAR_OUTPUT_FORMATS.map(({ width, height }) => [width, height]),
    [[1280, 720], [720, 1280], [960, 720], [720, 960], [720, 720]],
  );
});

test("ProRes 4444 accepts every supported output ratio", async () => {
  for (const format of OUTPUT_FORMATS) {
    const [ratioWidth, ratioHeight] = format.id.split(":").map(Number);
    const scale = 12;
    const width = ratioWidth * scale;
    const height = ratioHeight * scale;
    const encoder = await createProResEncoder();
    try {
      encoder.initialize({ width, height, frameRate: 30, profile: ProResProfile.P4444, range: "limited" });
      encoder.addFrameRgba(new Uint8ClampedArray(width * height * 4));
      const mov = encoder.finalize();
      const text = new TextDecoder().decode(mov);
      assert.equal(text.slice(4, 12), "ftypqt  ");
      assert.equal(text.includes("ap4h"), true, `${format.id} should encode as ProRes 4444`);
    } finally {
      encoder.destroy();
    }
  }
});
