// Minimal typing for the Teachable Machine pose library loaded via CDN
// (see index.html). We only declare the bits we actually use.

export type TMPosePrediction = { className: string; probability: number };

export interface TMPoseModel {
  estimatePose(
    input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
  ): Promise<{ pose: unknown; posenetOutput: Float32Array }>;
  predict(posenetOutput: Float32Array): Promise<TMPosePrediction[]>;
  getTotalClasses(): number;
}

declare global {
  interface Window {
    tmPose?: {
      load(modelURL: string, metadataURL: string): Promise<TMPoseModel>;
    };
  }
}
