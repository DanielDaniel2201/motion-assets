/// <reference lib="webworker" />

import { cardStackDefinition } from "../assets/card-stack/definition";
import { renderCardStackFrame } from "../assets/card-stack/render";
import type { SourceImage } from "../assets/types";
import type { CardStackExportRequest, ExportWorkerMessage } from "./types";

function post(message: ExportWorkerMessage, transfer?: Transferable[]) {
  self.postMessage(message, { transfer });
}

self.onmessage = async (event: MessageEvent<CardStackExportRequest>) => {
  const request = event.data;
  if (request.type !== "export") return;
  const bitmaps: ImageBitmap[] = [];
  let encoder: Awaited<ReturnType<typeof import("prores-wasm-encoder")["createProResEncoder"]>> | null = null;

  try {
    if (
      request.images.length < cardStackDefinition.minInputCount
      || request.images.length > cardStackDefinition.maxInputCount
    ) {
      throw new Error("Card Stack requires 2–8 images.");
    }
    if (request.width % 2 || request.height % 2) {
      throw new Error("Export dimensions must be even numbers.");
    }
    if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") {
      throw new Error("This browser does not support local offscreen rendering. Use the latest Chrome.");
    }

    for (const image of request.images) {
      bitmaps.push(await createImageBitmap(image.file));
    }
    const sources: SourceImage[] = request.images.map((image, index) => ({
      id: image.id,
      name: image.name,
      width: image.width,
      height: image.height,
      source: bitmaps[index],
    }));

    const canvas = new OffscreenCanvas(request.width, request.height);
    const context = canvas.getContext("2d", {
      alpha: true,
      willReadFrequently: true,
    });
    if (!context) throw new Error("Could not create the local RGBA renderer.");

    const { createProResEncoder, ProResProfile } = await import("prores-wasm-encoder");
    encoder = await createProResEncoder();
    encoder.initialize({
      width: request.width,
      height: request.height,
      frameRate: request.frameRate,
      profile: ProResProfile.P4444,
      range: "limited",
    });

    const duration = cardStackDefinition.getDuration(request.parameters, request.images.length);
    const totalFrames = Math.max(1, Math.ceil(duration * request.frameRate));
    for (let frame = 0; frame < totalFrames; frame += 1) {
      renderCardStackFrame(
        context,
        request.width,
        request.height,
        sources,
        request.parameters,
        frame / request.frameRate,
      );
      const rgba = context.getImageData(0, 0, request.width, request.height).data;
      encoder.addFrameRgba(rgba);
      if (frame % 2 === 0 || frame === totalFrames - 1) {
        post({
          id: request.id,
          type: "progress",
          progress: (frame + 1) / totalFrames,
          frame: frame + 1,
          totalFrames,
        });
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }

    const encoded = encoder.finalize();
    const buffer = new ArrayBuffer(encoded.byteLength);
    new Uint8Array(buffer).set(encoded);
    post(
      { id: request.id, type: "complete", buffer, mimeType: "video/quicktime" },
      [buffer],
    );
  } catch (error) {
    const message =
      error instanceof WebAssembly.RuntimeError
        ? "The encoder ran out of browser memory. Close other tabs and try again in desktop Chrome."
        : error instanceof Error
          ? error.message
          : "MOV export failed.";
    post({ id: request.id, type: "error", error: message });
  } finally {
    encoder?.destroy();
    for (const bitmap of bitmaps) bitmap.close();
  }
};

export {};
