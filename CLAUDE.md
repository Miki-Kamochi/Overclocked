# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**KATA** — a gamified vocabulary app where your body is the controller. Players physically act out the meaning of a word (throw, jump, point...) and the camera detects the motion to flip the card. Built for a hackathon under the theme of expanding the user's own thinking, action, and creativity.

**Team:** Miki Kamochi, Horise Yoshito

## Commands

```bash
npm run dev      # Start dev server (localhost:5173 + network URL for phones)
npm run build    # Type-check + production build → dist/
npm run preview  # Preview the production build locally
```

## Stack

- **Vite + React + TypeScript** — no framework router; screens are managed by a simple state machine in `App.tsx`
- **Tailwind CSS** — utility-first, configured in `tailwind.config.js`
- **Teachable Machine Pose** — loaded via CDN in `index.html` (avoids npm peer-dep conflicts); exposes `window.tmPose`
- **Deploy:** Vercel (auto-detects Vite; HTTPS required for camera access)

## Architecture

Three screens driven by a union-type state machine in `src/App.tsx`:
```
TopicSelect → GameScreen → ResultScreen
```

### Core data flow
Webcam frame → `usePoseClassifier` → `{ topClass, probability }` per frame → `MotionMatcher.push()` → match confirmed after N consecutive frames above threshold → card clears, next word loads.

### Key files

| File | Role |
|------|------|
| `src/data/decks.ts` | Deck + Card types; all vocabulary decks live here |
| `src/hooks/usePoseClassifier.ts` | Camera setup + TM model loader; auto-falls back to mock if model files are absent |
| `src/game/matcher.ts` | Confidence smoothing — requires `MATCH_THRESHOLD` for `REQUIRED_HITS` consecutive frames |
| `src/components/GameScreen.tsx` | Main game loop: feeds predictions into the matcher, drives card advance |
| `public/models/<deckId>/` | Trained model files go here (`model.json`, `metadata.json`, `weights.bin`) |

### Mock mode
If no trained model files exist for a deck, the app runs in **mock mode** automatically — a "Simulate motion" button substitutes for real detection. The entire game loop is testable without a trained model.

### Adding a new deck
1. Train a Teachable Machine **Pose** project at teachablemachine.withgoogle.com (one class per motion + an `idle` class; 4–8 classes max per model for reliable accuracy).
2. Export → TensorFlow.js → download the 3 files into `public/models/<deckId>/`.
3. Add the deck entry to `DECKS` in `src/data/decks.ts` — `motion` strings must exactly match the TM class names.

### Motion model rules
- Every model **must** include an `idle` class (standing neutral) to prevent false triggers.
- Keep each deck to **4–8 physically distinct** motions — accuracy degrades as classes grow or look similar.
- Record ~5–10 varied bursts per class (different angles, speeds, both teammates) with balanced sample counts across classes.
