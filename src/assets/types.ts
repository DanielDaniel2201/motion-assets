export type MotionAssetDefinition<Parameters> = {
  id: string;
  name: string;
  description: string;
  minInputCount: number;
  maxInputCount: number;
  width: number;
  height: number;
  frameRate: number;
  defaultParameters: Parameters;
  getDuration: (parameters: Parameters, inputCount: number) => number;
};

export type SourceImage = {
  id: string;
  name: string;
  width: number;
  height: number;
  source: CanvasImageSource;
};

export type SerializableSourceImage = Omit<SourceImage, "source"> & {
  file: Blob;
};
