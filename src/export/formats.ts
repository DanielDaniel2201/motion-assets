export const OUTPUT_FORMATS = [
  { id: "16:9", width: 1920, height: 1080 },
  { id: "9:16", width: 1080, height: 1920 },
  { id: "4:3", width: 1440, height: 1080 },
  { id: "3:4", width: 1080, height: 1440 },
  { id: "1:1", width: 1080, height: 1080 },
] as const;

export type OutputFormatId = typeof OUTPUT_FORMATS[number]["id"];
