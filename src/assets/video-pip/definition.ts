import type { MotionAssetDefinition } from "../types";

export type VideoPipParameters = {
  dragDuration: number;
  videoDuration: number;
};

export const videoPipDefinition: MotionAssetDefinition<VideoPipParameters> = {
  id: "video-pip",
  name: "Video PiP Drag",
  description: "A cursor moves from center and drags an uploaded video open from a safe upper-left anchor.",
  minInputCount: 1,
  maxInputCount: 1,
  width: 1920,
  height: 1080,
  frameRate: 30,
  defaultParameters: {
    dragDuration: 0.9,
    videoDuration: 3,
  },
  getDuration(parameters) {
    return VIDEO_PIP_DRAG_START + Math.max(parameters.dragDuration, parameters.videoDuration);
  },
};

export const VIDEO_PIP_DRAG_START = 0.9;
