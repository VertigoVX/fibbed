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

- **Stack:** Vite, React 19 and TypeScript. Two pages: `index.html` (the game) and `moderate.html` (the editor’s desk). Tests use Vitest, Testing Library, PGlite (an in-memory Postgres for the schema) and Playwright.
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

## Moderating fibs

The editor’s desk is at `/moderate.html` (on GitHub Pages: `https://vertigovx.github.io/fibbed/moderate.html`). It opens on tomorrow’s paper and shows:

- the fib that will run that day (the house fib, or the player fib you picked)
- every fib players sent for that day, with Run this fib, Reject and Restore
- other days that have fibs waiting

To become an editor:

1. Run `supabase/migrations/20261101120000_editors.sql` in the SQL editor (once, after the first migration).
2. In Supabase, open Authentication > Users > Add user, and create yourself with an email and password (tick auto-confirm).
3. In the SQL editor, run:
   ```sql
   insert into public.editors (user_id) select id from auth.users where email = 'you@example.com';
   ```

Only accounts in `editors` can read fibs or call the moderation functions. A signed-in account that isn’t an editor sees nothing, and players never need an account. Nobody can add an editor through the API; it has to be done in the SQL editor.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` tests, builds and publishes the site on every push to `main`. One-time setup: in the repo, open Settings > Pages and set Source to **GitHub Actions**. The site is served at `https://vertigovx.github.io/fibbed/`.

The workflow builds with your project’s URL and publishable key. To point it at another project, add repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Settings > Secrets and variables > Actions > Variables).

## Content

`src/data/puzzles.ts` holds 14 days of puzzles. Past day 14 the set repeats, so add more before then. Each puzzle needs four true statements with sources, one fib and a short explanation of why the fib is false. The content tests catch missing sources, duplicate ids and fibs whose length gives them away.

## Ideas for later

- Let players vote on submitted fibs, so the community picks the one that runs.
- An archive of past papers.
- A share card image.
