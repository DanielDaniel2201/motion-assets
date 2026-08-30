import { useRef, useState, type ReactNode } from "react";
import { formatExportEstimate } from "../export/estimate";
import { ChevronUpIcon, ExportIcon } from "./icons";

const QUALITIES = [
  { label: "High", scale: 1 },
  { label: "Medium", scale: 0.75 },
  { label: "Low", scale: 0.5 },
] as const;

type Props = {
  width: number;
  height: number;
  duration: number;
  frameRate: number;
  disabled?: boolean;
  isExporting: boolean;
  onExport: (width: number, height: number) => void;
  children?: ReactNode;
};

export function ExportControls({ width, height, duration, frameRate, disabled, isExporting, onExport, children }: Props) {
  const [scale, setScale] = useState(1);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const scaled = (value: number, quality = scale) => Math.round(value * quality);

  return <div className="export-section">
    <p className="export-hint export-estimate">Estimated {formatExportEstimate(duration, scaled(width), scaled(height), frameRate)}</p>
    <div className="export-actions">
      <button className="export-button" type="button" disabled={disabled || isExporting} onClick={() => onExport(scaled(width), scaled(height))}>
        <ExportIcon />{isExporting ? "Exporting…" : "Export MOV"}
      </button>
      <details className="export-quality" ref={menuRef}>
        <summary aria-label="Choose export quality" aria-disabled={disabled || isExporting} onClick={(event) => { if (disabled || isExporting) event.preventDefault(); }}><ChevronUpIcon /></summary>
        <div className="export-quality-menu" role="menu" aria-label="Export quality">
          {QUALITIES.map((quality) => {
            const itemWidth = scaled(width, quality.scale);
            const itemHeight = scaled(height, quality.scale);
            return <button key={quality.label} type="button" role="menuitemradio" aria-checked={scale === quality.scale} className={scale === quality.scale ? "selected" : ""} disabled={disabled || isExporting} onClick={() => { setScale(quality.scale); menuRef.current?.removeAttribute("open"); onExport(itemWidth, itemHeight); }}>
              <span><strong>{quality.label}</strong><small>{itemWidth} × {itemHeight}</small></span>
              <em>{formatExportEstimate(duration, itemWidth, itemHeight, frameRate)}</em>
            </button>;
          })}
        </div>
      </details>
    </div>
    {children}
  </div>;
}
