import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { formatExportEstimate } from "../src/export/estimate.ts";
import { normalizeZipPath, readZip } from "../src/batch/zip.ts";

function storedZip(name: string, text: string) {
  const filename = new TextEncoder().encode(name);
  const content = new TextEncoder().encode(text);
  const bytes = new Uint8Array(30 + filename.length + content.length + 46 + filename.length + 22);
  const view = new DataView(bytes.buffer);
  let offset = 0;
  view.setUint32(offset, 0x04034b50, true);
  view.setUint16(offset + 4, 20, true);
  view.setUint32(offset + 18, content.length, true);
  view.setUint32(offset + 22, content.length, true);
  view.setUint16(offset + 26, filename.length, true);
  bytes.set(filename, offset + 30);
  bytes.set(content, offset + 30 + filename.length);
  const central = 30 + filename.length + content.length;
  offset = central;
  view.setUint32(offset, 0x02014b50, true);
  view.setUint16(offset + 4, 20, true);
  view.setUint16(offset + 6, 20, true);
  view.setUint32(offset + 20, content.length, true);
  view.setUint32(offset + 24, content.length, true);
  view.setUint16(offset + 28, filename.length, true);
  bytes.set(filename, offset + 46);
  offset += 46 + filename.length;
  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 8, 1, true);
  view.setUint16(offset + 10, 1, true);
  view.setUint32(offset + 12, 46 + filename.length, true);
  view.setUint32(offset + 16, central, true);
  return new Blob([bytes]);
}

test("batch ZIP reader extracts a stored manifest and rejects traversal", async () => {
  const entries = await readZip(storedZip("folder/motion-batch.json", '{"version":1}'));
  assert.equal(await entries.get("folder/motion-batch.json")?.text(), '{"version":1}');
  assert.throws(() => normalizeZipPath("../secret.json"), /Unsafe ZIP path/);
});

test("export estimates remain concise", () => {
  assert.equal(formatExportEstimate(2, 1920, 1080, 30), "~11 sec");
  assert.match(formatExportEstimate(30, 1920, 1080, 30), /^~\d+ min$/);
});

test("shipped batch samples are readable and contain every referenced asset", async () => {
  const plain = JSON.parse(await readFile(new URL("../examples/batch-import/sample-batch.json", import.meta.url), "utf8"));
  assert.equal(plain.version, 1);
  assert.equal(plain.instances.length, 4);

  const archive = await readZip(new Blob([await readFile(new URL("../examples/batch-import/sample-batch-with-media.zip", import.meta.url))]));
  const manifest = JSON.parse(await archive.get("motion-batch.json")!.text());
  assert.equal(manifest.instances.length, 2);
  for (const instance of manifest.instances) {
    for (const asset of instance.assets ?? []) assert.equal(archive.has(asset), true, asset);
  }
});
