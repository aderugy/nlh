@AGENTS.md

# poker-trainer

A responsive web app for drilling **preflop poker decisions** and **flop equity**. Two problem types:

1. **Range quiz** — the app deals a hand and a spot (e.g. "you are BTN, CO opened, you hold `A5s`"), the user picks an action, the app grades it against the stored range and shows the correct mixed-strategy answer.
2. **Equity quiz** — runs as a **session**: configure once (hero range, villain range, tolerance, hand count), then drill a fixed list of hands in a vertically-snapping scroll feed, one hand per screen, TikTok-style. Each hand is a combo from hero's range on one of 15 fixed typical flops; the user locks in an equity estimate and scrolls on. **No feedback during the drill** — every answer is revealed only in the end-of-session report.

## Scope

- **Preflop ranges, flop equity.** All range data is preflop, and the range quiz is preflop-only. The equity quiz is the one place a board appears: a flop, drawn from the fixed set in `src/lib/quiz/flops.ts`. There is no turn/river decision-making and no postflop range work.
- **Heads-up only.** Every spot is hero against exactly one villain — one villain range, one opponent hand at showdown, 2-way pot. Do not build multiway support, n-way pot splits, or more than two seats into any data structure; a `villain` field is singular, not a list.
- Both modes draw their ground truth from `ranges/ranges.json`.

## Stack

- Next.js 16.3.1 (App Router), React 19.2.8, TypeScript strict, Tailwind CSS v4 (via `@tailwindcss/postcss`, no `tailwind.config` file — configure in `src/app/globals.css`).
- Path alias `@/*` → `./src/*`.
- `npm run dev` / `build` / `start`, `npm run lint` (eslint 9 flat config).
- No test runner installed yet. When adding tests, prefer `vitest` — the parser and equity code are pure and worth testing.
- **Read `node_modules/next/dist/docs/` before writing framework code.** This Next version differs from training data (note the generated `LayoutProps<"/">` typed props in `src/app/layout.tsx`). See `AGENTS.md`.

## Range data: `ranges/ranges.json`

**Treat this file as read-only input.** It is an export from a desktop range editor (single root node `default_name`). Do not hand-edit or reformat it; write a parser instead. The user may re-export it, so the parser must tolerate the quirks documented below rather than depend on a cleaned-up copy.

### Tree shape

One recursive node type:

```ts
{ name, path: string[], order: number, expanded: boolean, type: 0|1|2, color: number,
  children: Node[],            // absent/empty on leaves
  range?: string,              // only on type 1 leaves and type 2 nodes
  marked_cells?: {hand: string, color: number, weight: number, n: number}[],
  palette?: number[] }
```

- `type: 0` — folder. `type: 1` — a **spot** (the thing the trainer quizzes). `type: 2` — one **action** inside a spot.
- `path` is the full ancestor chain including the root, so `path.slice(1).join("/")` is a stable spot id.
- Depth is **not** uniform: a spot sits at depth 2 (`Ranges de Regs/UTG`) or depth 3 (`Mes Ranges NL 10-/3bet/BB vs CO`). Walk by `type`, never by depth.
- A spot either carries `range` itself (174 spots) **or** has `type: 2` action children each carrying their own `range` (5 spots, all under `Mes Ranges NL 10-/Open Raise`, single child named `raise_standard`). Handle both.
- `marked_cells` / `palette` / `color` are editor rendering state and are redundant with `range` (only the 5 `type: 2` nodes have non-empty `marked_cells`, all `weight: 1.0`, `color: 10`). **Parse `range`; ignore these.**

### Range string notation

Comma-separated tokens. Grammar and every quirk present in the data:

| Form | Meaning |
|---|---|
| `AA`, `77` | pair |
| `AKs`, `T9s` | suited |
| `AKo`, `T9o` | offsuit |
| `AK`, `T9` (non-pair, no suffix) | **both** suited and offsuit — used heavily in `Ranges GTO Wizzard` and `Mes ranges NL 25 - 50/OR/SB` |
| `AA-44` | pair run, always descending |
| `AKs-A2s` | fixed high card, kicker descending |
| `[50]AA[/50]` | AA played 50% of the time (mixed strategy) |

