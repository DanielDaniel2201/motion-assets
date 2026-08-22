import { cardStackDefinition } from "./card-stack/definition";
import { progressBarDefinition } from "./progress-bar/definition";
import { videoPipDefinition } from "./video-pip/definition";

export const motionDefinitions = [cardStackDefinition, progressBarDefinition, videoPipDefinition] as const;

export type MotionId = (typeof motionDefinitions)[number]["id"];
