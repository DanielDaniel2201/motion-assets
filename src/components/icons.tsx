import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const UploadIcon = (props: IconProps) => (
  <svg {...base} {...props}><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14"/></svg>
);
export const ReplayIcon = (props: IconProps) => (
  <svg {...base} {...props}><path d="M4.8 7.8A8 8 0 1 1 4 14"/><path d="M4.8 3.8v4h4"/></svg>
);
export const ExportIcon = (props: IconProps) => (
  <svg {...base} {...props}><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5"/><path d="M5 19h14"/></svg>
);
export const ChevronLeftIcon = (props: IconProps) => (
  <svg {...base} {...props}><path d="m15 18-6-6 6-6"/></svg>
);
export const CloseIcon = (props: IconProps) => (
  <svg {...base} {...props}><path d="m6 6 12 12M18 6 6 18"/></svg>
);
export const LockIcon = (props: IconProps) => (
  <svg {...base} {...props}><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
);
