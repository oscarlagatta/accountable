# Status

The MVP is built from `docs/changes/mvp/plan.md`, phases 0 to 7. `npm test` passes: the strict traceability check, 114 pytest tests, 64 Vitest tests and 36 Playwright tests. The last step is the project owner's own walkthrough and sign-off (C8).

## Running it

Prerequisites: Node 24 or later, [uv](https://docs.astral.sh/uv/), Google Chrome (for the end-to-end tests).

```
npm install        # once
npm run dev        # backend on :8000, frontend on http://localhost:5173
npm run seed       # reset the data to the sample data (works while the app runs)
npm test           # traceability check, pytest, Vitest, Playwright
```

The database is `backend/data/accountable.db`, created and seeded on first start. Set `ACCOUNTABLE_DB` to use another file. Tests use their own databases. `npm run seed -- --scale` fills 1,000 contacts, 500 deals and about 5,000 activities, for checking speed.

## What's built

- Dashboard: summary figures, the pipeline strip, revenue won (line), deals won and lost (bars), the sales funnel, follow-ups with Mark done, recent activity, and Log activity with a contact-or-deal picker.
- Organizations, Contacts (with the status filter) and Deals: tables with search, sort, add, edit and delete (with linked-record counts), and record pages.
- Activities: log, edit, delete and mark done on contacts and deals; timelines newest first; stage-change entries added automatically and locked.
- Pipeline: six columns, drag between and within columns with mouse or keyboard, positions kept, totals that change on drop and roll back on error, add a deal in a column.

## Phase 7 checks

- Dashboard and pipeline compared with `docs/mockups/mockup-2-command.png`; the other pages checked against the brand. The top bar's search box is left out (Concerns 13).
- Scale: with the `--scale` data, each page loads in under 0.5 s in Chrome; a search over 1,000 contacts takes about 60 ms and a sort about 50 ms.
- Contrast, below 4.5:1 and left as the spec and brand set them, for the owner to decide:
  - `--ink-muted` (Midnight at 62%) is 3.95:1 on white and 3.78:1 on the page; 70% would pass
  - white on Cerulean (3.96:1) and on Raspberry (3.62:1), which the brand specifies
  - Midnight on the Lost slate (4.46:1)
- The darkened shades pass: Sea Green ink 5.33:1, Marigold ink 4.73:1, Cerulean ink 5.16:1, Raspberry ink 5.53:1.

## Docs layout

`docs/spec.md` describes the whole product as it stands. Each change has its own folder, `docs/changes/<branch>/`, with its `intent.md` and `plan.md`; the MVP's are in `docs/changes/mvp/`.

`scripts/check-trace.mjs` reads `docs/changes/mvp/intent.md` and `docs/changes/mvp/plan.md`.

## Checks

`npm run check` runs formatting, linting, complexity, type checks, gitleaks and all the tests with coverage, and passes (frontend coverage about 90% lines, backend 97%). `npm run check:quick` skips the end-to-end tests, and `npm run format` fixes formatting.

## Hooks

A lefthook pre-commit hook (format, lint, types, gitleaks), and two agent hooks: `npm run check:quick` at the end of each turn, and a block on editing `.env` files. See AGENTS.md.

## Next

- The project owner's walkthrough (C8, C9), then sign-off.
