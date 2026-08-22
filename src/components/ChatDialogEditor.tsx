import { useEffect, useRef, useState } from "react";
import {
  chatDialogDefinition,
  cloneChatDialogParameters,
  MAX_CHAT_MESSAGES,
  MAX_MESSAGE_LENGTH,
  type ChatDialogParameters,
  type ChatSide,
} from "../assets/chat-dialog/definition";
import { renderChatDialogFrame, type ChatAvatarSources } from "../assets/chat-dialog/render";
import type { SourceImage } from "../assets/types";
import { createMovDownload, startExport, triggerMovDownload, type ExportProgress, type ExportTask } from "../export/client";
import { OUTPUT_FORMATS, type OutputFormatId } from "../export/formats";
import { ChevronLeftIcon, CloseIcon, ExportIcon, ReplayIcon } from "./icons";
import { ExportStatus } from "./ExportStatus";
import { ParameterSlider } from "./ParameterSlider";
import { PreviewCanvas } from "./PreviewCanvas";

type ChatDialogEditorProps = { onBack: () => void };

type UploadedAvatar = {
  file: File;
  bitmap: ImageBitmap;
  previewUrl: string;
};

const FONT_FAMILIES = ["Microsoft YaHei", "Segoe UI", "PingFang SC", "SimHei", "KaiTi", "Arial"];
const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
const MAX_AVATAR_PIXELS = 16_000_000;

function avatarSource(side: ChatSide, avatar?: UploadedAvatar): SourceImage | undefined {
  if (!avatar) return undefined;
  return {
    id: `${side}-avatar`,
    name: avatar.file.name,
    width: avatar.bitmap.width,
    height: avatar.bitmap.height,
    source: avatar.bitmap,
  };
}

function closeAvatar(avatar?: UploadedAvatar) {
  avatar?.bitmap.close();
  if (avatar) URL.revokeObjectURL(avatar.previewUrl);
}

