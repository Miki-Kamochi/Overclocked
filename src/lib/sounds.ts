import countdown321 from "./321Sound.mp3";
import correct from "./Correct.mp3";
import wrong from "./Wrong.mp3";
import whenGameEnds from "./WhenGameEnds.mp3";
import mouseClick from "./MouseClick.mp3";

/**
 * Named sound events → audio file mapping.
 *
 * countdownTick  — plays on each of 3, 2, 1
 * countdownGo    — plays on "Go!"
 * cardCorrect    — motion matched; plays immediately on confirm
 * cardNextFlip   — plays when the next card slides in (~700 ms later)
 * cardWrong      — plays once when a wrong pose is held confidently
 * gameFinish     — solo deck cleared / battle ended (win or lose)
 * uiClick        — general button-click feedback
 */
const SOUND_FILES = {
  countdownTick: countdown321,
  cardCorrect: correct,
  cardWrong: wrong,
  gameFinish: whenGameEnds,
  uiClick: mouseClick,
} satisfies Record<string, string>;

type SoundName = keyof typeof SOUND_FILES;

const cache: Partial<Record<SoundName, HTMLAudioElement>> = {};

function getAudio(name: SoundName): HTMLAudioElement {
  if (!cache[name]) {
    const audio = new Audio(SOUND_FILES[name]);
    audio.preload = "auto";
    cache[name] = audio;
  }
  return cache[name]!;
}

/** Play a named sound once. Fails silently so missing files never crash the game. */
export function playSound(name: SoundName, volume = 1): void {
  try {
    const audio = getAudio(name);
    audio.currentTime = 0;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(() => {});
  } catch {
    // ignore
  }
}

/** Start a sound looping continuously. Returns a stop function. */
export function startLoop(name: SoundName, volume = 1): () => void {
  try {
    const audio = getAudio(name);
    audio.loop = true;
    audio.currentTime = 0;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(() => {});
  } catch {
    // ignore
  }
  return () => {
    try {
      const audio = cache[name];
      if (audio) {
        audio.pause();
        audio.loop = false;
        audio.currentTime = 0;
      }
    } catch {
      // ignore
    }
  };
}
