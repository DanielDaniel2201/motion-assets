import type { MotionAssetDefinition } from "../types";

export type BlurTextParameters = {
  text: string;
  duration: number;
  blur: number;
  stagger: number;
  distance: number;
  direction: "up" | "down" | "left" | "right";
  splitBy: "character" | "word" | "line";
  fontSize: number;
  fontFamily: string;
  color: string;
};

export const blurTextDefinition: MotionAssetDefinition<BlurTextParameters> = {
  id: "blur-text",
  name: "Blur Text",
  description: "Words sharpen from a soft blur with a gentle stagger.",
  minInputCount: 0,
  maxInputCount: 0,
  width: 1920,
  height: 1080,
  frameRate: 30,
  defaultParameters: {
    text: "Bring ideas into focus",
    duration: 2.5,
    blur: 22,
    stagger: 0.12,
    distance: 0.22,
    direction: "up",
    splitBy: "word",
    fontSize: 1,
    fontFamily: "Segoe UI",
    color: "#171815",
  },
  getDuration(parameters) {
    return parameters.duration;
  },
};
