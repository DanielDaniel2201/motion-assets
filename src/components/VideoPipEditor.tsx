import { useEffect, useRef, useState } from "react";
import {
  VIDEO_PIP_DRAG_START,
  videoPipDefinition,
  type VideoPipParameters,
} from "../assets/video-pip/definition";
import { renderVideoPipFrame } from "../assets/video-pip/render";
import { createMovDownload, startExport, triggerMovDownload, type ExportProgress, type ExportTask } from "../export/client";
import { OUTPUT_FORMATS, type OutputFormatId } from "../export/formats";
import { ChevronLeftIcon, CloseIcon, ExportIcon, ReplayIcon } from "./icons";
import { ExportStatus } from "./ExportStatus";
import { ParameterSlider } from "./ParameterSlider";
import { PreviewCanvas } from "./PreviewCanvas";

type UploadedVideo = {
  name: string;
  width: number;
  height: number;
  duration: number;
  file: File;
  url: string;
  element: HTMLVideoElement;
};

type VideoPipEditorProps = { onBack: () => void };

const MAX_FILE_BYTES = 200 * 1024 * 1024;
const MAX_DURATION = 15;

function waitForVideo(url: string) {
  const element = document.createElement("video");
  element.muted = true;
  element.playsInline = true;
  element.preload = "auto";
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    element.addEventListener("loadeddata", () => resolve(element), { once: true });
    element.addEventListener("error", () => reject(new Error("Chrome could not decode this video. Try an H.264 MP4 or WebM file.")), { once: true });
    element.src = url;
    element.load();
  });
}

function disposeVideo(video: UploadedVideo | null) {
  if (!video) return;
  video.element.pause();
  video.element.removeAttribute("src");
  video.element.load();
  URL.revokeObjectURL(video.url);
}

async function seekVideo(video: HTMLVideoElement, time: number) {
  const safeTime = Math.min(Math.max(0, time), Math.max(0, video.duration - 1 / 60));
  if (video.readyState >= 2 && Math.abs(video.currentTime - safeTime) < 0.001) return;
  await new Promise<void>((resolve, reject) => {
    const done = () => {
      video.removeEventListener("error", failed);
      resolve();
    };
    const failed = () => {
      video.removeEventListener("seeked", done);
      reject(new Error("Chrome could not seek the uploaded video while exporting."));
    };
    video.addEventListener("seeked", done, { once: true });
    video.addEventListener("error", failed, { once: true });
    video.currentTime = safeTime;
  });
}

