// Confidence smoothing for motion matching.
//
// Raw per-frame predictions flicker, so we require the target motion to stay
// above a confidence threshold for a number of consecutive frames before we
// count it as a real match. This prevents both flicker and brief false
// positives from advancing the card.

export const MATCH_THRESHOLD = 0.85; // min probability to count a frame as "hit"
export const REQUIRED_HITS = 8; // consecutive qualifying frames to confirm a match

export class MotionMatcher {
  private targetMotion: string;
  private hits = 0;

  constructor(targetMotion: string) {
    this.targetMotion = targetMotion;
  }

  /** Point the matcher at a new motion and reset its progress. */
  setTarget(targetMotion: string) {
    this.targetMotion = targetMotion;
    this.hits = 0;
  }

  reset() {
    this.hits = 0;
  }

  /**
   * Feed one frame's top prediction. Returns true exactly once, on the frame
   * the match is confirmed. Progress (0..1) is exposed via `progress`.
   */
  push(topClass: string, probability: number): boolean {
    if (topClass === this.targetMotion && probability >= MATCH_THRESHOLD) {
      this.hits++;
    } else {
      // Decay rather than hard-reset so a single dropped frame mid-motion
      // doesn't throw away all progress.
      this.hits = Math.max(0, this.hits - 1);
    }

    if (this.hits >= REQUIRED_HITS) {
      this.hits = 0;
      return true;
    }
    return false;
  }

  /** How close the current motion is to confirming, 0..1, for the UI bar. */
  get progress(): number {
    return Math.min(1, this.hits / REQUIRED_HITS);
  }
}
