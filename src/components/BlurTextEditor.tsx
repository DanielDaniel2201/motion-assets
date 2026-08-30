import { useEffect, useRef, useState } from "react";
import { blurTextDefinition, type BlurTextParameters } from "../assets/blur-text/definition";
import { renderBlurTextFrame } from "../assets/blur-text/render";
import { createMovDownload, startExport, triggerMovDownload, type ExportProgress, type ExportTask } from "../export/client";
import { OUTPUT_FORMATS, type OutputFormatId } from "../export/formats";
import { ChevronLeftIcon, CloseIcon, ReplayIcon } from "./icons";
import { ExportControls } from "./ExportControls";
import { ExportStatus } from "./ExportStatus";
import { ParameterSlider } from "./ParameterSlider";
import { PreviewCanvas } from "./PreviewCanvas";

const FONTS = ["Segoe UI", "Arial", "Microsoft YaHei", "PingFang SC", "SimHei"];

type Props = { onBack: () => void; initialParameters?: Record<string, unknown>; initialFormatId?: OutputFormatId };

export function BlurTextEditor({ onBack, initialParameters, initialFormatId }: Props) {
  const [parameters, setParameters] = useState<BlurTextParameters>(() => initialParameters as BlurTextParameters ?? blurTextDefinition.defaultParameters);
  const [formatId, setFormatId] = useState<OutputFormatId>(initialFormatId ?? "16:9");
  const [replayToken, setReplayToken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ url: string; filename: string; size: number } | null>(null);
  const taskRef = useRef<ExportTask | null>(null);
  const resultRef = useRef(exportResult);
  resultRef.current = exportResult;

  useEffect(() => () => {
    taskRef.current?.cancel();
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
  }, []);

  const format = OUTPUT_FORMATS.find(({ id }) => id === formatId)!;
  const duration = blurTextDefinition.getDuration(parameters, 0);
  const update = <Key extends keyof BlurTextParameters>(key: Key, value: BlurTextParameters[Key]) => {
    setParameters((current) => ({ ...current, [key]: value }));
    setReplayToken((token) => token + 1);
  };

  const exportMov = async (width: number, height: number) => {
    if (!parameters.text.trim() || isExporting) return;
    setError(null);
    if (exportResult) URL.revokeObjectURL(exportResult.url);
    setExportResult(null);
    setIsExporting(true);
    const task = startExport({ id: crypto.randomUUID(), type: "export", motion: "blur-text", width, height, frameRate: blurTextDefinition.frameRate, parameters }, setExportProgress);
    taskRef.current = task;
    try {
      const blob = await task.promise;
      const download = createMovDownload(blob, blurTextDefinition.id);
      setExportResult({ ...download, size: blob.size });
      triggerMovDownload(download.url, download.filename);
    } catch (exportError) {
      if (!(exportError instanceof DOMException && exportError.name === "AbortError")) setError(exportError instanceof Error ? exportError.message : "MOV export failed.");
    } finally {
      taskRef.current = null;
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  return <main className="app-shell">
    <header className="topbar"><button className="back-button" type="button" onClick={onBack}><ChevronLeftIcon /> Back to motions</button><div className="asset-title"><strong>Blur Text</strong></div></header>
    <div className="workspace">
      <aside className="panel assets-panel"><div className="panel-heading"><h2>Text</h2></div><textarea className="motion-text-input" maxLength={120} value={parameters.text} onChange={(event) => update("text", event.target.value)} aria-label="Animated text" /></aside>
      <section className="stage" aria-label="Preview workspace" style={{ "--preview-max-width": `min(1040px, calc((100vh - 210px) * ${format.width / format.height}))` } as React.CSSProperties}>
        <div className="stage-toolbar"><button type="button" onClick={() => setReplayToken((token) => token + 1)}><ReplayIcon /> Replay</button></div>
        <PreviewCanvas width={format.width} height={format.height} duration={duration} replayToken={replayToken} label="Blur Text animation preview" draw={(context, width, height, time) => renderBlurTextFrame(context, width, height, parameters, time)} />
        <div className="stage-meta"><span>{format.width} × {format.height}</span><span>30 FPS</span><span>{duration.toFixed(1)} sec</span><span>Transparent</span></div>
        <ExportStatus isExporting={isExporting} exportProgress={exportProgress} exportResult={exportResult} onCancel={() => taskRef.current?.cancel()} />
      </section>
      <aside className="panel controls-panel">
        <div className="format-control progress-format-control"><span>Aspect ratio</span><div className="format-options" role="group" aria-label="MOV aspect ratio">{OUTPUT_FORMATS.map((item) => <button type="button" key={item.id} className={item.id === formatId ? "selected" : ""} aria-pressed={item.id === formatId} onClick={() => { setFormatId(item.id); setReplayToken((token) => token + 1); }}>{item.id}</button>)}</div></div>
        <div className="parameters">
          <ParameterSlider label="Duration" value={parameters.duration} min={1} max={8} step={0.1} displayValue={`${parameters.duration.toFixed(1)}s`} onChange={(value) => update("duration", value)} />
          <ParameterSlider label="Blur" value={parameters.blur} min={4} max={48} step={1} displayValue={`${parameters.blur}px`} onChange={(value) => update("blur", value)} />
          <ParameterSlider label="Stagger" value={parameters.stagger} min={0} max={0.35} step={0.01} displayValue={`${parameters.stagger.toFixed(2)}s`} onChange={(value) => update("stagger", value)} />
          <ParameterSlider label="Travel distance" value={parameters.distance} min={0} max={1} step={0.05} displayValue={`${Math.round(parameters.distance * 100)}%`} onChange={(value) => update("distance", value)} />
          <ParameterSlider label="Font size" value={parameters.fontSize} min={0.5} max={1.8} step={0.05} displayValue={`${Math.round(parameters.fontSize * 100)}%`} onChange={(value) => update("fontSize", value)} />
          <div className="font-control"><label className="parameter-label" htmlFor="blur-split">Split by</label><select id="blur-split" value={parameters.splitBy} onChange={(event) => update("splitBy", event.target.value as BlurTextParameters["splitBy"])}><option value="character">Character</option><option value="word">Word</option><option value="line">Line</option></select></div>
          <div className="font-control"><label className="parameter-label" htmlFor="blur-direction">Direction</label><select id="blur-direction" value={parameters.direction} onChange={(event) => update("direction", event.target.value as BlurTextParameters["direction"])}><option value="up">Up</option><option value="down">Down</option><option value="left">Left</option><option value="right">Right</option></select></div>
          <div className="font-control"><label className="parameter-label" htmlFor="blur-font">Font</label><select id="blur-font" value={parameters.fontFamily} onChange={(event) => update("fontFamily", event.target.value)}>{FONTS.map((font) => <option key={font}>{font}</option>)}</select></div>
          <label className="chat-color-field"><span className="parameter-label">Text color</span><input type="color" value={parameters.color} onChange={(event) => update("color", event.target.value)} /></label>
        </div>
        <ExportControls width={format.width} height={format.height} duration={duration} frameRate={blurTextDefinition.frameRate} disabled={!parameters.text.trim()} isExporting={isExporting} onExport={(width, height) => void exportMov(width, height)} />
      </aside>
    </div>
    {error && <div className="error-toast" role="alert"><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><CloseIcon /></button></div>}
  </main>;
}
