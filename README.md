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
- **Puzzles:** earn money with a word search, Swedish puzzle or binary puzzle (Dutch words around the blind-box themes, pick a category). Small pays €5, medium €10, large €15. No daily limit.
- **Lucky wheel:** one free spin per day for money (€5–€100) or random figures (1–3), with a 0.2% chance of a secret figure. The server draws the prize.
- **Bank:** sell any figure to the bank instantly for 70% of its market value.
- **Market:** sell only to other real players. List a figure at your own price (it leaves your shelf while listed), buy now, or make an offer and counter back and forth until someone accepts.

Market values in `src/data/collections.js` are approximate resale prices. The Robby Angel secrets are worth €140–230, and popular regulars such as Rabbit, Strawberry and Cherry Blossom are worth more than the rest.

Progress is saved in `localStorage`. Use "Reset game" in the footer to start over.

*Not affiliated with Sonny Angel / Dreams Inc. All figure artwork is original SVG.*

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
