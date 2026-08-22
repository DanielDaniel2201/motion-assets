import type { CardStackParameters } from "../assets/card-stack/definition";
import type { ProgressBarParameters } from "../assets/progress-bar/definition";
import type { VideoPipParameters } from "../assets/video-pip/definition";

export type ExportImage = {
  id: string;
  name: string;
  width: number;
  height: number;
  file: Blob;
};

type ExportRequestBase = {
  id: string;
  type: "export";
  width: number;
  height: number;
  frameRate: number;
};

export type CardStackExportRequest = ExportRequestBase & {
  motion?: "card-stack";
  parameters: CardStackParameters;
  images: ExportImage[];
};

export type ProgressBarExportRequest = ExportRequestBase & {
  motion: "progress-bar";
  parameters: ProgressBarParameters;
};

export type VideoPipExportRequest = ExportRequestBase & {
  motion: "video-pip";
  parameters: VideoPipParameters;
  video: { width: number; height: number };
};

export type ExportRequest = CardStackExportRequest | ProgressBarExportRequest | VideoPipExportRequest;

export type ExportWorkerInput = ExportRequest | {
  id: string;
  type: "video-frame";
  bitmap: ImageBitmap;
};

export type ExportWorkerMessage =
  | { id: string; type: "progress"; progress: number; frame: number; totalFrames: number }
  | { id: string; type: "frame-request"; time: number }
  | { id: string; type: "complete"; buffer: ArrayBuffer; mimeType: string }
  | { id: string; type: "error"; error: string };
