import { useEffect, useRef, useState } from "react";
import { countUpDefinition, type CountUpParameters } from "../assets/count-up/definition";
import { renderCountUpFrame } from "../assets/count-up/render";
import { createMovDownload, startExport, triggerMovDownload, type ExportProgress, type ExportTask } from "../export/client";
import { OUTPUT_FORMATS, type OutputFormatId } from "../export/formats";
import { formatExportEstimate } from "../export/estimate";
import { ChevronLeftIcon, CloseIcon, ExportIcon, ReplayIcon } from "./icons";
import { ExportStatus } from "./ExportStatus";
import { ParameterSlider } from "./ParameterSlider";
import { PreviewCanvas } from "./PreviewCanvas";

const FONTS = ["Segoe UI", "Arial", "Microsoft YaHei", "PingFang SC", "SimHei"];
type Props = { onBack: () => void; initialParameters?: Record<string, unknown>; initialFormatId?: OutputFormatId };

export function CountUpEditor({ onBack, initialParameters, initialFormatId }: Props) {
  const [parameters, setParameters] = useState<CountUpParameters>(() => initialParameters as CountUpParameters ?? countUpDefinition.defaultParameters);
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
  const duration = countUpDefinition.getDuration(parameters, 0);
  const update = <Key extends keyof CountUpParameters>(key: Key, value: CountUpParameters[Key]) => {
    setParameters((current) => ({ ...current, [key]: value }));
    setReplayToken((token) => token + 1);
  };

  const exportMov = async () => {
    if (isExporting) return;
    setError(null);
    if (exportResult) URL.revokeObjectURL(exportResult.url);
    setExportResult(null);
    setIsExporting(true);
    const task = startExport({ id: crypto.randomUUID(), type: "export", motion: "count-up", width: format.width, height: format.height, frameRate: countUpDefinition.frameRate, parameters }, setExportProgress);
    taskRef.current = task;
    try {
      const blob = await task.promise;
      const download = createMovDownload(blob, countUpDefinition.id);
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
    <header className="topbar"><button className="back-button" type="button" onClick={onBack}><ChevronLeftIcon /> Back to motions</button><div className="asset-title"><strong>Count Up</strong></div></header>
    <div className="workspace">
      <aside className="panel assets-panel"><div className="panel-heading"><h2>Number</h2></div><div className="number-fields">
        {(["start", "end"] as const).map((key) => <label className="number-field" key={key}><span>{key === "start" ? "Start" : "End"}</span><input type="number" value={parameters[key]} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value)) update(key, value); }} /></label>)}
        <label className="number-field"><span>Prefix</span><input type="text" maxLength={8} value={parameters.prefix} onChange={(event) => update("prefix", event.target.value)} /></label>
        <label className="number-field"><span>Suffix</span><input type="text" maxLength={8} value={parameters.suffix} onChange={(event) => update("suffix", event.target.value)} /></label>
      </div></aside>
      <section className="stage" aria-label="Preview workspace" style={{ "--preview-max-width": `min(1040px, calc((100vh - 210px) * ${format.width / format.height}))` } as React.CSSProperties}>
        <div className="stage-toolbar"><button type="button" onClick={() => setReplayToken((token) => token + 1)}><ReplayIcon /> Replay</button></div>
        <PreviewCanvas width={format.width} height={format.height} duration={duration} replayToken={replayToken} label="Count Up animation preview" draw={(context, width, height, time) => renderCountUpFrame(context, width, height, parameters, time)} />
        <div className="stage-meta"><span>{format.width} × {format.height}</span><span>30 FPS</span><span>{duration.toFixed(1)} sec</span><span>Transparent</span></div>
        <ExportStatus isExporting={isExporting} exportProgress={exportProgress} exportResult={exportResult} onCancel={() => taskRef.current?.cancel()} />
      </section>
      <aside className="panel controls-panel">
        <div className="format-control progress-format-control"><span>Aspect ratio</span><div className="format-options" role="group" aria-label="MOV aspect ratio">{OUTPUT_FORMATS.map((item) => <button type="button" key={item.id} className={item.id === formatId ? "selected" : ""} aria-pressed={item.id === formatId} onClick={() => { setFormatId(item.id); setReplayToken((token) => token + 1); }}>{item.id}</button>)}</div></div>
        <div className="parameters">
          <ParameterSlider label="Duration" value={parameters.duration} min={0.5} max={10} step={0.1} displayValue={`${parameters.duration.toFixed(1)}s`} onChange={(value) => update("duration", value)} />
          <ParameterSlider label="Decimals" value={parameters.decimals} min={0} max={4} step={1} displayValue={String(parameters.decimals)} onChange={(value) => update("decimals", value)} />
          <div className="font-control"><span className="parameter-label">Number format</span><button type="button" onClick={() => update("separator", !parameters.separator)}>{parameters.separator ? "1,000 separators" : "1000 plain"}</button></div>
          <div className="font-control"><span className="parameter-label">Easing</span><button type="button" onClick={() => update("easing", parameters.easing === "ease-out" ? "linear" : "ease-out")}>{parameters.easing === "ease-out" ? "Ease out" : "Linear"}</button></div>
          <ParameterSlider label="Font size" value={parameters.fontSize} min={0.5} max={1.8} step={0.05} displayValue={`${Math.round(parameters.fontSize * 100)}%`} onChange={(value) => update("fontSize", value)} />
          <div className="font-control"><label className="parameter-label" htmlFor="count-font">Font</label><select id="count-font" value={parameters.fontFamily} onChange={(event) => update("fontFamily", event.target.value)}>{FONTS.map((font) => <option key={font}>{font}</option>)}</select></div>
          <label className="chat-color-field"><span className="parameter-label">Text color</span><input type="color" value={parameters.color} onChange={(event) => update("color", event.target.value)} /></label>
        </div>
        <div className="export-section"><button className="export-button" type="button" disabled={isExporting} onClick={() => void exportMov()}><ExportIcon />{isExporting ? "Exporting…" : "Export MOV"}</button><p className="export-hint">Estimated export: {formatExportEstimate(duration, format.width, format.height, countUpDefinition.frameRate)} · varies by device</p></div>
      </aside>
    </div>
    {error && <div className="error-toast" role="alert"><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><CloseIcon /></button></div>}
  </main>;
}
