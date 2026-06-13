import { useCallback, useEffect, useRef, useState } from "react";
import { IDLE_CLASS } from "../data/decks";
import type { TMPoseModel } from "../types/tmpose";

export type Prediction = { topClass: string; probability: number };

type ClassifierStatus = {
  /** Camera + (optionally) model are ready and the prediction loop is running. */
  ready: boolean;
  /** No trained model was found, so predictions are simulated. */
  isMock: boolean;
  /** Latest top prediction this frame. */
  prediction: Prediction;
  /** Human-readable problem (e.g. camera denied), or null. */
  error: string | null;
};

const MOCK_SIMULATE_FRAMES = 16; // how long a simulated motion is "held" high

/**
 * Manages the webcam + Teachable Machine pose model and exposes the latest
 * per-frame prediction. If the model files are missing (not trained yet), it
 * falls back to a mock classifier so the whole game loop stays testable.
 *
 * Attach the returned `videoRef`/`canvasRef` to a <video>/<canvas> in the DOM.
 */
export function usePoseClassifier(modelPath: string) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [status, setStatus] = useState<ClassifierStatus>({
    ready: false,
    isMock: false,
    prediction: { topClass: IDLE_CLASS, probability: 1 },
    error: null,
  });

  // Mock control: when set, the loop reports `mockMotionRef` at high confidence
  // for a short window of frames, simulating a detected motion.
  const mockMotionRef = useRef<string>(IDLE_CLASS);
  const mockFramesLeftRef = useRef(0);

  /** In mock mode, simulate the player performing `motion`. No-op for real model. */
  const simulate = useCallback((motion: string) => {
    mockMotionRef.current = motion;
    mockFramesLeftRef.current = MOCK_SIMULATE_FRAMES;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let stream: MediaStream | null = null;
    // The loaded TM model, or null in mock mode.
    let model: TMPoseModel | null = null;

    async function start() {
      // 1) Camera
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
      } catch {
        if (!cancelled) {
          setStatus((s) => ({
            ...s,
            error: "Camera access denied. Allow the camera and reload.",
          }));
        }
        return;
      }

      const video = videoRef.current;
      if (!video || cancelled) return;
      video.srcObject = stream;
      await video.play().catch(() => {});

      // 2) Model — try the real one, fall back to mock if files are absent.
      // tmPose is loaded globally via the CDN script in index.html.
      let isMock = false;
      try {
        if (!window.tmPose) throw new Error("tmPose not loaded");
        model = await window.tmPose.load(
          modelPath + "model.json",
          modelPath + "metadata.json"
        );
      } catch {
        isMock = true;
      }

      if (cancelled) return;
      setStatus((s) => ({ ...s, ready: true, isMock }));

      // 3) Prediction loop
      const ctx = canvasRef.current?.getContext("2d") ?? null;

      const loop = async () => {
        if (cancelled) return;
        const v = videoRef.current;
        const canvas = canvasRef.current;

        if (v && canvas && ctx && v.videoWidth) {
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          // Mirror horizontally so movement feels natural.
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(v, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();
        }

        let prediction: Prediction = { topClass: IDLE_CLASS, probability: 1 };

        if (model && v && v.videoWidth) {
          try {
            const { posenetOutput } = await model.estimatePose(v);
            const preds: Array<{ className: string; probability: number }> =
              await model.predict(posenetOutput);
            const top = preds.reduce((a, b) =>
              b.probability > a.probability ? b : a
            );
            prediction = { topClass: top.className, probability: top.probability };
          } catch {
            // transient frame error; keep last prediction shape
          }
        } else {
          // Mock mode
          if (mockFramesLeftRef.current > 0) {
            mockFramesLeftRef.current--;
            prediction = { topClass: mockMotionRef.current, probability: 0.95 };
          } else {
            prediction = { topClass: IDLE_CLASS, probability: 0.9 };
          }
        }

        setStatus((s) =>
          s.prediction.topClass === prediction.topClass &&
          s.prediction.probability === prediction.probability
            ? s
            : { ...s, prediction }
        );

        rafId = requestAnimationFrame(loop);
      };

      rafId = requestAnimationFrame(loop);
    }

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [modelPath]);

  return { videoRef, canvasRef, ...status, simulate };
}
