import type { MotionAssetDefinition } from "../types";

export type LogoLoopParameters = {
  duration: number;
  speed: number;
  logoSize: number;
  gap: number;
  fadeEdges: number;
  positionY: number;
  direction: "left" | "right";
};

export const logoLoopDefinition: MotionAssetDefinition<LogoLoopParameters> = {
  id: "logo-loop",
  name: "Logo Loop",
  description: "A seamless row of uploaded or built-in transparent logos.",
  minInputCount: 1,
  maxInputCount: 12,
  width: 1920,
  height: 1080,
  frameRate: 30,
  defaultParameters: {
    duration: 6,
    speed: 0.18,
    logoSize: 0.16,
    gap: 0.1,
    fadeEdges: 0.08,
    positionY: 0.5,
    direction: "left",
  },
  getDuration(parameters) {
    return parameters.duration;
  },
};

export const BUILT_IN_LOGOS = [
  { id: "chatgpt", name: "ChatGPT", path: "/builtins/logos/chatgpt.svg" },
  { id: "claude", name: "Claude", path: "/builtins/logos/claude.svg" },
  { id: "grok", name: "Grok", path: "/builtins/logos/grok.svg" },
  { id: "gemini", name: "Gemini", path: "/builtins/logos/gemini.svg" },
] as const;
