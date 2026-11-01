# Fibbed

A daily game in the style of Wordle. Each day has a theme and five statements: four are true and one is a fib. Tap a statement you trust and mark it as true. Clear all four truths and you catch the fib. Mark the fib and you are out.

Afterwards you write a fib for tomorrow’s theme. The best one runs the next day, credited to you.

The game is built mobile first and styled as a newspaper front page (the Newsprint theme from [Hallmark](https://github.com/Nutlope/hallmark)). When the game ends, the fib is struck through and printed as a correction.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit, component and database tests (Vitest)
npm run test:e2e     # Playwright: iPhone 13, a 360px Android, desktop Chrome
npm run build
```

Without Supabase the game runs fully offline. Fibs stay on the device and there are no shared stats, and the page says so.

## How it is built

- **Stack:** Vite, React 19 and TypeScript. Tests use Vitest, Testing Library, PGlite (an in-memory Postgres for the schema) and Playwright.
- **Developed test first.** Every module has its tests beside it:
  - `src/lib/date.ts`: the puzzle number for the player’s local day (launch day, 2 November 2026, is #1), unaffected by daylight-saving changes.
  - `src/lib/game.ts`: a statement order that is the same for every player, the pick rules, and the outcome.
  - `src/lib/stats.ts`: streaks, a once-per-day record, and resuming a game in progress (localStorage).
  - `src/lib/share.ts`: share text with no spoilers, like `🟩🟩🟥 Fibbed after 2 of 4`.
  - `src/lib/fib.ts`: validation for player fibs (length, no links, not a copy of a truth).
  - `src/lib/backend.ts`: a Supabase adapter with a local fallback, plus the swap-in for a featured community fib.
  - `src/data/puzzles.ts`: 14 starter themes, each truth linked to a source. Tests check that the fib’s length doesn’t give it away.
- **Mobile first.** The Mark as true button sits in a fixed bar within thumb reach, tap targets are at least 44px, safe-area insets are respected, and nothing scrolls sideways at 360px. From 60rem wide the headline holds the left column and the statements run on the right. On desktop the keys 1 to 5 pick a statement and Enter marks it.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/20261101000000_init.sql` in the SQL editor, or use `supabase db push`.
3. Copy `.env.example` to `.env.local` and add your project URL and anon key. Add the same two variables to your host (Vercel, Netlify or Cloudflare Pages).

What the schema enforces:

- Players can send one fib per day per device, and only as `pending`. Nobody can read the fibs table directly.
- Players can record one result per day per device. Only totals are readable, through `puzzle_stats(n)`.
- `featured_fib(n)` returns a day’s featured fib only once that day has started somewhere on Earth, so tomorrow’s fib can’t be read early.

**Running a community fib:** read the pending fibs for a day in the table editor, then run `select feature_fib('<fib id>');` in the SQL editor. It replaces that day’s house fib, and the reveal credits the author.

## Content

`src/data/puzzles.ts` holds 14 days of puzzles. Past day 14 the set repeats, so add more before then. Each puzzle needs four true statements with sources, one fib and a short explanation of why the fib is false. The content tests catch missing sources, duplicate ids and fibs whose length gives them away.

## Ideas for later

- A screen for moderating fibs (today that’s done in the SQL editor).
- Let players vote on submitted fibs, so the community picks the one that runs.
- An archive of past papers.
- A share card image.
