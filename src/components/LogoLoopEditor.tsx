import { useEffect, useMemo, useRef, useState } from "react";
import { BUILT_IN_LOGOS, logoLoopDefinition, type LogoLoopParameters } from "../assets/logo-loop/definition";
import { renderLogoLoopFrame } from "../assets/logo-loop/render";
import type { SourceImage } from "../assets/types";
import { createMovDownload, startExport, triggerMovDownload, type ExportProgress, type ExportTask } from "../export/client";
import { OUTPUT_FORMATS, type OutputFormatId } from "../export/formats";
import { formatExportEstimate } from "../export/estimate";
import { ChevronLeftIcon, CloseIcon, ExportIcon, ReplayIcon } from "./icons";
import { ExportStatus } from "./ExportStatus";
import { ParameterSlider } from "./ParameterSlider";
import { PreviewCanvas } from "./PreviewCanvas";

type LogoImage = {
  id: string;
  name: string;
  width: number;
  height: number;
  file: Blob;
  bitmap: ImageBitmap;
  previewUrl: string;
  uploaded: boolean;
};

type Props = { onBack: () => void; initialParameters?: Record<string, unknown>; initialFormatId?: OutputFormatId; initialFiles?: File[] };
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;

function closeLogo(logo: LogoImage) {
  logo.bitmap.close();
  if (logo.uploaded) URL.revokeObjectURL(logo.previewUrl);
}

