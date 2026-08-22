import { useEffect, useMemo, useRef, useState } from "react";
import type { CardStackParameters } from "../assets/card-stack/definition";
import { cardStackDefinition } from "../assets/card-stack/definition";
import { renderCardStackFrame } from "../assets/card-stack/render";
import type { SourceImage } from "../assets/types";
import { ChevronLeftIcon, CloseIcon, ExportIcon, ReplayIcon } from "./icons";
import { ParameterSlider } from "./ParameterSlider";
import { PreviewCanvas } from "./PreviewCanvas";
import { ExportStatus } from "./ExportStatus";
import { createMovDownload, startExport, triggerMovDownload, type ExportProgress, type ExportTask } from "../export/client";
import { OUTPUT_FORMATS, type OutputFormatId } from "../export/formats";

type UploadedImage = {
  id: string;
  name: string;
  width: number;
  height: number;
  file: File;
  bitmap: ImageBitmap;
  thumbnailUrl: string;
};

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_PIXELS = 36_000_000;

async function loadDemoPng(path: string, name: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Could not load the local demo images.");
  const svg = await response.text();
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = svgUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create the local demo renderer.");
    context.drawImage(image, 0, 0);
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not rasterize a demo image.")), "image/png"),
    );
    return new File([png], name, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function imageSources(images: UploadedImage[]): SourceImage[] {
  return images.map((image) => ({
    id: image.id,
    name: image.name,
    width: image.width,
    height: image.height,
    source: image.bitmap,
  }));
}

type CardStackEditorProps = {
  onBack: () => void;
};

export function CardStackEditor({ onBack }: CardStackEditorProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [parameters, setParameters] = useState<CardStackParameters>(cardStackDefinition.defaultParameters);
  const [outputFormatId, setOutputFormatId] = useState<OutputFormatId>("16:9");
  const [replayToken, setReplayToken] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ url: string; filename: string; size: number } | null>(null);
  const exportTaskRef = useRef<ExportTask | null>(null);
  const exportResultRef = useRef(exportResult);
  const imagesRef = useRef(images);
  exportResultRef.current = exportResult;
  imagesRef.current = images;

  useEffect(() => () => {
    exportTaskRef.current?.cancel();
    if (exportResultRef.current) URL.revokeObjectURL(exportResultRef.current.url);
    for (const image of imagesRef.current) {
      image.bitmap.close();
      URL.revokeObjectURL(image.thumbnailUrl);
    }
  }, []);

  useEffect(() => {
    if (
      imagesRef.current.length > 0
      || !import.meta.env.DEV
      || !new URLSearchParams(window.location.search).has("demo")
    ) return;
    let canceled = false;
    const loadDemo = async () => {
      const loaded = await Promise.all(
        Array.from({ length: 5 }, async (_, index): Promise<UploadedImage> => {
          const number = String(index + 1).padStart(2, "0");
          const file = await loadDemoPng(`/tests/fixtures/card-${number}.svg`, `card-${number}.png`);
          const bitmap = await createImageBitmap(file);
          return {
            id: `demo-${number}`,
            name: file.name,
            width: bitmap.width,
            height: bitmap.height,
            file,
            bitmap,
            thumbnailUrl: URL.createObjectURL(file),
          };
        }),
      );
      if (canceled) {
        for (const image of loaded) {
          image.bitmap.close();
          URL.revokeObjectURL(image.thumbnailUrl);
        }
        return;
      }
      setImages(loaded);
      setReplayToken((token) => token + 1);
    };
    void loadDemo().catch((demoError) => {
      if (!canceled) setError(demoError instanceof Error ? demoError.message : "Could not load demo images.");
    });
    return () => { canceled = true; };
  }, []);

  const sources = useMemo(() => imageSources(images), [images]);
  const outputFormat = OUTPUT_FORMATS.find((format) => format.id === outputFormatId)!;
  const completed = sources.length >= cardStackDefinition.minInputCount;
  const duration = cardStackDefinition.getDuration(
    parameters,
    Math.max(sources.length, cardStackDefinition.minInputCount),
  );

  const updateParameter = <Key extends keyof CardStackParameters>(
    key: Key,
    value: CardStackParameters[Key],
  ) => {
    setParameters((current) => ({ ...current, [key]: value }));
    setReplayToken((token) => token + 1);
  };

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setError(null);
    const files = Array.from(fileList);
    const remaining = cardStackDefinition.maxInputCount - images.length;
    if (files.length > remaining) {
      setError(`You can add ${remaining} more image${remaining === 1 ? "" : "s"}; Card Stack supports up to 8.`);
      return;
    }
    const added: UploadedImage[] = [];
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} is not an image file.`);
        }
        if (file.size > MAX_FILE_BYTES) {
          throw new Error(`${file.name} is larger than 25 MB. Resize it before importing.`);
        }
        const bitmap = await createImageBitmap(file);
        if (bitmap.width * bitmap.height > MAX_PIXELS) {
          bitmap.close();
          throw new Error(`${file.name} exceeds the 36-megapixel safety limit.`);
        }
        added.push({
          id: crypto.randomUUID(),
          name: file.name,
          width: bitmap.width,
          height: bitmap.height,
          file,
          bitmap,
          thumbnailUrl: URL.createObjectURL(file),
        });
      }
      setImages((current) => [...current, ...added]);
      setReplayToken((token) => token + 1);
    } catch (importError) {
      for (const image of added) {
        image.bitmap.close();
        URL.revokeObjectURL(image.thumbnailUrl);
      }
      setError(importError instanceof Error ? importError.message : "Chrome could not decode those images.");
    }
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    setImages((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setReplayToken((token) => token + 1);
  };

  const removeSlot = (index: number) => {
    setImages((current) => {
      const next = [...current];
      const [removed] = next.splice(index, 1);
      removed.bitmap.close();
      URL.revokeObjectURL(removed.thumbnailUrl);
      return next;
    });
    setReplayToken((token) => token + 1);
  };

  const exportMov = async () => {
    if (!completed || isExporting) return;
    setError(null);
    if (exportResult) {
      URL.revokeObjectURL(exportResult.url);
      setExportResult(null);
    }
    setIsExporting(true);
    setExportProgress({ progress: 0, frame: 0, totalFrames: Math.ceil(duration * cardStackDefinition.frameRate) });
    const task = startExport(
      {
        id: crypto.randomUUID(),
        type: "export",
        motion: "card-stack",
        width: outputFormat.width,
        height: outputFormat.height,
        frameRate: cardStackDefinition.frameRate,
        parameters,
        images: images.map(({ id, name, width, height, file }) => ({ id, name, width, height, file })),
      },
      setExportProgress,
    );
    exportTaskRef.current = task;
    try {
      const blob = await task.promise;
      const download = createMovDownload(blob, cardStackDefinition.id);
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
          <strong>Card Stack</strong>
        </div>
      </header>

      <div className="workspace">
        <aside className="panel assets-panel">
          <div className="panel-heading">
            <h2>Your cards <span>2–8 images</span></h2>
          </div>
          <div className="image-grid">
            {images.map((image, index) => (
              <div
                className={`image-tile${dragIndex === index ? " dragging" : ""}`}
                key={image.id}
                draggable
                title="Drag to reorder"
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", image.id);
                  setDragIndex(index);
                }}
                onDragEnd={() => setDragIndex(null)}
                onDragEnter={() => {
                  if (dragIndex === null || dragIndex === index) return;
                  moveImage(dragIndex, index);
                  setDragIndex(index);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragIndex(null);
                }}
              >
                <img src={image.thumbnailUrl} alt={`Card ${index + 1}: ${image.name}`} draggable={false} />
                <button type="button" className="remove-image" onClick={() => removeSlot(index)} aria-label={`Remove card ${index + 1}`}><CloseIcon /></button>
              </div>
            ))}
            {images.length < cardStackDefinition.maxInputCount && (
              <label className="add-tile" title="Add images">
                <input type="file" accept="image/*" multiple onChange={(event) => {
                  void addFiles(event.target.files);
                  event.target.value = "";
                }} />
                <span aria-hidden="true">+</span>
                <span className="sr-only">Add images</span>
              </label>
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
            label="Card Stack animation preview"
            draw={(context, width, height, time) => {
              renderCardStackFrame(context, width, height, sources, parameters, time);
            }}
            empty={images.length === 0 ? (
              <div className="preview-empty" aria-hidden="true">
                <div className="ghost-card ghost-one" />
                <div className="ghost-card ghost-two" />
                <div className="ghost-card ghost-three" />
                <p>Add 2–8 images to begin</p>
              </div>
            ) : null}
          />
          <div className="stage-meta">
            <span>{outputFormat.width} × {outputFormat.height}</span><span>30 FPS</span><span>{duration.toFixed(1)} sec</span><span>Transparent</span>
          </div>
          <ExportStatus
            isExporting={isExporting}
            exportProgress={exportProgress}
            exportResult={exportResult}
            onCancel={() => exportTaskRef.current?.cancel()}
          />
        </section>

        <aside className="panel controls-panel no-format-divider">
          <div className="format-control">
            <span>Aspect ratio</span>
            <div className="format-options" role="group" aria-label="MOV aspect ratio">
              {OUTPUT_FORMATS.map((format) => (
                <button
                  type="button"
                  key={format.id}
                  className={format.id === outputFormatId ? "selected" : ""}
                  aria-pressed={format.id === outputFormatId}
                  onClick={() => {
                    setOutputFormatId(format.id);
                    setReplayToken((token) => token + 1);
                  }}
                >
                  {format.id}
                </button>
              ))}
            </div>
          </div>
          <div className="parameters">
            <ParameterSlider label="Animation speed" value={parameters.animationSpeed} min={0.6} max={1.6} step={0.05} displayValue={`${parameters.animationSpeed.toFixed(2)}×`} onChange={(value) => updateParameter("animationSpeed", value)} />
            <ParameterSlider label="Spread" value={parameters.spread} min={0.65} max={1.3} step={0.05} displayValue={`${Math.round(parameters.spread * 100)}%`} onChange={(value) => updateParameter("spread", value)} />
            <ParameterSlider label="Rotation" value={parameters.rotation} min={0} max={1.5} step={0.05} displayValue={`${Math.round(parameters.rotation * 100)}%`} onChange={(value) => updateParameter("rotation", value)} />
            <ParameterSlider label="Stagger" value={parameters.stagger} min={0.06} max={0.24} step={0.01} displayValue={`${parameters.stagger.toFixed(2)}s`} onChange={(value) => updateParameter("stagger", value)} />
            <ParameterSlider label="Hold duration" value={parameters.holdDuration} min={0.5} max={3} step={0.1} displayValue={`${parameters.holdDuration.toFixed(1)}s`} onChange={(value) => updateParameter("holdDuration", value)} />
          </div>
          <div className="export-section">
            <button className="export-button" type="button" disabled={!completed || isExporting} onClick={() => void exportMov()}>
              <ExportIcon />{isExporting ? "Exporting…" : "Export MOV"}
            </button>
            {!completed && <p className="export-hint">Add at least two images to export.</p>}
          </div>
        </aside>
      </div>

      {error && <div className="error-toast" role="alert"><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><CloseIcon /></button></div>}
    </main>
  );
}