Weight tags — all three encodings appear and mean the same thing (a percentage):

- bare int: `[50]…[/50]` (384 tags)
- percent-suffixed: `[50%]…[/50%]` (862 tags)
- decimal: `[50.0000]…[/50.0000]`, `[33.3333]…` (70 tags)

Weight-tag rules confirmed against the data (179 range strings):

- Dash runs are **always descending**; never assume ascending.
- Tags are **always balanced** but the closing tag's formatting may differ from the opening one: `[50%]JJ[/50.00%]`, `[35%]A5o[/35.0000]`. **Match the close by position, not by comparing the numbers.**
- A tag can **span several comma-separated tokens** (188 occurrences): `[75%]A5s-A3s,K8s-K2s,AQo[/75%]` weights all of them. So the tag is an open/close state across the token stream, not a per-token prefix.
- Tags are never nested.
- No hand appears twice in one range string, so a spot's range is a clean `hand → weight` map (untagged = 1.0).
- Each range string mixes only one tag encoding, but different spots use different ones — support all three.

The parser's output should be a `Map<Hand, number>` over the 169 canonical hands, weight in `[0,1]`.

## Domain vocabulary in the data

The tree is authored in French; keep the user's own labels in the UI rather than translating them.

- **6-max positions**: `UTG`, `HJ` (hijack), `CO`, `BTN`, `SB`, `BB`. No MP. Spot names are `"<hero> vs <villain>"` (`BB vs CO`) or bare hero position for opens (`UTG`).
- **Actions / folder names**: `Open Raise` / `OR` (first in), `Défense de blinds` / `Call` / `CPFR` (call preflop raise), `3bet`, `C3bet` / `Call 3bet`, `4bet`, `C4bet`, `5bet`, `CAI` (call all-in), `L/C` (limp/call).
- **Top-level groups** are *whose* range it is. This decides what the **range quiz** may use as an answer key; the **equity quiz** ignores the distinction and offers every spot in both of its selectors.
  - `Mes Ranges NL 10-`, `Mes ranges NL 25 - 50` — **hero's own ranges → the only valid range-quiz answer keys.** The two stake families overlap in spot names; keep them separate and let the user pick which to drill.
  - `Ranges de fishs`, `Ranges de regfishs`, `Ranges de Regs`, `Ranges Live`, `Ranges GTO Wizzard` — **opponent models.** Their names are free-form prose (`CPFR Fish CS 50/3 en BB`, `3bet BTN vs CO linéaire`), not a parseable position grammar. Do not try to auto-derive position/action from them; surface them as a labelled list the user selects from.
- The `Mes ranges NL 25 - 50` tree has `Théorie` vs `Appliquée` variants of some spots — distinct answer keys, not duplicates.

## Architecture conventions

- **`src/lib/ranges/`** — pure, framework-free: range-string parser, the 169-hand grid model, hand/combo utilities, spot-tree loading and indexing. No React, no `next/*` imports. Easiest thing to test.
- **`src/lib/equity/`** — pure equity computation (hand vs weighted range).

  **Definition of equity** — the expected share of the pot hero's hand wins at showdown, running the board out with no further betting. Per runout: win = 1, tie = 0.5, loss = 0. So over runouts `R`:

  ```
  equity = (wins + 0.5 * ties) / |R|
  ```

  A tie splits the pot, so it is worth exactly half a win — never count ties as losses, and never drop them from the denominator. **Showdowns are heads-up only** (see Scope), so a tie is always a 2-way chop worth exactly 0.5. Don't write an n-way split; compare two hands and branch three ways.

  Over a **weighted** villain range, equity is the weight-average of per-combo equities:

  ```
  equity = Σ w(c) * equity(hero, c) / Σ w(c)
  ```

  where `c` ranges over villain combos that collide with neither hero's two cards **nor the three flop cards**. **Renormalize after card removal, not before** — those five cards block some of villain's combos, and dropping them changes the denominator.

  Implementation: because the quiz runs on a flop, only the turn and river are unknown, so equity is computed **exactly** — every one of the C(45,2) = 990 runouts per villain combo is enumerated. No Monte Carlo, no sampling error, nothing to tune: the graded number is the true one, and the same question always returns the same answer. Cost is `combos × 990` runouts, ~1.0M for the widest range in the data (`Ranges de fishs/CPFR Fish CS 50/3 en BB`, 1030 combos) which measures ~90 ms on desktop — so it runs in a Web Worker, kicked off the moment the hand is dealt. Don't reintroduce sampling; if it ever needs to be faster, precompute hero's score per runout (already done) before reaching for approximation.

  Hero's hand and the board must be disjoint. `equityOnFlop` throws if they aren't, rather than returning a plausible-looking wrong number — a duplicated card silently shortens the runout enumeration.
