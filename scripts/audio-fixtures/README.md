# Snore audio fixtures

Real snoring recordings used by `scripts/analyze-snore-audio.mts` to check the snore detector
without a phone. All files are public domain (CC0); the Freesound files are the site's 128 kbps previews.

| File | Source | Length | License |
| --- | --- | --- | --- |
| `snore-freesound-234867.mp3` | [Snoring.wav by mlsulli](https://freesound.org/people/mlsulli/sounds/234867/) | 25 s | CC0 |
| `snore-freesound-114609.mp3` | [snoring by Daxter31](https://freesound.org/people/Daxter31/sounds/114609/) | 47 s | CC0 |
| `snore-bigsoundbank-0170.mp3` | [Man Snoring (BigSoundBank #0170)](https://bigsoundbank.com/man-snoring-s0170.html) | 50 s | CC0 |

Speech, fan noise and knocks for the demo scenarios are generated at runtime (macOS `say`, brown noise,
synthetic impacts), so they are not stored here.

## Usage

```bash
npm run analyze-audio -- --demo                         # all scenarios
npm run analyze-audio -- --envelope my-night.m4a --raw  # a recording made by the app itself
npm run analyze-audio -- --fan 48 snore.mp3@60 talk.m4a@55
```

`file@60` scales that file so its loudest moments reach 60 dB on the app's scale; `--raw` keeps the
original levels (use it for the app's own recordings, which already have realistic levels).
