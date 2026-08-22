import type { ExportRequest, ExportWorkerMessage } from "./types";

export type ExportProgress = {
  progress: number;
  frame: number;
  totalFrames: number;
};

export type ExportTask = {
  promise: Promise<Blob>;
  cancel: () => void;
};

export function startExport(
  request: ExportRequest,
  onProgress: (progress: ExportProgress) => void,
  getVideoFrame?: (time: number) => Promise<ImageBitmap>,
): ExportTask {
  const worker = new Worker(new URL("./export.worker.ts", import.meta.url), {
    type: "module",
  });
  let settled = false;
  let rejectTask: ((reason?: unknown) => void) | null = null;

  const cleanup = () => {
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();
  };

  const promise = new Promise<Blob>((resolve, reject) => {
    rejectTask = reject;
    worker.onmessage = async (event: MessageEvent<ExportWorkerMessage>) => {
      const message = event.data;
      if (message.id !== request.id || settled) return;
      if (message.type === "frame-request") {
        try {
          if (!getVideoFrame) throw new Error("The uploaded video decoder is unavailable.");
          const bitmap = await getVideoFrame(message.time);
          if (settled) {
            bitmap.close();
            return;
          }
          worker.postMessage({ id: request.id, type: "video-frame", bitmap }, [bitmap]);
        } catch (error) {
          settled = true;
          cleanup();
          reject(error instanceof Error ? error : new Error("Could not decode the uploaded video frame."));
        }
        return;
      }
      if (message.type === "progress") {
        onProgress(message);
        return;
      }
      settled = true;
      cleanup();
      if (message.type === "error") {
        reject(new Error(message.error));
      } else {
        resolve(new Blob([message.buffer], { type: message.mimeType }));
      }
    };
    worker.onerror = (event) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(event.message || "The export worker stopped unexpectedly."));
    };
    worker.postMessage(request);
  });

  return {
    promise,
    cancel() {
      if (settled) return;
      settled = true;
      cleanup();
      rejectTask?.(new DOMException("Export canceled.", "AbortError"));
    },
  };
}

export function createMovDownload(blob: Blob, assetId = "motion-asset") {
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  return { url, filename: `${assetId}-${stamp}.mov` };
}

export function triggerMovDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}
