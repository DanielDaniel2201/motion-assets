import type { SourceImage } from "../types";
import type { ChatDialogParameters, ChatMessage } from "./definition";
import { getCenteredBlockTop, getMessageProgress } from "./timeline";

type RenderContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type ChatAvatarSources = { left?: SourceImage; right?: SourceImage };

type MessageLayout = {
  message: ChatMessage;
  lines: string[];
  bubbleWidth: number;
  bubbleHeight: number;
  rowHeight: number;
};

const FALLBACK_FONTS = '"PingFang SC", "Microsoft YaHei", sans-serif';
const CLOSING_PUNCTUATION = "，。！？；：、）》】」』,.!?;:";

function roundedRect(
  context: RenderContext,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function wrapText(context: RenderContext, text: string, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of (text || " ").split("\n")) {
    let line = "";
    for (const character of paragraph || " ") {
      const candidate = line + character;
      if (line && context.measureText(candidate).width > maxWidth) {
        if (CLOSING_PUNCTUATION.includes(character)) {
          lines.push(candidate);
          line = "";
        } else {
          lines.push(line);
          line = character;
        }
      } else {
        line = candidate;
      }
    }
    lines.push(line || " ");
  }
  return lines;
}

function drawAvatar(
  context: RenderContext,
  source: SourceImage | undefined,
  color: string,
  x: number,
  y: number,
  size: number,
) {
  context.save();
  context.beginPath();
  context.arc(x, y, size / 2, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = color;
  context.fillRect(x - size / 2, y - size / 2, size, size);
  if (source) {
    const scale = Math.max(size / source.width, size / source.height);
    const width = source.width * scale;
    const height = source.height * scale;
    context.drawImage(source.source, x - width / 2, y - height / 2, width, height);
  }
  context.restore();
}

export function renderChatDialogFrame(
  context: RenderContext,
  width: number,
  height: number,
  avatars: ChatAvatarSources,
  parameters: ChatDialogParameters,
  time: number,
) {
  context.clearRect(0, 0, width, height);
  const unit = Math.min(width / 1080, height / 1080);
  const fontPx = 42 * parameters.fontSize * unit;
  const lineHeight = fontPx * 1.42;
  const avatarSize = 76 * unit;
  const paddingX = 30 * unit;
  const paddingY = 20 * unit;
  const maxBubbleWidth = Math.min(width * 0.62, 760 * unit);
  const contentWidth = Math.min(width * 0.88, 1320 * unit);
  const centerX = width / 2;
  const contentLeft = centerX - contentWidth / 2;
  const contentRight = centerX + contentWidth / 2;
  const avatarGap = 22 * unit;
  const rowGap = (20 + parameters.verticalGap * 72) * unit;
  const font = `500 ${fontPx}px "${parameters.fontFamily.replaceAll('"', '\\"')}", ${FALLBACK_FONTS}`;

  context.save();
  context.font = font;
  const layouts: MessageLayout[] = parameters.messages.map((message) => {
    const lines = wrapText(context, message.text, maxBubbleWidth - paddingX * 2);
    const textWidth = Math.max(...lines.map((line) => context.measureText(line).width));
    const bubbleWidth = Math.min(maxBubbleWidth, textWidth + paddingX * 2);
    const bubbleHeight = lines.length * lineHeight + paddingY * 2;
    return { message, lines, bubbleWidth, bubbleHeight, rowHeight: Math.max(avatarSize, bubbleHeight) };
  });
  context.restore();

  const progresses = layouts.map((_, index) => getMessageProgress(index, time, parameters.messageInterval));
  const naturalHeight = layouts.reduce((total, layout, index) => (
    total + (layout.rowHeight + (index ? rowGap : 0)) * progresses[index]
  ), 0);
  if (naturalHeight <= 0.001) return;
  const groupScale = Math.min(1, height * 0.86 / naturalHeight);
  const blockHeight = naturalHeight * groupScale;
  let y = getCenteredBlockTop(height, blockHeight);

  context.save();
  context.translate(centerX, y);
  context.scale(groupScale, groupScale);
  context.translate(-centerX, 0);

  for (let index = 0; index < layouts.length; index += 1) {
    const layout = layouts[index];
    const progress = progresses[index];
    if (progress <= 0.001) continue;
    if (index) y = rowGap * progress;
    else y = 0;
    context.translate(0, y);

    const isLeft = layout.message.side === "left";
    const avatarX = isLeft ? contentLeft + avatarSize / 2 : contentRight - avatarSize / 2;
    const bubbleX = isLeft
      ? avatarX + avatarSize / 2 + avatarGap
      : avatarX - avatarSize / 2 - avatarGap - layout.bubbleWidth;
    const rowCenterY = layout.rowHeight * progress / 2;
    const bubbleY = rowCenterY - layout.bubbleHeight / 2;
    const enterX = (isLeft ? -1 : 1) * (1 - progress) * 28 * unit;

    context.save();
    context.translate(enterX, (1 - progress) * 16 * unit);
    context.globalAlpha = progress;
    drawAvatar(
      context,
      avatars[layout.message.side],
      isLeft ? parameters.leftAvatarColor : parameters.rightAvatarColor,
      avatarX,
      rowCenterY,
      avatarSize,
    );

    context.fillStyle = isLeft ? parameters.leftBubbleColor : parameters.rightBubbleColor;
    roundedRect(context, bubbleX, bubbleY, layout.bubbleWidth, layout.bubbleHeight, 22 * unit);
    context.fill();

    context.font = font;
    context.fillStyle = "#171815";
    context.textAlign = "left";
    context.textBaseline = "top";
    for (let lineIndex = 0; lineIndex < layout.lines.length; lineIndex += 1) {
      context.fillText(
        layout.lines[lineIndex],
        bubbleX + paddingX,
        bubbleY + paddingY + lineIndex * lineHeight,
      );
    }
    context.restore();
    context.translate(0, layout.rowHeight * progress);
  }
  context.restore();
}