export function VideoPipEditor({ onBack }: VideoPipEditorProps) {
  const [video, setVideo] = useState<UploadedVideo | null>(null);
  const [parameters, setParameters] = useState<VideoPipParameters>(videoPipDefinition.defaultParameters);
  const [outputFormatId, setOutputFormatId] = useState<OutputFormatId>("16:9");
  const [replayToken, setReplayToken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ url: string; filename: string; size: number } | null>(null);
  const exportTaskRef = useRef<ExportTask | null>(null);
  const videoRef = useRef(video);
  const exportResultRef = useRef(exportResult);
  videoRef.current = video;
  exportResultRef.current = exportResult;

  useEffect(() => () => {
    exportTaskRef.current?.cancel();
    disposeVideo(videoRef.current);
    if (exportResultRef.current) URL.revokeObjectURL(exportResultRef.current.url);
  }, []);

  useEffect(() => {
    if (!video) return;
    const element = video.element;
    element.pause();
    element.currentTime = 0;
    const timer = window.setTimeout(() => {
      void element.play().catch(() => setError("Chrome blocked the preview playback. Press Replay to try again."));
    }, VIDEO_PIP_DRAG_START * 1000);
    return () => {
      window.clearTimeout(timer);
      element.pause();
    };
  }, [replayToken, video]);

  const outputFormat = OUTPUT_FORMATS.find((format) => format.id === outputFormatId)!;
  const duration = videoPipDefinition.getDuration(parameters, video ? 1 : 0);

  const addVideo = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov)$/i.test(file.name)) {
      setError(`${file.name} is not a video file.`);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`${file.name} is larger than 200 MB.`);
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const element = await waitForVideo(url);
      if (!Number.isFinite(element.duration) || element.duration <= 0) throw new Error("This video has no readable duration.");
      if (!element.videoWidth || !element.videoHeight) throw new Error("This video has no readable frame size.");
      if (element.duration > MAX_DURATION) throw new Error(`Use a clip no longer than ${MAX_DURATION} seconds.`);
      const next: UploadedVideo = {
        name: file.name,
        width: element.videoWidth,
        height: element.videoHeight,
        duration: element.duration,
        file,
        url,
        element,
      };
      disposeVideo(videoRef.current);
      setVideo(next);
      setParameters((current) => ({ ...current, videoDuration: element.duration }));
      setReplayToken((token) => token + 1);
    } catch (importError) {
      URL.revokeObjectURL(url);
      setError(importError instanceof Error ? importError.message : "Could not open this video.");
    }
  };

  const removeVideo = () => {
    disposeVideo(videoRef.current);
    setVideo(null);
    setParameters((current) => ({ ...current, videoDuration: videoPipDefinition.defaultParameters.videoDuration }));
    setReplayToken((token) => token + 1);
  };

  const updateDragDuration = (value: number) => {
    setParameters((current) => ({ ...current, dragDuration: value }));
    setReplayToken((token) => token + 1);
  };

  const exportMov = async () => {
    if (!video || isExporting) return;
    setError(null);
    if (exportResult) {
      URL.revokeObjectURL(exportResult.url);
      setExportResult(null);
    }
    setIsExporting(true);
    setExportProgress({ progress: 0, frame: 0, totalFrames: Math.ceil(duration * videoPipDefinition.frameRate) });
    let decoder: HTMLVideoElement | null = null;
    try {
      decoder = await waitForVideo(video.url);
      const task = startExport(
        {
          id: crypto.randomUUID(),
          type: "export",
          motion: "video-pip",
          width: outputFormat.width,
          height: outputFormat.height,
          frameRate: videoPipDefinition.frameRate,
          parameters,
          video: { width: video.width, height: video.height },
        },
        setExportProgress,
        async (time) => {
          await seekVideo(decoder!, time);
          return createImageBitmap(decoder!);
        },
      );
      exportTaskRef.current = task;
      const blob = await task.promise;
      const download = createMovDownload(blob, videoPipDefinition.id);
      setExportResult({ ...download, size: blob.size });
      triggerMovDownload(download.url, download.filename);
    } catch (exportError) {
      if (!(exportError instanceof DOMException && exportError.name === "AbortError")) {
        setError(exportError instanceof Error ? exportError.message : "MOV export failed.");
      }
    } finally {
      decoder?.pause();
      decoder?.removeAttribute("src");
      decoder?.load();
      exportTaskRef.current = null;
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="back-button" type="button" onClick={onBack}><ChevronLeftIcon /> Back to motions</button>
        <div className="asset-title"><strong>Video PiP Drag</strong></div>
      </header>

      <div className="workspace">
        <aside className="panel assets-panel">
          <div className="panel-heading"><h2>Your video <span>max 15 sec</span></h2></div>
          {video ? (
            <div className="video-source-card">
              <video src={video.url} muted playsInline preload="metadata" />
              <div><strong>{video.name}</strong><span>{video.width} × {video.height} · {video.duration.toFixed(1)} sec</span></div>
              <button type="button" onClick={removeVideo} aria-label="Remove video"><CloseIcon /></button>
            </div>
          ) : (
            <label className="video-add-tile">
              <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => {
                void addVideo(event.target.files?.[0]);
                event.target.value = "";
              }} />
              <span aria-hidden="true">+</span>
              <strong>Add video</strong>
              <small>MP4, WebM, or browser-readable MOV</small>
            </label>
          )}
        </aside>

        <section
          className="stage"
          aria-label="Preview workspace"
          style={{ "--preview-max-width": `min(1040px, calc((100vh - 210px) * ${outputFormat.width / outputFormat.height}))` } as React.CSSProperties}
        >
          <div className="stage-toolbar"><button type="button" onClick={() => setReplayToken((token) => token + 1)}><ReplayIcon /> Replay</button></div>
          <PreviewCanvas
            width={outputFormat.width}
            height={outputFormat.height}
            duration={duration}
            replayToken={replayToken}
            label="Video picture-in-picture drag animation preview"
            draw={(context, width, height, time) => {
              renderVideoPipFrame(
                context,
                width,
                height,
                video?.element.readyState && video.element.readyState >= 2 ? video.element : null,
                video ? { width: video.width, height: video.height } : { width: 16, height: 9 },
                parameters,
                time,
              );
            }}
            empty={!video ? <div className="preview-empty video-pip-empty" aria-hidden="true"><i /><span /><p>Add one video to begin</p></div> : null}
          />
          <div className="stage-meta"><span>{outputFormat.width} × {outputFormat.height}</span><span>30 FPS</span><span>{duration.toFixed(1)} sec</span><span>Transparent · silent</span></div>
          <ExportStatus isExporting={isExporting} exportProgress={exportProgress} exportResult={exportResult} onCancel={() => exportTaskRef.current?.cancel()} />
        </section>

        <aside className="panel controls-panel no-format-divider">
          <div className="format-control">
            <span>Aspect ratio</span>
            <div className="format-options" role="group" aria-label="MOV aspect ratio">
              {OUTPUT_FORMATS.map((format) => (
                <button type="button" key={format.id} className={format.id === outputFormatId ? "selected" : ""} aria-pressed={format.id === outputFormatId} onClick={() => {
                  setOutputFormatId(format.id);
                  setReplayToken((token) => token + 1);
                }}>{format.id}</button>
              ))}
            </div>
          </div>
          <div className="parameters">
            <ParameterSlider label="Drag speed" value={parameters.dragDuration} min={0.35} max={2} step={0.05} displayValue={`${parameters.dragDuration.toFixed(2)}s`} onChange={updateDragDuration} />
          </div>
          <div className="export-section">
            <button className="export-button" type="button" disabled={!video || isExporting} onClick={() => void exportMov()}><ExportIcon />{isExporting ? "Exporting…" : "Export MOV"}</button>
            {!video && <p className="export-hint">Add one video to export.</p>}
          </div>
        </aside>
      </div>

      {error && <div className="error-toast" role="alert"><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><CloseIcon /></button></div>}
    </main>
  );
}
