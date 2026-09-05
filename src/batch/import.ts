import { blurTextDefinition } from "../assets/blur-text/definition";
import { cardStackDefinition } from "../assets/card-stack/definition";
import { chatDialogDefinition, MAX_CHAT_MESSAGES, MAX_MESSAGE_LENGTH } from "../assets/chat-dialog/definition";
import { countUpDefinition } from "../assets/count-up/definition";
import { imageLineupDefinition } from "../assets/image-lineup/definition";
import { logoLoopDefinition } from "../assets/logo-loop/definition";
import { progressBarDefinition, parseProgressBarParameters } from "../assets/progress-bar/definition";
import { videoPipDefinition } from "../assets/video-pip/definition";
import { OUTPUT_FORMATS, type OutputFormatId } from "../export/formats";
import { mediaType, normalizeZipPath, readZip } from "./zip";

export type BatchInstance = {
  id: string;
  name: string;
  motion: MotionId;
  format: OutputFormatId;
  parameters: Record<string, unknown>;
  files: File[];
};

export type BatchDocument = { version: 1; instances: BatchInstance[] };

const definitions = {
  "card-stack": cardStackDefinition,
  "image-lineup": imageLineupDefinition,
  "progress-bar": progressBarDefinition,
  "video-pip": videoPipDefinition,
  "chat-dialog": chatDialogDefinition,
  "blur-text": blurTextDefinition,
  "count-up": countUpDefinition,
  "logo-loop": logoLoopDefinition,
} as const;

type MotionId = keyof typeof definitions;

const numberBounds: Record<string, [number, number]> = {
  "card-stack.animationSpeed": [0.6, 1.6], "card-stack.spread": [0.65, 1.3], "card-stack.rotation": [0, 1.5], "card-stack.stagger": [0.06, 0.24], "card-stack.holdDuration": [0.5, 3],
  "image-lineup.animationSpeed": [0.6, 1.6], "image-lineup.spread": [0.65, 1.3], "image-lineup.rotation": [0, 1.5], "image-lineup.stagger": [0.06, 0.24], "image-lineup.holdDuration": [0.5, 3],
  "video-pip.dragDuration": [0.35, 2], "video-pip.videoDuration": [0.05, 15],
  "logo-loop.duration": [2, 20], "logo-loop.speed": [0.04, 0.5], "logo-loop.logoSize": [0.06, 0.3], "logo-loop.gap": [0.02, 0.25], "logo-loop.fadeEdges": [0, 0.25], "logo-loop.positionY": [0.15, 0.85],
  "progress-bar.duration": [3, 600], "progress-bar.separatorThickness": [0.4, 2.2], "progress-bar.fontSize": [0.5, 2],
  "chat-dialog.fontSize": [0.6, 1.6], "chat-dialog.messageInterval": [0.35, 2], "chat-dialog.verticalGap": [0, 1],
  "blur-text.duration": [1, 8], "blur-text.blur": [4, 48], "blur-text.stagger": [0, 0.35], "blur-text.distance": [0, 1], "blur-text.fontSize": [0.5, 1.8],
  "count-up.start": [-1e12, 1e12], "count-up.end": [-1e12, 1e12], "count-up.duration": [0.5, 10], "count-up.decimals": [0, 4], "count-up.fontSize": [0.5, 1.8],
};

const enums: Record<string, readonly string[]> = {
  "logo-loop.direction": ["left", "right"],
  "blur-text.direction": ["up", "down", "left", "right"],
  "blur-text.splitBy": ["character", "word", "line"],
  "count-up.easing": ["ease-out", "linear"],
};

const stringLimits: Record<string, number> = {
  "blur-text.text": 120,
  "count-up.prefix": 8,
  "count-up.suffix": 8,
};

const limits: Record<MotionId, { max: number; kind?: "image" | "video"; maxBytes?: number }> = {
  "card-stack": { max: 8, kind: "image", maxBytes: 25 * 1024 * 1024 }, "image-lineup": { max: 8, kind: "image", maxBytes: 25 * 1024 * 1024 }, "video-pip": { max: 1, kind: "video", maxBytes: 200 * 1024 * 1024 }, "logo-loop": { max: 12, kind: "image", maxBytes: 10 * 1024 * 1024 }, "chat-dialog": { max: 2, kind: "image", maxBytes: 10 * 1024 * 1024 },
  "progress-bar": { max: 0 }, "blur-text": { max: 0 }, "count-up": { max: 0 },
};

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const isMotionId = (value: unknown): value is MotionId => typeof value === "string" && value in definitions;
const isFormat = (value: unknown): value is OutputFormatId => OUTPUT_FORMATS.some(({ id }) => id === value);
const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

