export function normalizeZipPath(path: string) {
  const normalized = path.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) throw new Error(`Unsafe ZIP path: ${path}`);
  return normalized;
}

export function mediaType(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  return ({ png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", json: "application/json" } as Record<string, string>)[extension ?? ""] ?? "application/octet-stream";
}

async function inflate(bytes: Uint8Array, expectedSize: number) {
  const stream = new Blob([bytes.slice().buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const output = new Uint8Array(await new Response(stream).arrayBuffer());
  if (output.length !== expectedSize) throw new Error("A ZIP entry has an invalid uncompressed size.");
  return output;
}

export async function readZip(file: Blob) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let offset = Math.max(0, bytes.length - 65_557); offset <= bytes.length - 22; offset++) {
    if (view.getUint32(offset, true) === 0x06054b50) end = offset;
  }
  if (end < 0) throw new Error("This file is not a readable ZIP archive.");
  const count = view.getUint16(end + 10, true);
  if (!count || count > 200) throw new Error("A ZIP must contain between 1 and 200 entries.");
  let offset = view.getUint32(end + 16, true);
  let totalSize = 0;
  const entries = new Map<string, Blob>();
  for (let index = 0; index < count; index++) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("The ZIP directory is corrupt.");
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = normalizeZipPath(new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength)));
    offset += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith("/")) continue;
    if (flags & 1) throw new Error(`${name} is encrypted; encrypted ZIP files are not supported.`);
    if (method !== 0 && method !== 8) throw new Error(`${name} uses an unsupported ZIP compression method.`);
    if (size > 220 * 1024 * 1024 || (totalSize += size) > 512 * 1024 * 1024) throw new Error("The ZIP exceeds the 512 MB uncompressed safety limit.");
    if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error(`The ZIP entry ${name} is corrupt.`);
    const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    const content = method === 8 ? await inflate(compressed, size) : compressed;
    if (method === 0 && content.length !== size) throw new Error(`The ZIP entry ${name} has an invalid size.`);
    if (entries.has(name)) throw new Error(`The ZIP contains duplicate path ${name}.`);
    entries.set(name, new Blob([content.slice().buffer], { type: mediaType(name) }));
  }
  return entries;
}
