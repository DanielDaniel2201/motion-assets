export const OUTPUT_FORMATS = [
  { id: "16:9", width: 1920, height: 1080 },
  { id: "9:16", width: 1080, height: 1920 },
  { id: "4:3", width: 1440, height: 1080 },
  { id: "3:4", width: 1080, height: 1440 },
  { id: "1:1", width: 1080, height: 1080 },
] as const;

export const PROGRESS_BAR_OUTPUT_FORMATS = OUTPUT_FORMATS.map(({ id, width, height }) => ({
  id,
  width: width * 2 / 3,
  height: height * 2 / 3,
}));

export type OutputFormatId = typeof OUTPUT_FORMATS[number]["id"];
