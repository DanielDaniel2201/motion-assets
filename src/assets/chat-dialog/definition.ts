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
  { id: "message-1", side: "left", text: "今天的素材看过了吗？" },
  { id: "message-2", side: "left", text: "第二版的节奏更顺。" },
  { id: "message-3", side: "right", text: "看过了，我就用第二版。" },
  { id: "message-4", side: "left", text: "好，晚点发你成片。" },
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
    leftAvatarColor: "#183a6d",
    rightAvatarColor: "#f3a6bd",
    leftBubbleColor: "#f7a8c4",
    rightBubbleColor: "#ffffff",
  },
  getDuration(parameters) {
    return Math.max(1.8, Math.max(0, parameters.messages.length - 1) * parameters.messageInterval + 2.1);
  },
};
