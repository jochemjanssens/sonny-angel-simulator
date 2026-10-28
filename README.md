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
- **Puzzles:** earn money with a word search, Swedish puzzle or binary puzzle (Dutch words around the blind-box themes, pick a category), or the kids' games Memory, Spot the difference, Tetris (clear 5/10/20 lines) and colouring pages. Small pays €5, medium €10, large €15, with no daily or time limit. **Times table champion** gives you one minute to answer as many times tables as you can, at €0.08 (small), €0.10 (medium) or €0.12 (large) per point: a correct sum scores 1 point and a wrong one costs 2 (never below 0). Each size has its own weekly highscore list that resets on Monday 00:00 UTC, and the top 3 of the week in each size win 3, 2 or 1 free spins on the lucky wheel (the server gives them out the first time anyone plays or opens the list after the week ends). Every puzzle you solve in a day raises your level and makes the next one harder (binary puzzles slowly get fewer clues, need smarter reasoning from level 10, grow two bigger from level 20 and reach their hardest at level 30).
- **Lucky wheel:** one free spin per day for money (€5–€100) or random figures (1–3), with a 0.2% chance of a secret figure. The server draws the prize.
- **Bank:** sell any figure to the bank instantly for 70% of its market value.
- **Profiles & swaps:** tap a username to see that player's shelf and listings (and which figures you're missing). Offer a figure from your shelf instead of money; you see right away whether the other player already has it.
- **Market:** sell only to other real players. List a figure at your own price (it leaves your shelf while listed), buy now, or make an offer and counter back and forth until someone accepts.

Market values in `src/data/collections.js` are approximate resale prices. The Robby Angel secrets are worth €140–230, and popular regulars such as Rabbit, Strawberry and Cherry Blossom are worth more than the rest.

Progress is saved in `localStorage`. Use "Reset game" in the footer to start over.

*Not affiliated with Sonny Angel / Dreams Inc. All figure artwork is original SVG.*

## Smiski version

The app also contains a Smiski simulator (and Turbo Minis, below): the brand menu in the header
switches between them (`?brand=smiski`, `?brand=cars` or `?brand=sonny` in the URL does the same,
and the choice is remembered).
Both share accounts, wallets, puzzles and the market, but each only shows its own brand's
figures. Smiski has a dark mode in which the figures glow. Smiski series live in
`src/data/smiski.js`. The old `/smiski/` link forwards to the app.

## Turbo Minis (race cars)

The third collection: race cars in blind boxes (`src/data/cars.js`, drawn by
`src/components/Car.jsx`). Every car has speed, acceleration, grip and weight, and the
**Race** tab lets you race on four tracks: against the computer for a little pocket money, or
by posting a challenge other players can accept, for money or for each other's car. The server
decides every race (`race_cpu`, `create_race_challenge`, `accept_race_challenge` in
`supabase/schema.sql`, migration `022_cars.sql`).

## Install as an app

The site is an installable web app (PWA), one app for both simulators: on Android, open it in
Chrome and tap "Install app" (or the banner in the app). Long-press the app icon for shortcuts
to Sonny Angel and Smiski. The manifest and service worker are generated in `vite.config.js`
(the worker is `src/sw.js`); the icons in `public/icons/` come from `npm run gen:icons`.

## Online setup (Supabase)

Players, shelves, budgets and the market live in a free [Supabase](https://supabase.com) project. All changes go through database functions, so nobody can edit their own budget or rig a box from the browser.

1. Create a Supabase project.
2. In **SQL Editor**, run `supabase/schema.sql`, then `supabase/catalog.sql`. (Existing projects: run the files in `supabase/migrations/` you haven't run yet, in order.)
3. In **Authentication → URL Configuration**, set the Site URL to `https://jochemjanssens.github.io/sonny-angel-simulator/` and add `http://localhost:5173/` to the redirect URLs.
4. Copy `.env.example` to `.env.local` and fill in the project URL and anon key from **Project Settings → API**.
5. For the live site, add the same two values as GitHub repository variables:

```bash
gh variable set VITE_SUPABASE_URL --body "https://your-project.supabase.co"
gh variable set VITE_SUPABASE_ANON_KEY --body "your-anon-key"
```

After changing figures or prices in `src/data/collections.js`, run `npm run gen:catalog` and re-run `supabase/catalog.sql`.
