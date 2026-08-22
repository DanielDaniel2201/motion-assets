import { useEffect, useRef, useState } from "react";
import {
  BAR_COLOR_PRESETS,
  cloneProgressBarParameters,
  MAX_CHAPTERS,
  MAX_DURATION,
  MIN_DURATION,
  progressBarDefinition,
  type ProgressBarParameters,
  type ProgressChapter,
} from "../assets/progress-bar/definition";
import { renderProgressBarFrame } from "../assets/progress-bar/render";
import { formatTimecode, normalizeChapters, parseTimecode } from "../assets/progress-bar/timeline";
import { createMovDownload, startExport, triggerMovDownload, type ExportProgress, type ExportTask } from "../export/client";
import { OUTPUT_FORMATS, type OutputFormatId } from "../export/formats";
import { ChevronLeftIcon, CloseIcon, ExportIcon, ReplayIcon } from "./icons";
import { ExportStatus } from "./ExportStatus";
import { ParameterSlider } from "./ParameterSlider";
import { PreviewCanvas } from "./PreviewCanvas";

type ProgressBarEditorProps = {
  onBack: () => void;
};

type LocalFontData = { family: string };
type LocalFontWindow = Window & { queryLocalFonts?: () => Promise<LocalFontData[]> };

const DEFAULT_FONT_FAMILIES = ["Segoe UI", "Microsoft YaHei", "Arial", "SimHei", "KaiTi", "FangSong"];

function nextChapterLabel(chapters: ProgressChapter[]) {
  return `章节 ${chapters.length + 1}`;
}

function suggestedChapterTime(chapters: ProgressChapter[], duration: number) {
  if (chapters.length === 0) return 0;
  const last = Math.max(...chapters.map((chapter) => chapter.time));
  return Math.min(duration, Number((last + duration / 4).toFixed(2)));
}

