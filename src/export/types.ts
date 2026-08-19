import type { CardStackParameters } from "../assets/card-stack/definition";
import type { ProgressBarParameters } from "../assets/progress-bar/definition";

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

export type ExportRequest = CardStackExportRequest | ProgressBarExportRequest;

export type ExportWorkerMessage =
  | { id: string; type: "progress"; progress: number; frame: number; totalFrames: number }
  | { id: string; type: "complete"; buffer: ArrayBuffer; mimeType: string }
  | { id: string; type: "error"; error: string };
