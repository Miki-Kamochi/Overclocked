# action-verbs model

Drop the Teachable Machine **Pose** export for the "Action Verbs" deck here:

- `model.json`
- `metadata.json`
- `weights.bin`

## Required class names
The model's classes must exactly match the `motion` values in
`src/data/decks.ts`, plus the reserved `idle` class:

```
throw
jump
point
clap
wave
idle
```

Until these files exist, the app automatically runs in **mock mode** (a
"Simulate motion" button stands in for real detection), so the game loop is
fully testable without the model.

See teachablemachine.withgoogle.com → New Project → Pose Project →
Train → Export → TensorFlow.js → Download.
