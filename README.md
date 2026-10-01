# Sonny Angel Simulator

A fan-made blind-box simulator built with React + Vite.

```bash
npm install
npm run dev
```

## How it plays
- **Budget:** start with €60 and claim a **€40.50 daily allowance** once per calendar day — about three boxes a day.
- **Blind boxes:** regular series cost €12.95, limited series cost €14.95. Opening a box goes through these steps: tap the box, it shakes, the lid flies off, you tear the foil, and the figure is revealed.
- **Secrets:** a 1 in 144 chance per box (1 in 72 for limited 6-figure series), just like the real odds.
- **Shelf:** every figure you own, grouped per series, with your collection value and stats.
- **Selling:** sell figures from your shelf for their full market value — duplicates in one tap, or your last copy after a confirmation.

Market values in `src/data/collections.js` are approximate resale prices. The Robby Angel secrets are worth €140–230, and popular regulars such as Rabbit, Strawberry and Cherry Blossom are worth more than the rest.

Progress is saved in `localStorage`. Use "Reset game" in the footer to start over.

*Not affiliated with Sonny Angel / Dreams Inc. All figure artwork is original SVG.*