export function ProgressBarEditor({ onBack }: ProgressBarEditorProps) {
  const [parameters, setParameters] = useState<ProgressBarParameters>(() =>
    cloneProgressBarParameters(progressBarDefinition.defaultParameters),
  );
  const [outputFormatId, setOutputFormatId] = useState<OutputFormatId>("16:9");
  const [replayToken, setReplayToken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ url: string; filename: string; size: number } | null>(null);
  const [fontOptions, setFontOptions] = useState(DEFAULT_FONT_FAMILIES);
  const [isLoadingFonts, setIsLoadingFonts] = useState(false);
  const [timeDrafts, setTimeDrafts] = useState<Record<string, string>>({});
  const exportTaskRef = useRef<ExportTask | null>(null);
  const exportResultRef = useRef(exportResult);
  exportResultRef.current = exportResult;

  useEffect(() => () => {
    exportTaskRef.current?.cancel();
    if (exportResultRef.current) URL.revokeObjectURL(exportResultRef.current.url);
  }, []);

  const outputFormat = OUTPUT_FORMATS.find((format) => format.id === outputFormatId)!;
  const duration = progressBarDefinition.getDuration(parameters, 0);
  const chapters = normalizeChapters(parameters.chapters, parameters.duration);

  const updateParameters = (
    updater: (current: ProgressBarParameters) => ProgressBarParameters,
    replay = false,
  ) => {
    setParameters(updater);
    if (replay) setReplayToken((token) => token + 1);
  };

  const updateField = <Key extends keyof Omit<ProgressBarParameters, "chapters">>(
    key: Key,
    value: ProgressBarParameters[Key],
    replay = false,
  ) => {
    updateParameters((current) => {
      const next = { ...current, [key]: value };
      if (key === "duration") {
        next.chapters = current.chapters.map((chapter) => ({
          ...chapter,
          time: Math.max(0, Math.min(Number(value), chapter.time)),
        }));
      }
      return next;
    }, replay);
  };

  const updateChapter = (id: string, patch: Partial<ProgressChapter>) => {
    updateParameters((current) => ({
      ...current,
      chapters: current.chapters.map((chapter) => chapter.id === id ? { ...chapter, ...patch } : chapter),
    }));
  };

  const addChapter = () => {
    if (parameters.chapters.length >= MAX_CHAPTERS) {
      setError(`Progress Bar supports up to ${MAX_CHAPTERS} chapter labels.`);
      return;
    }
    const chapter: ProgressChapter = {
      id: crypto.randomUUID(),
      time: suggestedChapterTime(parameters.chapters, parameters.duration),
      label: nextChapterLabel(parameters.chapters),
    };
    updateParameters((current) => ({ ...current, chapters: [...current.chapters, chapter] }));
  };

  const removeChapter = (id: string) => {
    updateParameters((current) => ({
      ...current,
      chapters: current.chapters.filter((chapter) => chapter.id !== id),
    }));
  };

  const commitChapterTime = (id: string, draft: string) => {
    const parsed = parseTimecode(draft);
    setTimeDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (parsed === null) return;
    updateChapter(id, { time: Math.max(0, Math.min(parameters.duration, parsed)) });
  };

  const loadLocalFonts = async () => {
    const queryLocalFonts = (window as LocalFontWindow).queryLocalFonts;
    if (!queryLocalFonts) {
      setError("This browser cannot list local fonts. Use current desktop Chrome or Edge.");
      return;
    }
    setError(null);
    setIsLoadingFonts(true);
    try {
      const fonts = await queryLocalFonts.call(window);
      const families = [...new Set(fonts.map((font) => font.family).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
      setFontOptions([...new Set([...DEFAULT_FONT_FAMILIES, ...families])]);
    } catch (fontError) {
      setError(fontError instanceof Error ? fontError.message : "Local font access was not granted.");
    } finally {
      setIsLoadingFonts(false);
    }
  };

  const exportMov = async () => {
    if (isExporting) return;
    setError(null);
    if (exportResult) {
      URL.revokeObjectURL(exportResult.url);
      setExportResult(null);
    }
    setIsExporting(true);
    setExportProgress({ progress: 0, frame: 0, totalFrames: Math.ceil(duration * progressBarDefinition.frameRate) });
    const task = startExport(
      {
        id: crypto.randomUUID(),
        type: "export",
        motion: "progress-bar",
        width: outputFormat.width,
        height: outputFormat.height,
        frameRate: progressBarDefinition.frameRate,
        parameters: {
          ...parameters,
          chapters: normalizeChapters(parameters.chapters, parameters.duration),
        },
      },
      setExportProgress,
    );
    exportTaskRef.current = task;
    try {
      const blob = await task.promise;
      const download = createMovDownload(blob, progressBarDefinition.id);
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
        <button className="back-button" type="button" onClick={onBack}>
          <ChevronLeftIcon /> Back to motions
        </button>
        <div className="asset-title">
          <strong>Progress Bar</strong>
        </div>
      </header>

      <div className="workspace">
        <aside className="panel assets-panel">
          <div className="panel-heading">
            <h2>Chapters</h2>
          </div>
          <div className="chapter-list">
            {chapters.map((chapter, index) => (
              <div className="chapter-row" key={chapter.id}>
                <label className="chapter-time">
                  <span className="sr-only">Chapter {index + 1} time</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    spellCheck={false}
                    value={timeDrafts[chapter.id] ?? formatTimecode(chapter.time)}
                    onChange={(event) => {
                      setTimeDrafts((current) => ({ ...current, [chapter.id]: event.target.value }));
                    }}
                    onBlur={(event) => commitChapterTime(chapter.id, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") (event.target as HTMLInputElement).blur();
                    }}
                  />
                </label>
                <label className="chapter-label">
                  <span className="sr-only">Chapter {index + 1} name</span>
                  <input
                    type="text"
                    maxLength={24}
                    placeholder="Theme / chapter"
                    value={chapter.label}
                    onChange={(event) => updateChapter(chapter.id, { label: event.target.value })}
                  />
                </label>
                <button
                  type="button"
                  className="chapter-remove"
                  onClick={() => removeChapter(chapter.id)}
                  aria-label={`Remove chapter ${index + 1}`}
                >
                  <CloseIcon />
                </button>
              </div>
            ))}
            {parameters.chapters.length < MAX_CHAPTERS && (
              <button className="add-chapter" type="button" onClick={addChapter}>
                + Add chapter
              </button>
            )}
          </div>
        </aside>

        <section
          className="stage"
          aria-label="Preview workspace"
          style={{ "--preview-max-width": `min(1040px, calc((100vh - 210px) * ${outputFormat.width / outputFormat.height}))` } as React.CSSProperties}
        >
          <div className="stage-toolbar">
            <button type="button" onClick={() => setReplayToken((token) => token + 1)}><ReplayIcon /> Replay</button>
          </div>
          <PreviewCanvas
            width={outputFormat.width}
            height={outputFormat.height}
            duration={duration}
            replayToken={replayToken}
            label="Progress Bar animation preview"
            draw={(context, width, height, time) => {
              renderProgressBarFrame(context, width, height, parameters, time);
            }}
          />
          <div className="stage-meta">
            <span>{outputFormat.width} × {outputFormat.height}</span>
            <span>30 FPS</span>
            <span>{duration.toFixed(1)} sec</span>
            <span>Transparent</span>
          </div>
          <ExportStatus
            isExporting={isExporting}
            exportProgress={exportProgress}
            exportResult={exportResult}
            onCancel={() => exportTaskRef.current?.cancel()}
          />
        </section>

        <aside className="panel controls-panel">
          <div className="format-control progress-format-control">
            <span>Aspect ratio</span>
            <div className="format-options" role="group" aria-label="MOV aspect ratio">
              {OUTPUT_FORMATS.map((format) => (
                <button
                  type="button"
                  key={format.id}
                  className={format.id === outputFormatId ? "selected" : ""}
                  aria-pressed={format.id === outputFormatId}
                  onClick={() => setOutputFormatId(format.id)}
                >
                  {format.id}
                </button>
              ))}
            </div>
          </div>
          <div className="parameters">
            <label className="parameter-label duration-parameter">
              <span>Total duration</span>
              <span className="duration-input-wrap">
                <input
                  className="duration-input"
                  type="number"
                  min={MIN_DURATION}
                  max={MAX_DURATION}
                  step={0.5}
                  value={parameters.duration}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (!Number.isFinite(next)) return;
                    updateField("duration", Math.max(MIN_DURATION, Math.min(MAX_DURATION, next)), true);
                  }}
                />
                <span aria-hidden="true">s</span>
              </span>
            </label>
            <ParameterSlider label="Separator thickness" value={parameters.separatorThickness} min={0.4} max={2.2} step={0.05} displayValue={`${Math.round(parameters.separatorThickness * 100)}%`} onChange={(value) => updateField("separatorThickness", value)} />
            <ParameterSlider label="Font size" value={parameters.fontSize} min={0.5} max={2} step={0.05} displayValue={`${Math.round(parameters.fontSize * 100)}%`} onChange={(value) => updateField("fontSize", value)} />
            <div className="font-control">
              <label className="parameter-label" htmlFor="progress-font">Font</label>
              <select
                id="progress-font"
                value={parameters.fontFamily}
                style={{ fontFamily: parameters.fontFamily }}
                onChange={(event) => updateField("fontFamily", event.target.value)}
              >
                {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
              </select>
              <button type="button" onClick={() => void loadLocalFonts()} disabled={isLoadingFonts}>
                {isLoadingFonts ? "Loading…" : "Load local fonts"}
              </button>
            </div>
            <div className="color-control">
              <span className="parameter-label">
                <span>Progress color</span>
                <output>{parameters.progressColor}</output>
              </span>
              <div className="color-row">
                <input
                  type="color"
                  value={parameters.progressColor}
                  aria-label="Progress color"
                  onChange={(event) => updateField("progressColor", event.target.value)}
                />
                <div className="color-presets" role="group" aria-label="Progress color presets">
                  {BAR_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={preset.toLowerCase() === parameters.progressColor.toLowerCase() ? "selected" : ""}
                      style={{ background: preset }}
                      aria-label={preset}
                      onClick={() => updateField("progressColor", preset)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="color-control">
              <span className="parameter-label">
                <span>Base color</span>
                <output>{parameters.baseColor}</output>
              </span>
              <div className="color-row">
                <input
                  type="color"
                  value={parameters.baseColor}
                  aria-label="Base color"
                  onChange={(event) => updateField("baseColor", event.target.value)}
                />
                <div className="color-presets" role="group" aria-label="Base color presets">
                  {BAR_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={preset.toLowerCase() === parameters.baseColor.toLowerCase() ? "selected" : ""}
                      style={{ background: preset }}
                      aria-label={preset}
                      onClick={() => updateField("baseColor", preset)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="export-section">
            <button className="export-button" type="button" disabled={isExporting} onClick={() => void exportMov()}>
              <ExportIcon />{isExporting ? "Exporting…" : "Export MOV"}
            </button>
          </div>
        </aside>
      </div>

      {error && <div className="error-toast" role="alert"><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><CloseIcon /></button></div>}
    </main>
  );
}