- **Problem generation is pure and seedable** — a function from `(spot, seed)` to a question, so a question can be replayed and graded deterministically. Sample **combos, not cells**: build the combo list with the dead cards removed and draw one proportional to weight. That gets combo counts right for free (`AKs` = 4, `AKo` = 12, `AA` = 6 — uniform sampling over the 169 cells would over-represent suited hands three-to-one) *and* correctly de-weights hands the board has partly blocked.
- **Grading against mixed strategies**: a hand at weight 0.5 has no single right answer. Grade as "acceptable" and show the mix; don't mark the user wrong on a fraction.
- `ranges.json` is 165 KB. Load and parse it once (server side or a module-level singleton), not per question.
- **Mobile-first**: the app is used on a phone. The 13×13 range grid must stay readable at ~360 px wide — that constraint drives the layout, not the desktop view.
- Keep interactive quiz UI in client components; keep data loading/parsing on the server or in a shared module.

## Equity session flow

Three phases, one client component tree under `src/app/equity/`:

1. `SessionConfig` — hero range, villain range, tolerance, hand count. Both range pickers list all 179 ranges.
2. The feed — `QuestionCard` per hand inside a `snap-y snap-mandatory` scroll container, each card `h-[100dvh] snap-start`. Locking in a guess auto-scrolls to the next card. Skipping is allowed and recorded as such.
3. `SessionResults` — the summary, which is the last snap section in the same feed, so scrolling past the final hand lands on it.

Two rules this structure exists to enforce:

- **Never reveal an answer mid-session.** `QuestionCard` receives the guess (to show it as locked in) and nothing else — no equity, no verdict. Grading happens once, in `summarizeSession`. If a future feature needs per-hand feedback, it belongs behind an explicit setting, not in the card.
- **Questions are built up front, answers solved in the background.** `buildSession` generates the whole list from one seed, then the orchestrator walks it and solves each hand in the worker while the user drills — a 10-hand session finishes solving in ~300 ms, long before anyone reaches the summary. The summary tolerates hands that are still pending or that failed, rather than blocking on them.

Session state is in-memory only (see below): reloading mid-session loses it, which is accepted for now.

## Settled product decisions

- **Equity tolerance is a parameter**, not a constant. It lives in user-adjustable settings and is threaded into grading; never inline a magic ±x%.
- **No persistence yet.** Session state and results are in-memory only. Don't add localStorage or a DB until asked — but keep `EquitySession` / `SessionSummary` serializable so persistence is a later drop-in (a session is fully described by its config plus its seed).
- **Equity quiz range selection is unconstrained**: two independent pickers over all 179 spots (hero + villain). Do not filter villain by hero's group or try to validate that the pair is a real game situation. Hero's hand is sampled from hero's selected range, weighted by combo count.
- **Results come at the end, not per hand.** The user drills without feedback so their estimates stay uncontaminated; the report is the payoff. Don't add a "show answer" button to the drill.
- **The flop set is fixed**: 15 typical flops in `src/lib/quiz/flops.ts`, one drawn uniformly per question. They are the user's chosen training boards — don't randomise the flop over all 22100 possibilities, and don't reorder or "improve" the set. Adding to it is the user's call.

## Open decisions

Not settled yet — ask rather than assume: how spots are chosen in a range-quiz session (single spot drilled repeatedly vs random over a selected group), whether the equity quiz should let the user pin a specific flop instead of drawing one at random, and whether the range quiz should reuse the same session/scroll-feed shape as the equity quiz.