function validateParameters(motion: MotionId, value: unknown, label: string) {
  if (value === undefined) return structuredClone(definitions[motion].defaultParameters) as Record<string, unknown>;
  if (!isRecord(value)) throw new Error(`${label}.parameters must be an object.`);
  const defaults = definitions[motion].defaultParameters as Record<string, unknown>;
  for (const key of Object.keys(value)) {
    if (!(key in defaults)) throw new Error(`${label}.parameters.${key} is not supported.`);
  }
  const parameters = { ...structuredClone(defaults), ...structuredClone(value) } as Record<string, unknown>;
  for (const [key, current] of Object.entries(parameters)) {
    const path = `${motion}.${key}`;
    const expected = defaults[key];
    if (typeof expected === "number") {
      if (typeof current !== "number" || !Number.isFinite(current)) throw new Error(`${label}.parameters.${key} must be a finite number.`);
      const [min, max] = numberBounds[path] ?? [-1e9, 1e9];
      if (current < min || current > max) throw new Error(`${label}.parameters.${key} must be between ${min} and ${max}.`);
    } else if (typeof expected === "boolean" && typeof current !== "boolean") {
      throw new Error(`${label}.parameters.${key} must be true or false.`);
    } else if (typeof expected === "string") {
      const maxLength = stringLimits[path] ?? (key === "fontFamily" ? 100 : 5000);
      if (typeof current !== "string" || current.length > maxLength) throw new Error(`${label}.parameters.${key} must be a string no longer than ${maxLength} characters.`);
      if (enums[path] && !enums[path].includes(current)) throw new Error(`${label}.parameters.${key} has an unsupported value.`);
      if (/color$/i.test(key) && !isHexColor(current)) throw new Error(`${label}.parameters.${key} must be a six-digit hex color.`);
    }
  }
  if (motion === "progress-bar" && !parseProgressBarParameters(parameters)) throw new Error(`${label}.parameters contains invalid Progress Bar chapters or values.`);
  if (motion === "chat-dialog") {
    const messages = parameters.messages;
    if (!Array.isArray(messages) || messages.length > MAX_CHAT_MESSAGES || !messages.every((message) =>
      isRecord(message) && typeof message.id === "string" && (message.side === "left" || message.side === "right") && typeof message.text === "string" && message.text.length <= MAX_MESSAGE_LENGTH,
    )) throw new Error(`${label}.parameters.messages is invalid.`);
  }
  if (motion === "count-up" && !Number.isInteger(parameters.decimals)) throw new Error(`${label}.parameters.decimals must be an integer.`);
  return parameters;
}

export function parseBatchManifest(value: unknown, assets = new Map<string, Blob>(), manifestPath = "motion-batch.json"): BatchDocument {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.instances)) throw new Error("The manifest must contain version 1 and an instances array.");
  if (!value.instances.length || value.instances.length > 50) throw new Error("A batch must contain between 1 and 50 instances.");
  const folder = normalizeZipPath(manifestPath).split("/").slice(0, -1).join("/");
  const ids = new Set<string>();
  const instances = value.instances.map((entry, index): BatchInstance => {
    const label = `instances[${index}]`;
    if (!isRecord(entry) || !isMotionId(entry.motion)) throw new Error(`${label}.motion is not a supported motion id.`);
    if (entry.id !== undefined && (typeof entry.id !== "string" || !entry.id.trim())) throw new Error(`${label}.id must be a non-empty string.`);
    if (entry.name !== undefined && (typeof entry.name !== "string" || !entry.name.trim())) throw new Error(`${label}.name must be a non-empty string.`);
    const id = typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : `instance-${index + 1}`;
    if (id.length > 80 || ids.has(id)) throw new Error(`${label}.id must be unique and no longer than 80 characters.`);
    ids.add(id);
    const format = entry.format === undefined ? "16:9" : entry.format;
    if (!isFormat(format)) throw new Error(`${label}.format is not supported.`);
    const refs = entry.assets === undefined ? [] : entry.assets;
    if (!Array.isArray(refs) || !refs.every((ref) => typeof ref === "string")) throw new Error(`${label}.assets must be an array of ZIP-relative paths.`);
    const limit = limits[entry.motion];
    if (refs.length > limit.max) throw new Error(`${label}.assets supports at most ${limit.max} file${limit.max === 1 ? "" : "s"}.`);
    const files = refs.map((ref) => {
      const relativePath = normalizeZipPath(ref);
      const path = normalizeZipPath(folder ? `${folder}/${relativePath}` : relativePath);
      const blob = assets.get(path);
      if (!blob) throw new Error(`${label}.assets references missing file ${ref}.`);
      const type = mediaType(path);
      if (limit.kind && !type.startsWith(`${limit.kind}/`)) throw new Error(`${label}.assets file ${ref} is not ${limit.kind} media.`);
      if (limit.maxBytes && blob.size > limit.maxBytes) throw new Error(`${label}.assets file ${ref} exceeds its ${Math.round(limit.maxBytes / 1024 / 1024)} MB limit.`);
      return new File([blob], path.split("/").at(-1)!, { type });
    });
    return {
      id,
      name: typeof entry.name === "string" && entry.name.trim() ? entry.name.trim().slice(0, 120) : definitions[entry.motion].name,
      motion: entry.motion,
      format,
      parameters: validateParameters(entry.motion, entry.parameters, label),
      files,
    };
  });
  return { version: 1, instances };
}

export async function importBatchFile(file: File) {
  if (file.size > 512 * 1024 * 1024) throw new Error("Import files must be no larger than 512 MB.");
  if (file.name.toLowerCase().endsWith(".json")) return parseBatchManifest(JSON.parse(await file.text()));
  if (!file.name.toLowerCase().endsWith(".zip")) throw new Error("Drop a .json or .zip file.");
  const entries = await readZip(file);
  const manifests = [...entries.keys()].filter((name) => name.toLowerCase().endsWith(".json"));
  const preferred = manifests.filter((name) => name.toLowerCase().endsWith("motion-batch.json"));
  const manifestPath = preferred.length === 1 ? preferred[0] : manifests.length === 1 ? manifests[0] : null;
  if (!manifestPath) throw new Error("The ZIP must contain exactly one JSON manifest (preferably motion-batch.json).");
  return parseBatchManifest(JSON.parse(await entries.get(manifestPath)!.text()), entries, manifestPath);
}
