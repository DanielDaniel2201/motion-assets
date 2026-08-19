import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { createProResEncoder, ProResProfile } from "prores-wasm-encoder";

function commandExists(command: string) {
  return spawnSync(command, ["-version"], { stdio: "ignore" }).status === 0;
}

test("encodes a real ProRes 4444 MOV with a varying alpha plane", async (context) => {
  const width = 64;
  const height = 36;
  const frameRate = 30;
  const frameCount = 6;
  const encoder = await createProResEncoder();
  let mov: Uint8Array;
  try {
    encoder.initialize({
      width,
      height,
      frameRate,
      profile: ProResProfile.P4444,
      range: "limited",
    });
    for (let frame = 0; frame < frameCount; frame += 1) {
      const rgba = new Uint8ClampedArray(width * height * 4);
      for (let y = 7; y < 29; y += 1) {
        for (let x = 9 + frame; x < 43 + frame; x += 1) {
          const offset = (y * width + x) * 4;
          rgba[offset] = 217;
          rgba[offset + 1] = 255;
          rgba[offset + 2] = 85;
          rgba[offset + 3] = x < 16 + frame ? 128 : 255;
        }
      }
      encoder.addFrameRgba(rgba);
    }
    mov = encoder.finalize();
  } finally {
    encoder.destroy();
  }

  const text = new TextDecoder().decode(mov);
  assert.equal(text.slice(4, 12), "ftypqt  ");
  assert.equal(text.includes("ap4h"), true, "MOV should declare ProRes 4444");
  assert.ok(mov.byteLength > 1_000);

  if (!commandExists("ffprobe")) {
    context.diagnostic("ffprobe is unavailable; container bytes were validated only.");
    return;
  }

  const directory = mkdtempSync(join(tmpdir(), "motion-assets-test-"));
  const movPath = join(directory, "alpha.mov");
  try {
    writeFileSync(movPath, mov);
    const probe = spawnSync(
      "ffprobe",
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,codec_tag_string,pix_fmt,width,height,avg_frame_rate,nb_frames,duration", "-of", "json", movPath],
      { encoding: "utf8" },
    );
    assert.equal(probe.status, 0, probe.stderr);
    const stream = JSON.parse(probe.stdout).streams[0];
    assert.equal(stream.codec_name, "prores");
    assert.equal(stream.codec_tag_string, "ap4h");
    assert.match(stream.pix_fmt, /^yuva444p/);
    assert.equal(stream.width, width);
    assert.equal(stream.height, height);
    assert.equal(stream.avg_frame_rate, "30/1");
    assert.equal(Number(stream.nb_frames), frameCount);
    assert.ok(Math.abs(Number(stream.duration) - frameCount / frameRate) < 0.001);

    if (commandExists("ffmpeg")) {
      const decodedAlpha = spawnSync(
        "ffmpeg",
        ["-v", "error", "-i", movPath, "-vf", "alphaextract", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        { encoding: null, maxBuffer: 1024 * 1024 },
      );
      assert.equal(decodedAlpha.status, 0, decodedAlpha.stderr.toString());
      const alpha = new Uint8Array(decodedAlpha.stdout);
      assert.equal(alpha.length, width * height);
      assert.equal(Math.min(...alpha), 0, "transparent pixels should survive encoding");
      assert.ok(Math.max(...alpha) >= 250, "opaque pixels should survive encoding");
      assert.ok(alpha.some((value) => value > 90 && value < 200), "partial alpha should survive encoding");
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
