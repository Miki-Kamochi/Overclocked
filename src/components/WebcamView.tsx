import type { RefObject } from "react";

type Props = {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
};

/**
 * Renders the mirrored webcam feed. The hidden <video> is the raw camera
 * source; the visible <canvas> is what the classifier draws each frame.
 */
export default function WebcamView({ videoRef, canvasRef }: Props) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-900">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="h-full w-full object-cover" />
    </div>
  );
}
