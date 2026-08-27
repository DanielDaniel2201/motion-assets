import { useRef, useState } from "react";
import type { BatchDocument, BatchInstance } from "../batch/import";
import { BlurTextEditor } from "./BlurTextEditor";
import { CardStackEditor } from "./CardStackEditor";
import { ChatDialogEditor } from "./ChatDialogEditor";
import { CountUpEditor } from "./CountUpEditor";
import { LogoLoopEditor } from "./LogoLoopEditor";
import { ProgressBarEditor } from "./ProgressBarEditor";
import { VideoPipEditor } from "./VideoPipEditor";
import { ChevronLeftIcon, ExportIcon } from "./icons";

function InstanceEditor({ instance }: { instance: BatchInstance }) {
  const props = { onBack: () => undefined, initialParameters: instance.parameters, initialFormatId: instance.format, initialFiles: instance.files };
  switch (instance.motion) {
    case "card-stack": return <CardStackEditor {...props} />;
    case "progress-bar": return <ProgressBarEditor {...props} />;
    case "video-pip": return <VideoPipEditor {...props} />;
    case "chat-dialog": return <ChatDialogEditor {...props} />;
    case "blur-text": return <BlurTextEditor {...props} />;
    case "count-up": return <CountUpEditor {...props} />;
    case "logo-loop": return <LogoLoopEditor {...props} />;
  }
}

function exportButton(button: HTMLButtonElement) {
  return new Promise<void>((resolve) => {
    let started = false;
    const observer = new MutationObserver(() => {
      if (button.disabled) started = true;
      if (started && !button.disabled) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(button, { attributes: true, childList: true, subtree: true });
    button.click();
  });
}

export function BatchPage({ batch, onBack }: { batch: BatchDocument; onBack: () => void }) {
  const rootRef = useRef<HTMLElement>(null);
  const [status, setStatus] = useState("");
  const [exporting, setExporting] = useState(false);

  const exportAll = async () => {
    if (exporting) return;
    const allButtons = [...(rootRef.current?.querySelectorAll<HTMLButtonElement>(".batch-instance .export-button") ?? [])];
    const buttons = allButtons.filter((button) => !button.disabled);
    if (!buttons.length) {
      setStatus("No export-ready instances. Add the required media first.");
      return;
    }
    const skipped = allButtons.length - buttons.length;
    const skippedVideos = allButtons.filter((button, index) => button.disabled && batch.instances[index]?.motion === "video-pip").length;
    const reason = skippedVideos === skipped ? "missing video" : "missing required media";
    if (skipped && !window.confirm(`${buttons.length} instance${buttons.length === 1 ? " is" : "s are"} ready to export. ${skipped} will be skipped (${reason}).\n\nContinue exporting available items?`)) return;
    setExporting(true);
    for (const [index, button] of buttons.entries()) {
      setStatus(`Exporting ${index + 1} of ${buttons.length}…`);
      button.closest(".batch-instance")?.scrollIntoView({ behavior: "smooth", block: "start" });
      await exportButton(button);
    }
    setStatus(`Exported ${buttons.length} instance${buttons.length === 1 ? "" : "s"}.`);
    setExporting(false);
  };

  return <main className="batch-page" ref={rootRef}>
    <header className="batch-header">
      <button className="back-button" type="button" onClick={onBack}><ChevronLeftIcon /> Back to motions</button>
      <div><strong>Batch workspace</strong><span>{batch.instances.length} instance{batch.instances.length === 1 ? "" : "s"}</span></div>
      <div className="batch-export-actions">
        {status && <span role="status">{status}</span>}
        <button className="batch-export-all" type="button" disabled={exporting} onClick={() => void exportAll()}><ExportIcon />{exporting ? "Exporting…" : "Export all"}</button>
      </div>
    </header>
    <div className="batch-instance-list">
      {batch.instances.map((instance, index) => <article className="batch-instance" key={instance.id}>
        <div className="batch-instance-heading"><span>{String(index + 1).padStart(2, "0")}</span><strong>{instance.name}</strong><code>{instance.id}</code></div>
        <InstanceEditor instance={instance} />
      </article>)}
    </div>
  </main>;
}
