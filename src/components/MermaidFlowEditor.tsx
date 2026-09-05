import { useEffect, useMemo, useRef, useState } from "react";
import { mermaidFlowDefinition, type MermaidFlowParameters } from "../assets/mermaid-flow/definition";
import { renderMermaidFlowFrame } from "../assets/mermaid-flow/render";
import { parseMermaidFlowchart } from "../assets/mermaid-flow/timeline";
import { createMovDownload, startExport, triggerMovDownload, type ExportProgress, type ExportTask } from "../export/client";
import { OUTPUT_FORMATS, type OutputFormatId } from "../export/formats";
import { ChevronLeftIcon, CloseIcon, ReplayIcon } from "./icons";
import { ExportControls } from "./ExportControls";
import { ExportStatus } from "./ExportStatus";
import { ParameterSlider } from "./ParameterSlider";
import { PreviewCanvas } from "./PreviewCanvas";

const FONTS = ["Segoe UI", "Arial", "Microsoft YaHei", "PingFang SC", "SimHei"];
type Props = { onBack: () => void; initialParameters?: Record<string, unknown>; initialFormatId?: OutputFormatId };

export function MermaidFlowEditor({ onBack, initialParameters, initialFormatId }: Props) {
  const [parameters, setParameters] = useState<MermaidFlowParameters>(() => initialParameters as MermaidFlowParameters ?? mermaidFlowDefinition.defaultParameters);
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

  const parseError = useMemo(() => {
    try { parseMermaidFlowchart(parameters.mermaid); return null; }
    catch (reason) { return reason instanceof Error ? reason.message : "Invalid Mermaid flowchart."; }
  }, [parameters.mermaid]);
  const format = OUTPUT_FORMATS.find(({ id }) => id === formatId)!;
  const duration = mermaidFlowDefinition.getDuration(parameters, 0);
  const update = <Key extends keyof MermaidFlowParameters>(key: Key, value: MermaidFlowParameters[Key]) => {
    setParameters((current) => ({ ...current, [key]: value }));
    setReplayToken((token) => token + 1);
  };

  const exportMov = async (width: number, height: number) => {
    if (parseError || isExporting) return;
    setError(null);
    if (exportResult) URL.revokeObjectURL(exportResult.url);
    setExportResult(null);
    setIsExporting(true);
    const task = startExport({ id: crypto.randomUUID(), type: "export", motion: "mermaid-flow", width, height, frameRate: mermaidFlowDefinition.frameRate, parameters }, setExportProgress);
    taskRef.current = task;
    try {
      const blob = await task.promise;
      const download = createMovDownload(blob, mermaidFlowDefinition.id);
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
    <header className="topbar"><button className="back-button" type="button" onClick={onBack}><ChevronLeftIcon /> Back to motions</button><div className="asset-title"><strong>Mermaid Flow</strong></div></header>
    <div className="workspace">
      <aside className="panel assets-panel"><div className="panel-heading"><h2>Flowchart</h2></div><textarea className="motion-text-input mermaid-input" maxLength={5000} spellCheck={false} value={parameters.mermaid} onChange={(event) => update("mermaid", event.target.value)} aria-label="Mermaid flowchart" />{parseError && <p className="input-error" role="alert">{parseError}</p>}</aside>
      <section className="stage" aria-label="Preview workspace" style={{ "--preview-max-width": `min(1040px, calc((100vh - 210px) * ${format.width / format.height}))` } as React.CSSProperties}>
        <div className="stage-toolbar"><button type="button" onClick={() => setReplayToken((token) => token + 1)}><ReplayIcon /> Replay</button></div>
        <PreviewCanvas width={format.width} height={format.height} duration={duration} replayToken={replayToken} label="Animated Mermaid flowchart preview" draw={(context, width, height, time) => { if (!parseError) renderMermaidFlowFrame(context, width, height, parameters, time); else context.clearRect(0, 0, width, height); }} />
        <div className="stage-meta"><span>{format.width} × {format.height}</span><span>30 FPS</span><span>{duration.toFixed(1)} sec</span><span>Transparent</span></div>
        <ExportStatus isExporting={isExporting} exportProgress={exportProgress} exportResult={exportResult} onCancel={() => taskRef.current?.cancel()} />
      </section>
      <aside className="panel controls-panel">
        <div className="format-control progress-format-control"><span>Aspect ratio</span><div className="format-options" role="group" aria-label="MOV aspect ratio">{OUTPUT_FORMATS.map((item) => <button type="button" key={item.id} className={item.id === formatId ? "selected" : ""} aria-pressed={item.id === formatId} onClick={() => { setFormatId(item.id); setReplayToken((token) => token + 1); }}>{item.id}</button>)}</div></div>
        <div className="parameters">
          <ParameterSlider label="Animation speed" value={parameters.animationSpeed} min={0.5} max={2} step={0.1} displayValue={`${parameters.animationSpeed.toFixed(1)}×`} onChange={(value) => update("animationSpeed", value)} />
          <div className="font-control"><label className="parameter-label" htmlFor="flow-font">Font</label><select id="flow-font" value={parameters.fontFamily} onChange={(event) => update("fontFamily", event.target.value)}>{FONTS.map((font) => <option key={font}>{font}</option>)}</select></div>
          {(["nodeColor", "textColor", "lineColor"] as const).map((key) => <label className="chat-color-field" key={key}><span className="parameter-label">{{ nodeColor: "Node color", textColor: "Text color", lineColor: "Line color" }[key]}</span><input type="color" value={parameters[key]} onChange={(event) => update(key, event.target.value)} /></label>)}
        </div>
        <ExportControls width={format.width} height={format.height} duration={duration} frameRate={mermaidFlowDefinition.frameRate} disabled={!!parseError} isExporting={isExporting} onExport={(width, height) => void exportMov(width, height)} />
      </aside>
    </div>
    {error && <div className="error-toast" role="alert"><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><CloseIcon /></button></div>}
  </main>;
}
