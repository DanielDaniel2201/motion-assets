import type { CardStackParameters } from "../assets/card-stack/definition";

export type ExportImage = {
  id: string;
  name: string;
  width: number;
  height: number;
  file: Blob;
};

export type CardStackExportRequest = {
  id: string;
  type: "export";
  width: number;
  height: number;
  frameRate: number;
  parameters: CardStackParameters;
  images: ExportImage[];
};

export type ExportWorkerMessage =
  | { id: string; type: "progress"; progress: number; frame: number; totalFrames: number }
  | { id: string; type: "complete"; buffer: ArrayBuffer; mimeType: string }
  | { id: string; type: "error"; error: string };