async function decodeLogo(file: Blob, name: string) {
  if (!file.type.includes("svg") && !name.toLowerCase().endsWith(".svg")) {
    return { file, bitmap: await createImageBitmap(file) };
  }
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
    const width = Math.min(2048, Math.max(1, Math.round(512 * ratio)));
    const height = Math.max(1, Math.round(width / Math.max(0.01, ratio)));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create the SVG renderer.");
    context.drawImage(image, 0, 0, width, height);
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(`Could not rasterize ${name}.`)), "image/png"));
    return { file: png, bitmap: await createImageBitmap(png) };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function LogoLoopEditor({ onBack, initialParameters, initialFormatId, initialFiles = [] }: Props) {
  const [images, setImages] = useState<LogoImage[]>([]);
  const [parameters, setParameters] = useState<LogoLoopParameters>(() => initialParameters as LogoLoopParameters ?? logoLoopDefinition.defaultParameters);
  const [formatId, setFormatId] = useState<OutputFormatId>(initialFormatId ?? "16:9");
  const [replayToken, setReplayToken] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ url: string; filename: string; size: number } | null>(null);
  const taskRef = useRef<ExportTask | null>(null);
  const resultRef = useRef(exportResult);
  const imagesRef = useRef(images);
  resultRef.current = exportResult;
  imagesRef.current = images;

  useEffect(() => {
    let canceled = false;
    const logos = initialFiles.length ? initialFiles.map((file) => ({ id: crypto.randomUUID(), name: file.name, path: "", file })) : BUILT_IN_LOGOS;
    void Promise.all(logos.map(async (logo): Promise<LogoImage> => {
      if ("file" in logo) {
        if (logo.file.size > MAX_FILE_BYTES) throw new Error(`${logo.name} is larger than 10 MB.`);
        const { file, bitmap } = await decodeLogo(logo.file, logo.name);
        if (bitmap.width * bitmap.height > MAX_PIXELS) {
          bitmap.close();
          throw new Error(`${logo.name} exceeds the 20-megapixel safety limit.`);
        }
        return { id: logo.id, name: logo.name, width: bitmap.width, height: bitmap.height, file, bitmap, previewUrl: URL.createObjectURL(logo.file), uploaded: true };
      }
      const response = await fetch(logo.path);
      if (!response.ok) throw new Error(`Could not load the built-in ${logo.name} logo.`);
      const source = await response.blob();
      const { file, bitmap } = await decodeLogo(source, `${logo.name}.svg`);
      return { id: logo.id, name: logo.name, width: bitmap.width, height: bitmap.height, file, bitmap, previewUrl: logo.path, uploaded: false };
    })).then((loaded) => {
      if (canceled) loaded.forEach(closeLogo);
      else setImages((current) => [...loaded, ...current]);
    }).catch((loadError) => { if (!canceled) setError(loadError instanceof Error ? loadError.message : "Could not load the built-in logos."); });
    return () => { canceled = true; };
  }, []);

  useEffect(() => () => {
    taskRef.current?.cancel();
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
    imagesRef.current.forEach(closeLogo);
  }, []);

  const sources = useMemo<SourceImage[]>(() => images.map((image) => ({ id: image.id, name: image.name, width: image.width, height: image.height, source: image.bitmap })), [images]);
  const format = OUTPUT_FORMATS.find(({ id }) => id === formatId)!;
  const duration = logoLoopDefinition.getDuration(parameters, images.length);
  const update = <Key extends keyof LogoLoopParameters>(key: Key, value: LogoLoopParameters[Key]) => {
    setParameters((current) => ({ ...current, [key]: value }));
    setReplayToken((token) => token + 1);
  };

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    if (images.length + files.length > logoLoopDefinition.maxInputCount) {
      setError(`Logo Loop supports up to ${logoLoopDefinition.maxInputCount} images.`);
      return;
    }
    const added: LogoImage[] = [];
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image file.`);
        if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 10 MB.`);
        const decoded = await decodeLogo(file, file.name);
        if (decoded.bitmap.width * decoded.bitmap.height > MAX_PIXELS) {
          decoded.bitmap.close();
          throw new Error(`${file.name} exceeds the 20-megapixel safety limit.`);
        }
        added.push({ id: crypto.randomUUID(), name: file.name, width: decoded.bitmap.width, height: decoded.bitmap.height, file: decoded.file, bitmap: decoded.bitmap, previewUrl: URL.createObjectURL(file), uploaded: true });
      }
      setImages((current) => [...current, ...added]);
      setReplayToken((token) => token + 1);
      setError(null);
    } catch (uploadError) {
      added.forEach(closeLogo);
      setError(uploadError instanceof Error ? uploadError.message : "Chrome could not decode those images.");
    }
  };

  const removeImage = (index: number) => {
    setImages((current) => {
      const next = [...current];
      const [removed] = next.splice(index, 1);
      closeLogo(removed);
      return next;
    });
    setReplayToken((token) => token + 1);
  };

  const moveImage = (from: number, to: number) => {
    if (from === to) return;
    setImages((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setReplayToken((token) => token + 1);
  };

  const exportMov = async () => {
    if (!images.length || isExporting) return;
    setError(null);
    if (exportResult) URL.revokeObjectURL(exportResult.url);
    setExportResult(null);
    setIsExporting(true);
    const task = startExport({
      id: crypto.randomUUID(), type: "export", motion: "logo-loop", width: format.width, height: format.height, frameRate: logoLoopDefinition.frameRate, parameters,
      images: images.map(({ id, name, width, height, file }) => ({ id, name, width, height, file })),
    }, setExportProgress);
    taskRef.current = task;
    try {
      const blob = await task.promise;
      const download = createMovDownload(blob, logoLoopDefinition.id);
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
    <header className="topbar"><button className="back-button" type="button" onClick={onBack}><ChevronLeftIcon /> Back to motions</button><div className="asset-title"><strong>Logo Loop</strong></div></header>
    <div className="workspace">
      <aside className="panel assets-panel"><div className="panel-heading"><h2>Logos <span>SVG or transparent PNG</span></h2></div><div className="image-grid logo-grid">
        {images.map((image, index) => <div className={`image-tile logo-tile${dragIndex === index ? " dragging" : ""}`} key={image.id} draggable title="Drag to reorder" onDragStart={() => setDragIndex(index)} onDragEnd={() => setDragIndex(null)} onDragEnter={() => { if (dragIndex === null || dragIndex === index) return; moveImage(dragIndex, index); setDragIndex(index); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setDragIndex(null); }}><img src={image.previewUrl} alt={`${image.name} logo`} draggable={false} /><span>{image.name}</span><button type="button" className="remove-image" onClick={() => removeImage(index)} aria-label={`Remove ${image.name}`}><CloseIcon /></button></div>)}
        {images.length < logoLoopDefinition.maxInputCount && <label className="add-tile" title="Add logos"><input type="file" accept="image/*,.svg" multiple onChange={(event) => { void addFiles(event.target.files); event.target.value = ""; }} /><span aria-hidden="true">+</span><span className="sr-only">Add logos</span></label>}
      </div></aside>
      <section className="stage" aria-label="Preview workspace" style={{ "--preview-max-width": `min(1040px, calc((100vh - 210px) * ${format.width / format.height}))` } as React.CSSProperties}>
        <div className="stage-toolbar"><button type="button" onClick={() => setReplayToken((token) => token + 1)}><ReplayIcon /> Replay</button></div>
        <PreviewCanvas width={format.width} height={format.height} duration={duration} replayToken={replayToken} label="Logo Loop animation preview" draw={(context, width, height, time) => renderLogoLoopFrame(context, width, height, sources, parameters, time)} empty={!images.length ? <div className="preview-empty"><p>Add a transparent logo to begin</p></div> : null} />
        <div className="stage-meta"><span>{format.width} × {format.height}</span><span>30 FPS</span><span>{duration.toFixed(1)} sec</span><span>Transparent</span></div>
        <ExportStatus isExporting={isExporting} exportProgress={exportProgress} exportResult={exportResult} onCancel={() => taskRef.current?.cancel()} />
      </section>
      <aside className="panel controls-panel">
        <div className="format-control progress-format-control"><span>Aspect ratio</span><div className="format-options" role="group" aria-label="MOV aspect ratio">{OUTPUT_FORMATS.map((item) => <button type="button" key={item.id} className={item.id === formatId ? "selected" : ""} aria-pressed={item.id === formatId} onClick={() => { setFormatId(item.id); setReplayToken((token) => token + 1); }}>{item.id}</button>)}</div></div>
        <div className="parameters">
          <ParameterSlider label="Duration" value={parameters.duration} min={2} max={20} step={0.5} displayValue={`${parameters.duration.toFixed(1)}s`} onChange={(value) => update("duration", value)} />
          <ParameterSlider label="Speed" value={parameters.speed} min={0.04} max={0.5} step={0.01} displayValue={`${Math.round(parameters.speed * 100)}%`} onChange={(value) => update("speed", value)} />
          <ParameterSlider label="Logo size" value={parameters.logoSize} min={0.06} max={0.3} step={0.01} displayValue={`${Math.round(parameters.logoSize * 100)}%`} onChange={(value) => update("logoSize", value)} />
          <ParameterSlider label="Gap" value={parameters.gap} min={0.02} max={0.25} step={0.01} displayValue={`${Math.round(parameters.gap * 100)}%`} onChange={(value) => update("gap", value)} />
          <ParameterSlider label="Edge fade" value={parameters.fadeEdges} min={0} max={0.25} step={0.01} displayValue={`${Math.round(parameters.fadeEdges * 100)}%`} onChange={(value) => update("fadeEdges", value)} />
          <ParameterSlider label="Vertical position" value={parameters.positionY} min={0.15} max={0.85} step={0.01} displayValue={`${Math.round(parameters.positionY * 100)}%`} onChange={(value) => update("positionY", value)} />
          <div className="font-control"><span className="parameter-label">Direction</span><button type="button" onClick={() => update("direction", parameters.direction === "left" ? "right" : "left")}>{parameters.direction === "left" ? "← Left" : "Right →"}</button></div>
        </div>
        <div className="export-section"><button className="export-button" type="button" disabled={!images.length || isExporting} onClick={() => void exportMov()}><ExportIcon />{isExporting ? "Exporting…" : "Export MOV"}</button><p className="export-hint">Estimated export: {formatExportEstimate(duration, format.width, format.height, logoLoopDefinition.frameRate)} · varies by device</p>{!images.length && <p className="export-hint">Add at least one logo to export.</p>}</div>
      </aside>
    </div>
    {error && <div className="error-toast" role="alert"><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><CloseIcon /></button></div>}
  </main>;
}
