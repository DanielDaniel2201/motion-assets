import type { BlurTextParameters } from "../assets/blur-text/definition";
import type { CardStackParameters } from "../assets/card-stack/definition";
import type { ChatDialogParameters } from "../assets/chat-dialog/definition";
import type { CountUpParameters } from "../assets/count-up/definition";
import type { LogoLoopParameters } from "../assets/logo-loop/definition";
import type { MermaidFlowParameters } from "../assets/mermaid-flow/definition";
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
  motion?: "card-stack" | "image-lineup";
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

export type ChatDialogExportRequest = ExportRequestBase & {
  motion: "chat-dialog";
  parameters: ChatDialogParameters;
  avatars: {
    left?: { width: number; height: number; file: Blob };
    right?: { width: number; height: number; file: Blob };
  };
};

export type BlurTextExportRequest = ExportRequestBase & {
  motion: "blur-text";
  parameters: BlurTextParameters;
};

export type CountUpExportRequest = ExportRequestBase & {
  motion: "count-up";
  parameters: CountUpParameters;
};

export type LogoLoopExportRequest = ExportRequestBase & {
  motion: "logo-loop";
  parameters: LogoLoopParameters;
  images: ExportImage[];
};

export type MermaidFlowExportRequest = ExportRequestBase & {
  motion: "mermaid-flow";
  parameters: MermaidFlowParameters;
};

export type ExportRequest = CardStackExportRequest | ProgressBarExportRequest | VideoPipExportRequest | ChatDialogExportRequest | BlurTextExportRequest | CountUpExportRequest | LogoLoopExportRequest | MermaidFlowExportRequest;

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
