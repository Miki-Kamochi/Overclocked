# KATA

**Your body is the controller.** Act out the meaning of a word — point, jump, throw, touch — and the camera detects the motion to flip the card.

Built at a hackathon under the theme of expanding the user's own thinking, action, and creativity.

**Team Overclocked:** Miki Kamochi · Horise Yoshito

---

## How it works

1. Pick a vocabulary deck from the bookshelf.
2. A word appears on screen. Read the hint and perform the motion.
3. When the pose model detects the correct motion with enough confidence, the card clears and the next word loads.
4. Finish all cards as fast as possible — your time and score are saved locally.

### Battle mode

Two players on separate laptops can race head-to-head over a local network or the internet:

- One player creates a room and shares the 4-character code.
- The other player joins with that code.
- The host presses **Start** — both players get the same deck in the same order (seeded shuffle).
- First to clear every card wins. A live progress bar shows the opponent's position in real time.
- Pose detection runs entirely on each device — no video crosses the wire, only tiny score updates.

---

## Running locally

```bash
npm install
npm run dev        # dev server at localhost:5173 (+ network URL for phones)
npm run build      # type-check + production build → dist/
npm run preview    # preview the production build
```

### Battle mode requires Supabase

Create a `.env.local` file in the project root:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

The Battle button only appears when both variables are present. Solo mode works without them.

---

## Adding a new deck

1. Train a **Teachable Machine Pose** project at [teachablemachine.withgoogle.com](https://teachablemachine.withgoogle.com).
   - One class per motion (e.g. `throw`, `clap`, `wave`).
   - Always include an `idle` class (standing neutral) to prevent false triggers.
   - Keep it to 4–8 physically distinct motions for reliable accuracy.
   - Record ~5–10 varied bursts per class from different angles.
2. Export → TensorFlow.js → download the 3 files (`model.json`, `metadata.json`, `weights.bin`) into `public/models/<deckId>/`.
3. Add the deck entry to `src/data/decks.ts`. The `motion` strings must exactly match the Teachable Machine class names.

### Mock mode

If no trained model files exist for a deck, the app runs in **mock mode** automatically. A "Simulate motion" button substitutes for real detection so the full game loop is testable without a trained model.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | Vite + React + TypeScript |
| Styling | Tailwind CSS |
| Pose detection | Teachable Machine Pose (loaded via CDN) |
| Multiplayer | Supabase Realtime — Broadcast + Presence (no database tables) |
| Deploy | Vercel (HTTPS required for camera access) |

---

## Decks

| Deck | Words | Motions |
|------|-------|---------|
| Directions | Left, Right, Up, Forward… | point left/right, raise arms, push forward |
| Body Parts | Head, Shoulders, Knees, Toes… | touch each body part |
| Action Verbs | Throw, Clap, Wave | full-body gestures |