export function ChatDialogEditor({ onBack }: ChatDialogEditorProps) {
  const [parameters, setParameters] = useState<ChatDialogParameters>(() =>
    cloneChatDialogParameters(chatDialogDefinition.defaultParameters),
  );
  const [avatars, setAvatars] = useState<Partial<Record<ChatSide, UploadedAvatar>>>({});
  const [outputFormatId, setOutputFormatId] = useState<OutputFormatId>("16:9");
  const [replayToken, setReplayToken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ url: string; filename: string; size: number } | null>(null);
  const exportTaskRef = useRef<ExportTask | null>(null);
  const exportResultRef = useRef(exportResult);
  const avatarsRef = useRef(avatars);
  exportResultRef.current = exportResult;
  avatarsRef.current = avatars;

  useEffect(() => () => {
    exportTaskRef.current?.cancel();
    if (exportResultRef.current) URL.revokeObjectURL(exportResultRef.current.url);
    closeAvatar(avatarsRef.current.left);
    closeAvatar(avatarsRef.current.right);
  }, []);

  const outputFormat = OUTPUT_FORMATS.find((format) => format.id === outputFormatId)!;
  const duration = chatDialogDefinition.getDuration(parameters, 0);
  const avatarSources: ChatAvatarSources = {
    left: avatarSource("left", avatars.left),
    right: avatarSource("right", avatars.right),
  };

  const updateParameters = (
    updater: (current: ChatDialogParameters) => ChatDialogParameters,
    replay = true,
  ) => {
    setParameters(updater);
    if (replay) setReplayToken((token) => token + 1);
  };

  const updateField = <Key extends keyof Omit<ChatDialogParameters, "messages">>(
    key: Key,
    value: ChatDialogParameters[Key],
  ) => updateParameters((current) => ({ ...current, [key]: value }));

  const updateMessage = (id: string, patch: { side?: ChatSide; text?: string }) => {
    updateParameters((current) => ({
      ...current,
      messages: current.messages.map((message) => message.id === id ? { ...message, ...patch } : message),
    }));
  };

  const addMessage = () => {
    if (parameters.messages.length >= MAX_CHAT_MESSAGES) return;
    const lastSide = parameters.messages.at(-1)?.side ?? "left";
    updateParameters((current) => ({
      ...current,
      messages: [...current.messages, { id: crypto.randomUUID(), side: lastSide, text: "新消息" }],
    }));
  };

  const removeMessage = (id: string) => {
    updateParameters((current) => ({
      ...current,
      messages: current.messages.filter((message) => message.id !== id),
    }));
  };

  const uploadAvatar = async (side: ChatSide, file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image file.`);
      if (file.size > MAX_AVATAR_BYTES) throw new Error(`${file.name} is larger than 10 MB.`);
      const bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > MAX_AVATAR_PIXELS) {
        bitmap.close();
        throw new Error(`${file.name} exceeds the 16-megapixel safety limit.`);
      }
      const uploaded = { file, bitmap, previewUrl: URL.createObjectURL(file) };
      setAvatars((current) => {
        closeAvatar(current[side]);
        return { ...current, [side]: uploaded };
      });
      setReplayToken((token) => token + 1);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Chrome could not decode that avatar.");
    }
  };

  const removeAvatar = (side: ChatSide) => {
    setAvatars((current) => {
      closeAvatar(current[side]);
      const next = { ...current };
      delete next[side];
      return next;
    });
    setReplayToken((token) => token + 1);
  };

  const exportMov = async () => {
    if (!parameters.messages.length || isExporting) return;
    setError(null);
    if (exportResult) {
      URL.revokeObjectURL(exportResult.url);
      setExportResult(null);
    }
    setIsExporting(true);
    setExportProgress({ progress: 0, frame: 0, totalFrames: Math.ceil(duration * chatDialogDefinition.frameRate) });
    const task = startExport({
      id: crypto.randomUUID(),
      type: "export",
      motion: "chat-dialog",
      width: outputFormat.width,
      height: outputFormat.height,
      frameRate: chatDialogDefinition.frameRate,
      parameters,
      avatars: {
        left: avatars.left ? { width: avatars.left.bitmap.width, height: avatars.left.bitmap.height, file: avatars.left.file } : undefined,
        right: avatars.right ? { width: avatars.right.bitmap.width, height: avatars.right.bitmap.height, file: avatars.right.file } : undefined,
      },
    }, setExportProgress);
    exportTaskRef.current = task;
    try {
      const blob = await task.promise;
      const download = createMovDownload(blob, chatDialogDefinition.id);
      setExportResult({ ...download, size: blob.size });
      triggerMovDownload(download.url, download.filename);
    } catch (exportError) {
      if (!(exportError instanceof DOMException && exportError.name === "AbortError")) {
        setError(exportError instanceof Error ? exportError.message : "MOV export failed.");
      }
    } finally {
      exportTaskRef.current = null;
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="back-button" type="button" onClick={onBack}><ChevronLeftIcon /> Back to motions</button>
        <div className="asset-title"><strong>Chat Dialog</strong></div>
      </header>

      <div className="workspace">
        <aside className="panel assets-panel chat-assets-panel">
          <div className="panel-heading"><h2>Conversation <span>up to {MAX_CHAT_MESSAGES}</span></h2></div>
          <div className="avatar-list">
            {(["left", "right"] as const).map((side) => (
              <div className="avatar-source" key={side}>
                <label className="avatar-upload" style={{ background: side === "left" ? parameters.leftAvatarColor : parameters.rightAvatarColor }}>
                  {avatars[side] && <img src={avatars[side]!.previewUrl} alt="" />}
                  <input type="file" accept="image/*" onChange={(event) => {
                    void uploadAvatar(side, event.target.files?.[0]);
                    event.target.value = "";
                  }} />
                  <span>{avatars[side] ? "Replace" : "Upload"}</span>
                </label>
                <div><strong>{side === "left" ? "Left avatar" : "Right avatar"}</strong><small>{avatars[side]?.file.name ?? "Default color"}</small></div>
                {avatars[side] && <button type="button" onClick={() => removeAvatar(side)} aria-label={`Restore ${side} default avatar`}><CloseIcon /></button>}
              </div>
            ))}
          </div>

          <div className="chat-message-list">
            {parameters.messages.map((message, index) => (
              <div className="chat-message-row" key={message.id}>
                <div className="chat-side-toggle" role="group" aria-label={`Message ${index + 1} side`}>
                  <button type="button" className={message.side === "left" ? "selected" : ""} aria-pressed={message.side === "left"} onClick={() => updateMessage(message.id, { side: "left" })}>L</button>
                  <button type="button" className={message.side === "right" ? "selected" : ""} aria-pressed={message.side === "right"} onClick={() => updateMessage(message.id, { side: "right" })}>R</button>
                </div>
                <textarea maxLength={MAX_MESSAGE_LENGTH} rows={2} value={message.text} aria-label={`Message ${index + 1}`} onChange={(event) => updateMessage(message.id, { text: event.target.value })} />
                <button className="chat-message-remove" type="button" onClick={() => removeMessage(message.id)} aria-label={`Remove message ${index + 1}`}><CloseIcon /></button>
              </div>
            ))}
            {parameters.messages.length < MAX_CHAT_MESSAGES && <button className="add-chapter" type="button" onClick={addMessage}>+ Add message</button>}
          </div>
        </aside>

        <section className="stage" aria-label="Preview workspace" style={{ "--preview-max-width": `min(1040px, calc((100vh - 210px) * ${outputFormat.width / outputFormat.height}))` } as React.CSSProperties}>
          <div className="stage-toolbar"><button type="button" onClick={() => setReplayToken((token) => token + 1)}><ReplayIcon /> Replay</button></div>
          <PreviewCanvas width={outputFormat.width} height={outputFormat.height} duration={duration} replayToken={replayToken} label="Chat Dialog animation preview" draw={(context, width, height, time) => renderChatDialogFrame(context, width, height, avatarSources, parameters, time)} />
          <div className="stage-meta"><span>{outputFormat.width} × {outputFormat.height}</span><span>30 FPS</span><span>{duration.toFixed(1)} sec</span><span>Transparent</span></div>
          <ExportStatus isExporting={isExporting} exportProgress={exportProgress} exportResult={exportResult} onCancel={() => exportTaskRef.current?.cancel()} />
        </section>

        <aside className="panel controls-panel chat-controls-panel">
          <div className="format-control progress-format-control">
            <span>Aspect ratio</span>
            <div className="format-options" role="group" aria-label="MOV aspect ratio">
              {OUTPUT_FORMATS.map((format) => <button type="button" key={format.id} className={format.id === outputFormatId ? "selected" : ""} aria-pressed={format.id === outputFormatId} onClick={() => { setOutputFormatId(format.id); setReplayToken((token) => token + 1); }}>{format.id}</button>)}
            </div>
          </div>
          <div className="parameters">
            <ParameterSlider label="Message interval" value={parameters.messageInterval} min={0.35} max={2} step={0.05} displayValue={`${parameters.messageInterval.toFixed(2)}s`} onChange={(value) => updateField("messageInterval", value)} />
            <ParameterSlider label="Vertical gap" value={parameters.verticalGap} min={0} max={1} step={0.05} displayValue={`${Math.round(parameters.verticalGap * 100)}%`} onChange={(value) => updateField("verticalGap", value)} />
            <ParameterSlider label="Font size" value={parameters.fontSize} min={0.6} max={1.6} step={0.05} displayValue={`${Math.round(parameters.fontSize * 100)}%`} onChange={(value) => updateField("fontSize", value)} />
            <div className="font-control">
              <label className="parameter-label" htmlFor="chat-font">Font</label>
              <select id="chat-font" value={parameters.fontFamily} style={{ fontFamily: parameters.fontFamily }} onChange={(event) => updateField("fontFamily", event.target.value)}>
                {FONT_FAMILIES.map((font) => <option key={font} value={font}>{font}</option>)}
              </select>
            </div>
            {([
              ["leftBubbleColor", "Left bubble"],
              ["rightBubbleColor", "Right bubble"],
              ["leftAvatarColor", "Left avatar"],
              ["rightAvatarColor", "Right avatar"],
            ] as const).map(([key, label]) => (
              <label className="chat-color-field" key={key}>
                <span className="parameter-label"><span>{label}</span><output>{parameters[key]}</output></span>
                <input type="color" value={parameters[key]} onChange={(event) => updateField(key, event.target.value)} />
              </label>
            ))}
          </div>
          <div className="export-section">
            <button className="export-button" type="button" disabled={!parameters.messages.length || isExporting} onClick={() => void exportMov()}><ExportIcon />{isExporting ? "Exporting…" : "Export MOV"}</button>
            {!parameters.messages.length && <p className="export-hint">Add at least one message to export.</p>}
          </div>
        </aside>
      </div>

      {error && <div className="error-toast" role="alert"><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><CloseIcon /></button></div>}
    </main>
  );
}
