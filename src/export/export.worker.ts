/// <reference lib="webworker" />

import { cardStackDefinition } from "../assets/card-stack/definition";
import { renderCardStackFrame } from "../assets/card-stack/render";
import { progressBarDefinition } from "../assets/progress-bar/definition";
import { renderProgressBarFrame } from "../assets/progress-bar/render";
import { VIDEO_PIP_DRAG_START, videoPipDefinition } from "../assets/video-pip/definition";
import { renderVideoPipFrame } from "../assets/video-pip/render";
import type { SourceImage } from "../assets/types";
import type { ExportRequest, ExportWorkerInput, ExportWorkerMessage } from "./types";

function post(message: ExportWorkerMessage, transfer?: Transferable[]) {
  self.postMessage(message, { transfer });
}

function isProgressBarRequest(
  request: ExportRequest,
): request is Extract<ExportRequest, { motion: "progress-bar" }> {
  return request.motion === "progress-bar";
}

function isVideoPipRequest(
  request: ExportRequest,
): request is Extract<ExportRequest, { motion: "video-pip" }> {
  return request.motion === "video-pip";
}

let pendingFrame: { id: string; resolve: (bitmap: ImageBitmap) => void } | null = null;

function requestVideoFrame(id: string, time: number) {
  if (pendingFrame) throw new Error("The video decoder returned frames out of order.");
  post({ id, type: "frame-request", time });
  return new Promise<ImageBitmap>((resolve) => {
    pendingFrame = { id, resolve };
  });
}

async function runExport(request: ExportRequest) {
  const bitmaps: ImageBitmap[] = [];
  let encoder: Awaited<ReturnType<typeof import("prores-wasm-encoder")["createProResEncoder"]>> | null = null;

  try {
    if (request.width % 2 || request.height % 2) {
      throw new Error("Export dimensions must be even numbers.");
    }
    if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") {
      throw new Error("This browser does not support local offscreen rendering. Use the latest Chrome.");
    }

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

    let duration: number;
    let draw: ((time: number) => void) | null = null;

    if (isProgressBarRequest(request)) {
      duration = progressBarDefinition.getDuration(request.parameters, 0);
      draw = (time) => {
        renderProgressBarFrame(context, request.width, request.height, request.parameters, time);
      };
    } else if (isVideoPipRequest(request)) {
      duration = videoPipDefinition.getDuration(request.parameters, 1);
    } else {
      if (
        request.images.length < cardStackDefinition.minInputCount
        || request.images.length > cardStackDefinition.maxInputCount
      ) {
        throw new Error("Card Stack requires 2–8 images.");
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
      duration = cardStackDefinition.getDuration(request.parameters, request.images.length);
      draw = (time) => {
        renderCardStackFrame(context, request.width, request.height, sources, request.parameters, time);
      };
    }

    const totalFrames = Math.max(1, Math.ceil(duration * request.frameRate));
    for (let frame = 0; frame < totalFrames; frame += 1) {
      const time = frame / request.frameRate;
      if (isVideoPipRequest(request)) {
        let bitmap: ImageBitmap | null = null;
        if (time >= VIDEO_PIP_DRAG_START) {
          bitmap = await requestVideoFrame(
            request.id,
            Math.min(time - VIDEO_PIP_DRAG_START, Math.max(0, request.parameters.videoDuration - 1 / request.frameRate)),
          );
        }
        renderVideoPipFrame(
          context,
          request.width,
          request.height,
          bitmap,
          request.video,
          request.parameters,
          time,
        );
        bitmap?.close();
      } else {
        draw!(time);
      }
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
    pendingFrame = null;
    encoder?.destroy();
    for (const bitmap of bitmaps) bitmap.close();
  }
}

self.onmessage = (event: MessageEvent<ExportWorkerInput>) => {
  const message = event.data;
  if (message.type === "video-frame") {
    if (pendingFrame?.id === message.id) {
      const resolve = pendingFrame.resolve;
      pendingFrame = null;
      resolve(message.bitmap);
    } else {
      message.bitmap.close();
    }
    return;
  }
  void runExport(message);
};

export {};
