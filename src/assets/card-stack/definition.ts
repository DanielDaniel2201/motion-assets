import type { MotionAssetDefinition } from "../types";

export type CardStackParameters = {
  animationSpeed: number;
  spread: number;
  rotation: number;
  stagger: number;
  holdDuration: number;
};

export const cardStackDefinition: MotionAssetDefinition<CardStackParameters> = {
  id: "card-stack",
  name: "Card Stack",
  description: "Two to eight cards snap into a stack, then unfold with depth.",
  minInputCount: 2,
  maxInputCount: 8,
  width: 1920,
  height: 1080,
  frameRate: 30,
  defaultParameters: {
    animationSpeed: 1,
    spread: 1,
    rotation: 1,
    stagger: 0.12,
    holdDuration: 1.5,
  },
  getDuration(parameters, inputCount) {
    const enterDuration = 0.56 / parameters.animationSpeed;
    const lastEntrance = parameters.stagger * Math.max(0, inputCount - 1);
    const spreadDuration = 0.92 / parameters.animationSpeed;
    return lastEntrance + enterDuration * 0.72 + spreadDuration + parameters.holdDuration;
  },
};
