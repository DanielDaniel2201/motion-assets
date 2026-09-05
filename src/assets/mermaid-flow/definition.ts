import type { MotionAssetDefinition } from "../types";
import { getMermaidFlowDuration } from "./timeline";

export type MermaidFlowParameters = {
  mermaid: string;
  animationSpeed: number;
  nodeColor: string;
  textColor: string;
  lineColor: string;
  fontFamily: string;
};

export const mermaidFlowDefinition: MotionAssetDefinition<MermaidFlowParameters> = {
  id: "mermaid-flow",
  name: "Mermaid Flow",
  description: "Build a Mermaid flowchart one node and connection at a time.",
  minInputCount: 0,
  maxInputCount: 0,
  width: 1920,
  height: 1080,
  frameRate: 30,
  defaultParameters: {
    mermaid: `flowchart LR
    A[User] --> B[Browser]
    B --> C[Agent]
    C --> D[API]`,
    animationSpeed: 1,
    nodeColor: "#000000",
    textColor: "#ffffff",
    lineColor: "#000000",
    fontFamily: "Segoe UI",
  },
  getDuration(parameters) {
    return getMermaidFlowDuration(parameters.mermaid, parameters.animationSpeed);
  },
};
