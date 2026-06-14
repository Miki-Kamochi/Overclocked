import { IDLE_CLASS } from "../data/decks";

export const MATCH_THRESHOLD = 0.65; // min target probability for a frame to qualify
export const IDLE_MARGIN = 0.15;     // target must beat idle by this much to qualify
export const REQUIRED_HITS = 6;      // accumulated qualifying frames to confirm a match

type ClassProb = { className: string; probability: number };

export class MotionMatcher {
  private targetMotion: string;
  private hits = 0;
  // Gate that prevents a held pose from clearing the next card. After a match
  // we disarm; the player must show one non-qualifying frame (return to neutral
  // or change pose) before a new match can accumulate. This matters when
  // consecutive cards share a motion (e.g. Left→West), where setTarget — and so
  // reset() — is never called between them.
  private armed = true;

  constructor(targetMotion: string) {
    this.targetMotion = targetMotion;
  }

  setTarget(targetMotion: string) {
    this.targetMotion = targetMotion;
    this.reset();
  }

  reset() {
    this.hits = 0;
    this.armed = true;
  }

  /**
   * Feed one frame's full per-class predictions. A frame "qualifies" when the
   * target motion clears the threshold AND beats the idle class by IDLE_MARGIN.
   * Qualifying frames accumulate; a non-qualifying frame only decays the count
   * by one, so a single flickered frame can't wipe out a real motion.
   */
  push(predictions: ClassProb[]): boolean {
    const get = (name: string) =>
      predictions.find(
        (p) => p.className.toLowerCase() === name.toLowerCase()
      )?.probability ?? 0;

    const targetProb = get(this.targetMotion);
    const idleProb = get(IDLE_CLASS);
    const qualifies =
      targetProb >= MATCH_THRESHOLD && targetProb - idleProb >= IDLE_MARGIN;

    // Disarmed after a match: wait for the player to leave the pose before any
    // new accumulation, so a still-held motion can't auto-clear the next card.
    if (!this.armed) {
      if (!qualifies) this.armed = true;
      this.hits = 0;
      return false;
    }

    if (qualifies) {
      this.hits++;
    } else {
      this.hits = Math.max(0, this.hits - 1);
    }

    if (this.hits >= REQUIRED_HITS) {
      this.hits = 0;
      this.armed = false;
      return true;
    }
    return false;
  }

  get progress(): number {
    return Math.min(1, this.hits / REQUIRED_HITS);
  }
}
