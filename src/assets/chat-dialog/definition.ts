import type { MotionAssetDefinition } from "../types";

export type ChatSide = "left" | "right";

export type ChatMessage = {
  id: string;
  side: ChatSide;
  text: string;
};

export type ChatDialogParameters = {
  messages: ChatMessage[];
  fontSize: number;
  fontFamily: string;
  messageInterval: number;
  verticalGap: number;
  leftAvatarColor: string;
  rightAvatarColor: string;
  leftBubbleColor: string;
  rightBubbleColor: string;
};

export const MAX_CHAT_MESSAGES = 12;
export const MAX_MESSAGE_LENGTH = 120;

export const DEFAULT_CHAT_MESSAGES: ChatMessage[] = [
  { id: "message-1", side: "left", text: "Did you review today's footage?" },
  { id: "message-2", side: "left", text: "The pacing in version two feels better." },
  { id: "message-3", side: "right", text: "I did. Let's use version two." },
  { id: "message-4", side: "left", text: "Great, I'll send the final cut later." },
];

export function cloneChatDialogParameters(parameters: ChatDialogParameters): ChatDialogParameters {
  return {
    ...parameters,
    messages: parameters.messages.map((message) => ({ ...message })),
  };
}

export const chatDialogDefinition: MotionAssetDefinition<ChatDialogParameters> = {
  id: "chat-dialog",
  name: "Chat Dialog",
  description: "Custom chat bubbles appear one by one while the full conversation stays centered.",
  minInputCount: 0,
  maxInputCount: 2,
  width: 1920,
  height: 1080,
  frameRate: 30,
  defaultParameters: {
    messages: DEFAULT_CHAT_MESSAGES,
    fontSize: 1,
    fontFamily: "Microsoft YaHei",
    messageInterval: 0.9,
    verticalGap: 0.35,
    leftAvatarColor: "#000000",
    rightAvatarColor: "#ffffff",
    leftBubbleColor: "#000000",
    rightBubbleColor: "#f2f2f2",
  },
  getDuration(parameters) {
    return Math.max(1.8, Math.max(0, parameters.messages.length - 1) * parameters.messageInterval + 2.1);
  },
};
