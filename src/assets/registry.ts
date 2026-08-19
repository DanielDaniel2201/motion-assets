import { cardStackDefinition } from "./card-stack/definition";
import { progressBarDefinition } from "./progress-bar/definition";

export const motionDefinitions = [cardStackDefinition, progressBarDefinition] as const;

export type MotionId = (typeof motionDefinitions)[number]["id"];
