import { useEffect, useRef, useState, type ReactNode } from "react";
import { importBatchFile, type BatchDocument } from "../batch/import";
import { CloseIcon } from "./icons";

type Props = { children: ReactNode; onImport: (batch: BatchDocument) => void; showButton?: boolean };

export function BatchImporter({ children, onImport, showButton = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async (file?: File) => {
    if (!file) return;
    try {
      setError(null);
      onImport(await importBatchFile(file));
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Could not import that batch.");
    }
  };

  useEffect(() => {
    let depth = 0;
    const enter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      depth += 1;
      setDragging(true);
    };
    const over = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    };
    const leave = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const drop = (event: DragEvent) => {
      if (!event.dataTransfer?.files.length) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      if (event.dataTransfer.files.length !== 1) {
        setError("Drop one JSON or ZIP batch at a time.");
        return;
      }
      void open(event.dataTransfer.files[0]);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);

  return <>
    {children}
    <input ref={inputRef} className="sr-only" type="file" accept="application/json,.json,application/zip,.zip" onChange={(event) => {
      void open(event.target.files?.[0]);
      event.target.value = "";
    }} />
    {showButton && <button className="batch-import-button" type="button" onClick={() => inputRef.current?.click()} aria-label="Import motion batch" title="Import JSON or ZIP">+</button>}
    {dragging && <div className="batch-drop-overlay" role="status"><strong>Drop JSON or ZIP to create motion instances</strong><span>Media paths inside ZIP are resolved from the manifest.</span></div>}
    {error && <div className="error-toast" role="alert"><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><CloseIcon /></button></div>}
  </>;
}
