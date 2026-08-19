import type { ExportProgress } from "../export/client";

type ExportStatusProps = {
  isExporting: boolean;
  exportProgress: ExportProgress | null;
  exportResult: { url: string; filename: string; size: number } | null;
  onCancel: () => void;
};

export function ExportStatus({
  isExporting,
  exportProgress,
  exportResult,
  onCancel,
}: ExportStatusProps) {
  if (isExporting && exportProgress) {
    return (
      <div className="export-progress-card" role="status">
        <div className="export-progress-copy">
          <span>Encoding ProRes 4444</span>
          <strong>{Math.round(exportProgress.progress * 100)}%</strong>
        </div>
        <div className="export-progress-track"><span style={{ transform: `scaleX(${exportProgress.progress})` }} /></div>
        <div className="export-progress-detail">
          <span>Frame {exportProgress.frame} of {exportProgress.totalFrames}</span>
          <button type="button" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    );
  }

  if (!isExporting && exportResult) {
    return (
      <div className="export-result-card" role="status">
        <div><span>Export ready</span><strong>{(exportResult.size / 1024 / 1024).toFixed(1)} MB</strong></div>
        <a href={exportResult.url} download={exportResult.filename}>Download again</a>
      </div>
    );
  }

  return null;
}
