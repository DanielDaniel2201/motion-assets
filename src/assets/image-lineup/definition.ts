import type { MotionAssetDefinition } from "../types";
import type { CardStackParameters } from "../card-stack/definition";

export type ImageLineupParameters = CardStackParameters;

export const imageLineupDefinition: MotionAssetDefinition<ImageLineupParameters> = {
  id: "image-lineup",
  name: "Image Lineup",
  description: "Images alternate in from below and above into a centered row.",
  minInputCount: 2,
  maxInputCount: 8,
  width: 1920,
  height: 1080,
  frameRate: 30,
  defaultParameters: {
    animationSpeed: 1,
    spread: 1,
    rotation: 0,
    stagger: 0.12,
    holdDuration: 1.5,
  },
  getDuration(parameters, inputCount) {
    const entranceDuration = 0.64 / parameters.animationSpeed;
    return inputCount * entranceDuration + Math.max(0, inputCount - 1) * parameters.stagger + parameters.holdDuration;
  },
};
