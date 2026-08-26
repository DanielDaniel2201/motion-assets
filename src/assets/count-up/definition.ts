import type { MotionAssetDefinition } from "../types";

export type CountUpParameters = {
  start: number;
  end: number;
  duration: number;
  decimals: number;
  separator: boolean;
  easing: "ease-out" | "linear";
  prefix: string;
  suffix: string;
  fontSize: number;
  fontFamily: string;
  color: string;
};

export const countUpDefinition: MotionAssetDefinition<CountUpParameters> = {
  id: "count-up",
  name: "Count Up",
  description: "Animate a formatted number from one value to another.",
  minInputCount: 0,
  maxInputCount: 0,
  width: 1920,
  height: 1080,
  frameRate: 30,
  defaultParameters: {
    start: 0,
    end: 1000,
    duration: 2.5,
    decimals: 0,
    separator: true,
    easing: "ease-out",
    prefix: "",
    suffix: "+",
    fontSize: 1,
    fontFamily: "Segoe UI",
    color: "#000000",
  },
  getDuration(parameters) {
    return parameters.duration;
  },
};
