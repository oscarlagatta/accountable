# Plan: building the Accountable MVP

This plan builds what `docs/spec.md` describes, for the intent in `docs/changes/mvp/intent.md`. The stack is in `docs/TECH_STACK.md`, the look is from the brand skill, and the chosen design is `docs/mockups/mockup-2-command.html` (screenshot beside it). Where this plan and the spec differ, the spec wins. Requirement numbers such as R30 and success criteria such as C4 point to the spec and the intent.

The work is in eight phases. Each phase ends with `npm test` passing, `docs/STATUS.md` updated, and a commit. A phase isn't started until the one before it is committed.

Every phase lists the spec IDs it delivers, and every test names the IDs it proves. The "Traceability" section at the end maps each requirement (R1 to R49), each concern (K1 to K15, the spec's "Concerns" 1 to 15) and each success criterion (C1 to C9) to its phases and tests. `scripts/check-trace.mjs` checks that mapping, so a gap stops `npm test`.

## Files that change

Everything below is new except `docs/STATUS.md`. `README.md`, `docs/intent.md`, `docs/TECH_STACK.md` and the mockups are left as they are. `.gitignore` already covers `node_modules/`, `.venv/`, `*.db`, `test-results/` and `playwright-report/`, so it doesn't change.

### Root

| File | What it's for |
|---|---|
| `package.json` | npm workspaces (`frontend`, `e2e`) and the scripts `dev`, `seed`, `test`, `test:trace`, `test:backend`, `test:frontend`, `test:e2e` |
| `scripts/check-trace.mjs` | The traceability check described under Proof |
| `package-lock.json` | Locked npm dependencies |
| `pyproject.toml` | The backend's Python project: Python 3.12, FastAPI, Uvicorn, SQLAlchemy, Pydantic, Faker; dev group with pytest and httpx |
| `uv.lock` | Locked Python dependencies |

### Backend (`backend/`)

The backend is grouped by business area. `core/` holds what every area needs, and `crm/` holds the MVP. A future area, such as ERP, becomes a sibling folder of `crm/` with its own tables and routers, so nothing existing has to move. Inside `crm/`, each area that has its own records gets a folder with `router.py` (thin HTTP layer), `service.py` (the rules) and `schemas.py` (Pydantic models). Pipeline and dashboard only read data, so each is a single file.

| File | What it's for |
|---|---|
| `backend/__init__.py`, `backend/app/__init__.py` | Make `backend.app` importable from the repo root |
| `backend/app/main.py` | Builds the FastAPI app, includes each area's router under `/api`, start-up that creates and seeds a new database |
| `backend/app/core/settings.py` | Database path from `ACCOUNTABLE_DB`, default `backend/data/accountable.db`; creates the folder |
| `backend/app/core/clock.py` | `today()` and `now()` in local time, the only place the app reads the clock, so tests can fix it |
| `backend/app/core/db.py` | SQLAlchemy Core engine, the one shared `MetaData`, `PRAGMA foreign_keys=ON` on every connection, a connection helper for routers, `create_all` |
| `backend/app/crm/tables.py` | The four CRM tables on the shared `MetaData`, with foreign keys, delete rules, the activity check constraint and indexes. They're linked to each other, so they stay in one file |
| `backend/app/crm/stages.py` | The six stages in order, their labels, default probabilities, and which are open. The single source of stage rules; the frontend gets them from the API |
| `backend/app/crm/organizations/` | `router.py`, `service.py`, `schemas.py`: list with counts and open value, get, create, update, delete, delete preview |
| `backend/app/crm/contacts/` | The same for contacts, plus the contact's deals |
| `backend/app/crm/deals/` | The same for deals, plus `late`, expected revenue, stage change, the close-date rule and positions |
| `backend/app/crm/activities/` | Create, update, delete, mark done (refusing edits to stage-change entries), and the contact and deal timelines |
| `backend/app/crm/pipeline.py` | Router and read-only queries: columns with ordered deals, totals, open totals, and the stage list |
| `backend/app/crm/dashboard.py` | Router and read-only queries: summary figures, revenue and won/lost by month, the strip, the funnel, follow-ups, recent activity |
| `backend/app/crm/seed.py` | The sample data generator (fixed seed, dates relative to today); `python -m backend.app.crm.seed` resets the data. A `--scale` option fills 1,000 contacts, 500 deals and 5,000 activities, for the scale tests only |
| `backend/tests/conftest.py` | A fresh temporary database per test, a fixed `today`, a FastAPI `TestClient`, and small factories |
| `backend/tests/core/test_*.py`, `backend/tests/crm/test_*.py` | The backend tests listed under Proof, mirroring the code's folders |

### Frontend (`frontend/`)

| File | What it's for |
|---|---|
| `frontend/package.json` | React, Vite, TypeScript, Tailwind CSS, shadcn/ui's dependencies, React Router, TanStack Query and Table, dnd-kit, Recharts, React Hook Form, Zod, Lucide, date-fns, Sonner, the three `@fontsource` packages, Vitest and Testing Library |
| `frontend/vite.config.ts` | React and Tailwind plugins, `/api` proxy to the backend port (`API_PORT`, default 8000), frontend port from `PORT` (default 5173), Vitest settings |
| `frontend/tsconfig*.json`, `frontend/index.html` | TypeScript settings with the `@/` alias, the page shell |
| `frontend/components.json` | shadcn/ui settings |
| `frontend/src/index.css` | Tailwind, brand tokens, shadcn theme variables pointed at the brand, font imports |
| `frontend/src/main.tsx` | Mounts the app |
| `frontend/src/app/App.tsx`, `routes.tsx`, `queryClient.ts` | The app frame, the routes, the TanStack Query client and the toaster |
| `frontend/src/app/TopBar.tsx` | The Midnight top bar with the five section links |
| `frontend/src/components/ui/*` | shadcn/ui components added with its CLI, left as generated apart from theming: button, input, textarea, label, select, dialog, alert-dialog, sheet, dropdown-menu, form (or field), table, badge, checkbox, chart, sonner, tooltip, popover, command |
| `frontend/src/components/DataTable.tsx` | TanStack Table with search, sortable headings, row actions, empty state |
| `frontend/src/components/RecordSheet.tsx` | The 440px side panel that holds add and edit forms |
| `frontend/src/components/ConfirmDialog.tsx` | Delete confirmation with the linked-record counts from the delete preview |
| `frontend/src/components/PageHeader.tsx`, `Money.tsx` | Title, line under it and actions; money in mono with its currency |
| `frontend/src/lib/api.ts` | The fetch wrapper: JSON in and out, error messages, field errors |
| `frontend/src/lib/format.ts` | Money (`$45,000`, `$1.2M`), dates, percentages |
| `frontend/src/features/organizations/` | `OrganizationsPage`, `OrganizationPage`, `OrganizationForm`, `api.ts` (types and TanStack Query hooks) |
| `frontend/src/features/contacts/` | `ContactsPage` (with status filter), `ContactPage`, `ContactForm`, `StatusBadge`, `api.ts` |
| `frontend/src/features/deals/` | `DealsPage`, `DealPage`, `DealForm`, `StageBadge`, the late label, `stages.ts` (stage colors and text colors only; labels and probabilities come from the API), `api.ts` |
| `frontend/src/features/activities/` | `Timeline`, `ActivityForm` (one form for logging and editing, with an optional contact-or-deal picker for the dashboard), `api.ts` |
| `frontend/src/features/pipeline/` | `PipelinePage`, column, `Card`, drag logic, optimistic totals, `api.ts` |
| `frontend/src/features/dashboard/` | `DashboardPage` (header with greeting), feature panel, the three charts, follow-ups, recent activity, `api.ts` |
| `frontend/src/**/*.test.ts(x)`, `frontend/src/test/setup.ts` | The frontend tests listed under Proof, next to the files they test |

Each feature folder owns its pages, form, data hooks and types, and imports shared pieces from `components/` and `lib/`. Features may import from each other where one shows another's records (for example, the dashboard uses `StageBadge` from `deals`). A future area is a new folder in `features/`, a route and a top-bar link.

### End-to-end (`e2e/`)

| File | What it's for |
|---|---|
| `e2e/package.json` | `@playwright/test` |
| `e2e/playwright.config.ts` | Installed Chrome (`channel: "chrome"`), one worker, test ports (backend 8100, frontend 5180), `ACCOUNTABLE_DB` set to `e2e/.data/test.db`, `webServer` entries that seed and start both servers |
| `e2e/fixtures.ts` | A page fixture that fails the test on any console error or page error |
| `e2e/tests/*.spec.ts` | The end-to-end tests listed under Proof |

### Docs

| File | What it's for |
|---|---|
| `docs/STATUS.md` | Updated at the end of every phase; from phase 0 on, it says how to install and run the app |

## Order of work

### Phase 0: Scaffold and tooling

Goal: every command in the stack works on an empty app.

Delivers: R1, R4, R5; K2, K3, K12 (fonts and tokens). Starts C1.

Set up the folder structure from "Files that change" from the start (`core/`, `crm/`, `app/`, `components/`, `lib/`, `features/`), so later phases only add files.

1. Root `package.json` with workspaces and scripts. `npm run dev` uses `concurrently` to run `uv run uvicorn backend.app.main:app --reload --port 8000` and the Vite dev server. `npm test` runs `test:trace`, then `test:backend` (`uv run pytest`), then `test:frontend` (`vitest run`), then `test:e2e` (`playwright test`), and stops at the first failure.
2. `pyproject.toml` and `uv.lock` with `uv add`. A FastAPI app in `backend/app/main.py` with `GET /api/health`.
3. Vite React TypeScript app in `frontend/`. Tailwind CSS through its Vite plugin. `npx shadcn@latest init`, then the components listed above.
4. `index.css` with the brand tokens from the spec, shadcn's theme variables pointed at them, and the three `@fontsource` fonts imported (no Google Fonts link anywhere).
5. Playwright in `e2e/` with installed Chrome and the test ports and database. Environment variables are set in `playwright.config.ts`, not in npm scripts, so they work on Windows too.
6. A placeholder page with `app/TopBar.tsx`, to prove fonts and tokens load.
7. `scripts/check-trace.mjs` and the `test:trace` script, which `npm test` runs first.
8. `docs/STATUS.md`: prerequisites (Node 24+, uv, Google Chrome), `npm install`, `npm run dev`, `npm test`, `npm run seed`.

Commit: "Build: phase 0, scaffold".

### Phase 1: Database and sample data

Goal: a new database fills itself with realistic sample data, and `npm run seed` resets it.

Delivers: R2, R3, R23 (in `crm/stages.py`), R40's data (stage history), R45 to R49; K4, K8, K9.

1. `core/settings.py`, `core/clock.py`, `core/db.py`, `crm/stages.py`.
2. `crm/tables.py` with the four tables from the spec's data model, foreign keys with their delete rules, the check that an activity has exactly one of contact or deal, and the indexes.
3. `crm/seed.py`: Faker on a fixed seed for people, hand-written lists for about 25 companies across 6 to 8 industries and for deal names. It makes the volumes in R46 to R49. Deals get a stage history made of stage-change entries, the funnel's source (Concerns 4). Won and lost deals spread over 12 months, 4 to 6 late open deals, about 10 follow-ups due in two weeks and 4 to 6 overdue. All dates are relative to `clock.today()`.
4. The reset runs in one transaction: delete all rows, then insert. It doesn't delete the file, so it works while the app is running (R3).
5. Start-up in `main.py`: if the file doesn't exist, create the tables and seed (R2).

Commit: "Build: phase 1, database and sample data".

### Phase 2: Backend API and rules

Goal: the whole API from the spec, with every rule in the areas' `service.py` files.

Delivers the backend half of: R6, R12, R14 (lean list responses), R19 to R25 (R23 served to the frontend), R27, R28, R30, R31, R33, R36 to R43; K1, K4, K6, K7, K10.

1. Organizations, contacts and deals: list, get, create, update, delete and delete preview. Lists carry the extra fields the tables need (counts, open value, names, expected revenue, `late`).
2. Delete rules from Concerns 1 and the intent:
   - Deleting an organization unlinks its contacts and deals.
   - Deleting a contact unlinks its deals and deletes its activities.
   - Deleting a deal deletes its activities and stage-change entries.
3. Stage change in `crm/deals/service.py`, used by both `PATCH /deals/{id}` and `POST /deals/{id}/move`. In one transaction it:
   - sets the new stage's probability (R24)
   - sets the close date to today on Won or Lost unless the edit form gave one (Concerns 7)
   - adds a stage-change entry (R22)
   - places the deal in its new column
4. Positions: `move` takes `{stage, index}` and renumbers the affected columns 0..n. A new deal goes to position 0 (R30, R33).
5. Activities: create (on exactly one contact or deal), update, delete, mark done. Stage-change entries refuse update and delete (Concerns 10).
6. Timelines in `crm/activities/service.py` (R20 and Concerns 6). A contact's timeline includes the activities of deals where it's currently the main contact, with the deal's name and id.
7. `GET /pipeline` with columns and totals, open totals that leave out Won and Lost (R27, R28), and the stage list (key, label, probability, open) from `crm/stages.py`, so the frontend never repeats the stage rules (R23).
8. `GET /dashboard` with everything from R36 to R42, worked out on each request (R43).
9. Validation errors as 422s with a message per field.

Commit: "Build: phase 2, API".

### Phase 3: Frontend foundation

Goal: the app frame and the shared pieces every page uses.

Delivers the shared half of: R7 to R12, R14 (client-side table), R18 (links in the table), R26; K3 (stage colors in `features/deals/stages.ts`), K13 (top bar with no search).

1. `app/`: routes for the eight pages (placeholders where needed), the query client, the toaster, and the top bar matching the mockup with the current page highlighted.
2. `lib/api.ts` and `lib/format.ts`. Each feature's `api.ts` starts with its types and hooks. After each change, the affected queries are invalidated.
3. `features/deals/stages.ts` with the stage colors, plus `StageBadge` and `StatusBadge`.
4. `components/`: `DataTable` (search, sort, row actions, empty state, row click), `RecordSheet`, `ConfirmDialog` (loads the delete preview), `PageHeader`, `Money`.

Commit: "Build: phase 3, frontend foundation".

### Phase 4: Tables, record pages and activities

Goal: C2, C3 and C5, apart from the dashboard.

Delivers: R6 to R13, R15 to R22, R24 (form); K1 (dialog wording), K5, K11. Covers C2, C3 and the record-page half of C5.

1. Organizations, Contacts (with the status filter, R13) and Deals tables with the columns in the spec. Add, edit and delete open the side panel or the confirm dialog.
2. Forms with Zod: required fields, email format, website format, value ≥ 0 and whole, probability 0 to 100. The deal form's contact picker lists the deal's organization's contacts first (Concerns 11). Changing the stage in the form fills in that stage's probability, and the user can then override it.
3. Record pages (R15 to R17). Every linked name in tables, record pages, timelines and cards is a real link to that record (R18). The organization page's "Add" buttons pre-fill the organization.
4. `Timeline` and the one `ActivityForm` for logging and editing, deleting activities, and Mark done on follow-ups (R19 to R22).

Commit: "Build: phase 4, tables, records and activities".

### Phase 5: Pipeline board

Goal: C4.

Delivers: R27 to R35. Covers C4.

1. Board, columns and cards as in the spec's "Pipeline board" and the mockup: the summary strip, solid stage headers, page-colored cards and a "Late" pill. Each card shows the deal name, organization, main contact, value and close date, with "Late" in place of the date when late (R29).
2. dnd-kit sortable lists per column, with pointer and keyboard sensors (R35). Dropping calls `move`. The query cache updates first, so cards, column totals, open totals and the strip change at once. On error it rolls back and shows a toast (R32).
3. "+ Add deal" per column opens the deal form with that stage fixed. The new deal lands at the top (R33). Clicking a card opens the deal (R34), without starting a drag.

Commit: "Build: phase 5, pipeline".

### Phase 6: Dashboard

Goal: C6, C7 and C9.

Delivers: R36 to R44; K14, K15. Covers C6, C7, the dashboard half of C5, and makes C9 possible.

1. Header with the greeting (worked out in the header itself), the date, "Log activity" (the same `ActivityForm` with its contact-or-deal picker turned on, Concerns 14) and "Add deal".
2. The Midnight feature panel: summary figures, then the pipeline strip with per-stage figures. Clicking it opens the board.
3. Three charts with shadcn/ui Chart: revenue won (line with a flat tint), won and lost (bars with a legend), and the funnel (vertical bars with the share carried on). Each has a tooltip with exact dollar figures.
4. The follow-ups table with Mark done, and recent activity with colored dots. Every row links to its contact or deal.

Commit: "Build: phase 6, dashboard".

### Phase 7: Check against the mockup, scale, walkthrough

Goal: C1, C7, C8 and C9 checked by eye, and the agent's half of the walkthrough done.

Checks: R5, R14, R44; C1, C7, C8, C9. Runs the full traceability check.

1. Screenshot the dashboard and pipeline at 1488px wide with Playwright, compare them with `docs/mockups/mockup-2-command.png`, and fix differences. Screenshot every other page and check it against the brand skill.
2. Check contrast of the darkened text shades (4.5:1 on white) and of white or Midnight text on each stage color.
3. Scale check (R14): the automated scale tests already run in `npm test`. On top of them, run `npm run seed -- --scale` against a scratch database, open the app, and check by eye that tables search and sort without lag and that the board and dashboard load in about a second.
4. The agent's walkthrough (C8). Run `npm run seed`, then `npm run dev`, and use every section and action in a real browser as a salesperson would, with the console open. Then answer the five questions from C9 starting from the dashboard. Fix anything found and add a test for each bug.
5. Run `node scripts/check-trace.mjs --strict` and fix every gap it reports (see Proof).
6. `docs/STATUS.md`: what's built, how to run it, and that the project owner's walkthrough is the last step.

Commit: "Build: phase 7, checked". The MVP is done only when the project owner has done their own walkthrough and says it's good to go (C8).

## Risk and proof

### Risks

| Risk | What could go wrong | How the plan handles it |
|---|---|---|
| Drag and drop persistence | Cards jump back, land in the wrong slot after refresh, or totals lag | One `move` endpoint renumbers columns in a transaction. The cache updates optimistically with rollback. Positions are tested in pytest, and drag is tested end to end with a reload. |
| Dates and "today" | Overdue, late and month buckets are off by a day or a month, or tests break on certain days | `clock.py` is the only clock and pytest fixes it. Month buckets are built from `today()` back 12 months. The tests include month-end and year-change dates. |
| Funnel accuracy | A Won bar taller than Negotiation, or lost deals not counted where they dropped out | The funnel reads stage history and counts earlier stages as reached. A pytest test checks the numbers on a hand-made history and checks the funnel never increases. |
| Sample data looks thin or dead | Empty months, no late deals, no overdue follow-ups | The seed's spread is checked by pytest against R46 to R49. |
| Seeding while the app runs | The reset fails or corrupts data because SQLite is locked | The reset deletes and inserts in one transaction rather than deleting the file. A test runs a reset with a second connection open. |
| Tests touch real data | `npm test` changes the user's database | pytest uses temporary files. Playwright sets `ACCOUNTABLE_DB` to `e2e/.data/test.db` and reseeds at start. A test checks that settings honour `ACCOUNTABLE_DB`. |
| End-to-end tests interfere with each other | One test's changes break another's assertions | One worker. Tests that change data use uniquely named records. Dashboard assertions compare the page with `GET /api/dashboard` rather than fixed numbers. |
| Works offline | Fonts or icons fetched from the internet | Fonts come from `@fontsource` and icons from Lucide. An end-to-end test fails if any request leaves `localhost`. |
| Cross-platform commands | Scripts break on Windows | No shell-specific syntax in npm scripts. Environment variables go in config files, and `concurrently` runs the two processes. |
| shadcn/ui CLI changes | The Form component has been replaced by Field in newer versions | Use whichever the current CLI offers. Both are built on React Hook Form and Zod, so the plan doesn't change. |
| Brand colors in charts | Sea Green and Marigold are faint on white | Every stage mark carries its name and figures, bars have gaps, and the text uses the darkened shades. This is checked in phase 7. |
| Speed at the stated scale | Tables slow down with 1,000 rows | Client-side TanStack Table with memoised rows. Lists return only the fields the table needs. Automated timing tests at the stated scale (`test_scale.py`, `DataTable.scale.test.tsx`), plus a check by eye in phase 7. Time limits are generous, so slow machines don't give false failures. |
| Scope creep from the mockup | A global search or other extras get built | Concerns 13 to 15 in the spec decide them. Nothing outside the spec gets built. |
| A spec ID gets missed | A requirement is built by no phase or proved by no test | Every phase lists its IDs, every test names its IDs, and `scripts/check-trace.mjs` fails `npm test` on any gap. |

### Proof

`npm test` runs all of these, and every phase adds its own. A phase isn't done until its tests pass along with all the earlier ones.

Each test's title starts with the IDs it proves, such as `[R30] a card dropped higher in its column stays there after a reload`. That's what lets the traceability check find them.

#### Backend unit and API tests (pytest, `backend/tests/`)

`test_settings.py`, `test_clock.py` and `test_db.py` are in `backend/tests/core/`. The rest are in `backend/tests/crm/`.

| File | Proves | IDs |
|---|---|---|
| `test_settings.py` | `ACCOUNTABLE_DB` picks the file. The default is `backend/data/accountable.db`. | R4 |
| `test_clock.py` | `today()` and `now()` use the computer's local time, and tests can fix them. | K9 |
| `test_db.py` | Tables and indexes exist on the shared `MetaData`. Foreign keys are on, with the delete rules from the spec. An activity with both or neither of contact and deal is refused. | K1 |
| `test_startup.py` | A missing database is created and seeded on start, and an existing one is left alone. | R2, C1 |
| `test_seed.py` | Volumes are near R46 to R49, and every stage has deals. There are 4 to 6 late deals, 4 to 6 overdue follow-ups and about 10 due in two weeks. Values are $5,000 to $150,000. Every deal has a stage history, and dates are relative to the fixed today. The same seed gives the same data. The reset works with another connection open. | R3, R40, R45 to R49, K4, K8 |
| `test_organizations.py` | CRUD. The list's counts and open value are right. Delete unlinks contacts and deals, and the preview counts match. Validation messages are given. | R7, R12, K1, C2 |
| `test_contacts.py` | CRUD, including status. Delete unlinks deals and deletes the contact's activities, and the preview counts match. | R12, K1, C2 |
| `test_deals.py` | CRUD. A new deal gets its stage's probability and position 0. Expected revenue and `late` are right (open and past the close date only). A hand-set probability is kept until the stage changes. Delete removes activities. | R23, R24, R25, R33, K1, C2 |
| `test_stage_change.py` | Each stage change sets the probability and adds a "Moved from X to Y" entry. Won and Lost set the close date to today, except from the edit form with a date. Moving back to open keeps the date. Creating a deal adds no entry. | R22, R24, R31, K7 |
| `test_positions.py` | Moving within a column, between columns, to the top, to the bottom and into an empty column gives the right order, with no gaps or duplicates. The order survives a new connection. | R30, R33, C4 |
| `test_activities.py` | Create on a contact or a deal, update, delete, mark done. Stage-change entries refuse update and delete. | R19, R21, K10, C5 |
| `test_timeline.py` | Newest first. A contact's timeline includes its deals' activities with a deal link, and they follow a change of main contact. A deal's timeline includes stage changes. | R20, R22, K6, C5 |
| `test_pipeline.py` | Six columns in order. Column counts, totals and expected revenue are right. Open totals leave out Won and Lost. The stage list carries each stage's label, probability and whether it's open. | R23, R27, R28, C4 |
| `test_dashboard.py` | On a hand-made dataset with a fixed today, checks every figure: open value, expected revenue, won this month, win rate, follow-up counts, 12 months of revenue and won/lost (including a year change), strip segments, funnel values and shares (never increasing), follow-up order (overdue, today, upcoming), and the 10 latest entries. A won deal and a new follow-up show up straight away. | R36 to R43, K4, K9, C6 |
| `test_scale.py` | With the `scale` seed (1,000 contacts, 500 deals, 5,000 activities), the contacts, deals, organizations, pipeline and dashboard endpoints each answer within 500 ms. | R14 |

#### Frontend unit tests (Vitest and Testing Library, `frontend/src/`)

| File | Proves | IDs |
|---|---|---|
| `lib/format.test.ts` | `$45,000`, `$0`, `$1.2M`, `$950K`. Dates and percentages. The currency always shows. | R26 |
| `features/deals/stages.test.ts` | Every stage key has a color and a readable text color, and an unknown key fails loudly. | K3 |
| `lib/tokens.test.ts` | No color values appear in `src/` outside `index.css`. Every stage color is a token. | K3, K12 |
| `app/TopBar.test.tsx` | All five sections are linked, the current one is marked, and there's no search box. | R44, K13 |
| `components/DataTable.test.tsx` | Search filters across text columns, case-insensitive. Clicking a heading sorts and clicking again reverses, with an arrow showing. The empty state offers to clear the search. Row actions don't open the row. Linked cells are real links. | R7, R8, R9, R11, R18 |
| `components/DataTable.scale.test.tsx` | 1,000 rows render, and a search and a sort each finish within 200 ms. | R14 |
| `components/ConfirmDialog.test.tsx` | Shows the record name and the preview counts. Cancel does nothing, and Delete calls the API. | R12, K1 |
| `features/*/*Form.test.tsx` | Required fields, email and website formats, value and probability limits, with messages under the fields. The deal form fills the stage probability from the API's stage list and lets it be overridden. The contact picker puts the organization's contacts first. The activity form works for adding and editing, and its contact-or-deal picker requires a choice. | R10, R19, R21, R24, K11, K14 |
| `features/contacts/ContactsPage.test.tsx` | The status filter works together with the search. Status labels read "Status: Qualified" and so on. | R13, K5 |
| `features/deals/DealPage.test.tsx` | The deal page shows stage, value, probability, expected revenue and close date, links to its organization and main contact, and has a timeline. | R17, R18 |
| `features/activities/Timeline.test.tsx` | Newest first, the right icon per kind, and a deal link on contact timelines. Stage changes have no edit or delete. Overdue follow-ups are in Raspberry with Mark done. | R20, R21, R22, K10 |
| `features/pipeline/Card.test.tsx` | A card shows the deal name, organization, main contact, value and close date. A late card shows "Late" in place of the date. | R29 |
| `features/pipeline/board.test.ts` | The optimistic move updates column and open totals and the strip, and rolls back on error. Won and Lost are left out of the open totals. | R27, R28, R32 |
| `features/dashboard/*.test.tsx` | The feature panel shows the API's figures. Follow-ups are in the right order with the right chips. Charts render with the right number of points and bars. Clicking the strip goes to the board. | R36 to R42, K15 |

#### End-to-end tests (Playwright with installed Chrome, `e2e/tests/`)

Every test fails on any browser console error (`e2e/fixtures.ts`).

| File | Proves | IDs |
|---|---|---|
| `start.spec.ts` | Opening the app lands on the dashboard with sample data. Every section has data. No request leaves `localhost`. | R1, R5, R7, K2, C1 |
| `organizations.spec.ts` | Add, search, sort, edit and delete an organization, each checked after a reload. Deleting asks first, gives counts, and leaves its contacts and deals in place with no organization. The organization page lists its contacts and deals, and its "Add" buttons pre-fill it. | R6 to R12, R15, K1, C2, C3 |
| `contacts.spec.ts` | Add a lead, a qualified contact and a customer. Search, sort, filter by status, edit, delete. Check after a reload. The contact page shows its organization, deals and timeline. | R6 to R13, R16, K5, C2, C3 |
| `deals.spec.ts` | Add, search, sort, edit and delete a deal. The deal page shows all its fields. Changing the stage in the form changes the probability and adds a timeline entry. Expected revenue shows in the table. Late deals show "Late". | R6 to R12, R17, R22, R24, R25, C2, C3, C4 |
| `links.spec.ts` | Every linked name goes to the right record: from each table, each record page, a contact's timeline (to the deal), a pipeline card, and the dashboard's follow-ups and recent activity. | R18, C3 |
| `activities.spec.ts` | Log a note, a call and an email with a follow-up on a contact and on a deal. They appear newest first. A deal's activity shows on its main contact's timeline. Edit, delete, mark done. Check after a reload. | R19, R20, R21, C5 |
| `pipeline.spec.ts` | Drag a card to another column: stage and probability change on the deals list, totals change at once, and a timeline entry appears. Drag within a column, and higher and lower in its own column: it stays put after a reload. Keyboard drag works. Add a deal in a column: it starts there at that stage. Dragging to Won sets today's close date and leaves the deal out of the open totals. Cards show their fields and late cards show "Late". Clicking a card opens the deal. | R27 to R35, K7, C4 |
| `dashboard.spec.ts` | The figures on the page match `GET /api/dashboard`. Mark a deal won and see won this month, the win rate and the charts change. Log a follow-up and see it under follow-ups, then mark it done and see it go. The line chart, bar chart and pipeline strip are there, and the strip opens the board. The dashboard's Log activity asks for a contact or deal and logs against it. | R36 to R43, K14, K15, C5, C6, C7 |
| `problem.spec.ts` | From the dashboard, in a few clicks, reach: the list of companies; the contacts at one company; the pipeline and its value; the last thing that happened with one customer; what needs doing next. | R44, C9 |
| `persistence.spec.ts` | Changes survive a server restart. `npm run seed` brings back the sample data. | R3, R6, C2 |

#### Checks by eye (phase 7)

- Dashboard and pipeline screenshots compared with `docs/mockups/mockup-2-command.png`, and every screen checked against the brand skill. (C7)
- Contrast of text on the stage colors and the darkened shades. (K3, C7)
- The app opened from a `--scale` database, checked for lag. (R14)
- The app used with the network off. (R5)
- The agent's full walkthrough in a real browser with the console open, then the project owner's walkthrough and sign-off. (C8, C9, R44)

#### The traceability check (`scripts/check-trace.mjs`)

A small Node script with no dependencies. `npm test` runs it first, as `test:trace`.

1. It reads every ID from the source documents:
   - R1 to R49 from the `- R<n>.` lines in `docs/spec.md`
   - K1 to K15 from the numbered list under "Concerns" in `docs/spec.md`
   - C1 to C9 from the numbered list under "Success criteria" in `docs/intent.md`
2. It reads the Traceability table below. It fails if any ID has no row, a row has no phase, or a row has neither a test nor a check by eye. Only C7, C8, C9, R5, R14 and R44 may have a check by eye, and all but C8 need a test as well.
3. It fails if the table names a test file that isn't listed under Proof, or an ID that isn't in the spec or the intent.
4. With `--strict`, it also opens the test files. It fails if a listed file doesn't exist, or if an ID's listed tests don't include at least one test title tagged with that ID (such as `[R30]`). Before phase 7, only the files of finished phases are checked. From phase 7 on, `test:trace` always runs with `--strict`.

So if the spec gains an ID, or a test stops naming one, `npm test` fails until the plan and the tests catch up.

## Traceability

P0 to P7 are the phases. "Eye" means a phase 7 check by eye.

### Requirements

| ID | Requirement | Phases | Tests |
|---|---|---|---|
| R1 | `npm run dev` starts both servers, lands on the dashboard | P0 | `start.spec` |
| R2 | New database created and seeded on start | P1 | `test_startup` |
| R3 | `npm run seed` resets, even while running | P1 | `test_seed`, `persistence.spec` |
| R4 | `npm test` runs everything on its own database | P0 | `test_settings` |
| R5 | Works offline, fonts included | P0, P7 | `start.spec`; Eye |
| R6 | Every change saved straight away | P2, P4 | `persistence.spec`, `organizations.spec`, `contacts.spec`, `deals.spec` |
| R7 | Each section opens on a table | P3, P4 | `DataTable.test`, `test_organizations`, `start.spec`, `organizations.spec`, `contacts.spec`, `deals.spec` |
| R8 | Search as you type | P3, P4 | `DataTable.test`, `organizations.spec`, `contacts.spec`, `deals.spec` |
| R9 | Sort by headings | P3, P4 | `DataTable.test`, `organizations.spec`, `contacts.spec`, `deals.spec` |
| R10 | Add in a side panel | P3, P4 | `*Form.test`, `organizations.spec`, `contacts.spec`, `deals.spec` |
| R11 | Edit and delete per row, row opens record | P3, P4 | `DataTable.test`, `organizations.spec`, `contacts.spec`, `deals.spec` |
| R12 | Delete asks first, with counts | P2, P3, P4 | `test_organizations`, `test_contacts`, `ConfirmDialog.test`, `organizations.spec`, `contacts.spec`, `deals.spec` |
| R13 | Contacts status filter | P4 | `ContactsPage.test`, `contacts.spec` |
| R14 | Quick at 1,000 rows | P2, P3, P7 | `test_scale`, `DataTable.scale.test`; Eye |
| R15 | Organization page | P4 | `organizations.spec` |
| R16 | Contact page | P4 | `contacts.spec` |
| R17 | Deal page | P4 | `DealPage.test`, `deals.spec` |
| R18 | Linked names are links | P3, P4 | `DataTable.test`, `DealPage.test`, `links.spec` |
| R19 | Log activity form | P2, P4 | `test_activities`, `*Form.test`, `activities.spec` |
| R20 | Timelines newest first | P2, P4 | `test_timeline`, `Timeline.test`, `activities.spec` |
| R21 | Edit, delete, mark done | P2, P4 | `test_activities`, `Timeline.test`, `activities.spec` |
| R22 | Stage-change entries | P2, P4 | `test_stage_change`, `test_timeline`, `Timeline.test`, `deals.spec` |
| R23 | Stage probabilities | P1, P2 | `test_deals`, `test_pipeline`, `*Form.test` |
| R24 | Probability follows stage, hand-set kept | P2, P4 | `test_deals`, `test_stage_change`, `*Form.test`, `deals.spec` |
| R25 | Expected revenue, open stages | P2 | `test_deals`, `deals.spec` |
| R26 | Money format | P3 | `format.test` |
| R27 | Six columns with counts and totals | P2, P5 | `test_pipeline`, `board.test`, `pipeline.spec` |
| R28 | Open totals leave out Won and Lost | P2, P5 | `test_pipeline`, `board.test`, `pipeline.spec` |
| R29 | Card contents | P5 | `Card.test`, `pipeline.spec` |
| R30 | Drop anywhere, stays after reload | P2, P5 | `test_positions`, `pipeline.spec` |
| R31 | Column drop changes stage, probability, close date | P2, P5 | `test_stage_change`, `pipeline.spec` |
| R32 | Instant totals, rollback on error | P5 | `board.test`, `pipeline.spec` |
| R33 | Add deal in a column | P2, P5 | `test_deals`, `test_positions`, `pipeline.spec` |
| R34 | Card opens the deal | P5 | `pipeline.spec` |
| R35 | Keyboard dragging | P5 | `pipeline.spec` |
| R36 | Summary figures | P2, P6 | `test_dashboard`, `dashboard/*.test`, `dashboard.spec` |
| R37 | Revenue won line chart | P2, P6 | `test_dashboard`, `dashboard/*.test`, `dashboard.spec` |
| R38 | Won and lost bar chart | P2, P6 | `test_dashboard`, `dashboard/*.test`, `dashboard.spec` |
| R39 | Pipeline strip | P2, P6 | `test_dashboard`, `dashboard/*.test`, `dashboard.spec` |
| R40 | Sales funnel | P1, P2, P6 | `test_seed`, `test_dashboard`, `dashboard/*.test`, `dashboard.spec` |
| R41 | Follow-ups list | P2, P6 | `test_dashboard`, `dashboard/*.test`, `dashboard.spec` |
| R42 | Recent activity | P2, P6 | `test_dashboard`, `dashboard/*.test`, `dashboard.spec` |
| R43 | Figures worked out on each load | P2 | `test_dashboard`, `dashboard.spec` |
| R44 | Five questions from the dashboard | P6, P7 | `TopBar.test`, `problem.spec`; Eye |
| R45 | Fixed seed, relative dates | P1 | `test_seed` |
| R46 | About 25 organizations | P1 | `test_seed` |
| R47 | About 120 contacts | P1 | `test_seed` |
| R48 | About 80 deals | P1 | `test_seed` |
| R49 | About 300 activities and follow-ups | P1 | `test_seed` |

### Concerns (the spec's Concerns 1 to 15)

| ID | Concern | Phases | Tests |
|---|---|---|---|
| K1 | Deleting contacts and deals | P2, P4 | `test_db`, `test_organizations`, `test_contacts`, `test_deals`, `ConfirmDialog.test`, `organizations.spec` |
| K2 | Bundled fonts | P0 | `start.spec` |
| K3 | Six stage colors | P0, P3 | `stages.test`, `tokens.test` |
| K4 | Funnel from stage history | P1, P2 | `test_seed`, `test_dashboard` |
| K5 | "Qualified" labels | P4 | `ContactsPage.test`, `contacts.spec` |
| K6 | Deal activities follow the main contact | P2 | `test_timeline` |
| K7 | Close date on Won or Lost | P2 | `test_stage_change`, `pipeline.spec` |
| K8 | Sample dates relative to today | P1 | `test_seed` |
| K9 | "Today" is local | P1 | `test_clock`, `test_dashboard` |
| K10 | Stage-change entries locked | P2, P4 | `test_activities`, `Timeline.test` |
| K11 | Contact picker order | P4 | `*Form.test` |
| K12 | Colors in one place | P0 | `tokens.test` |
| K13 | No global search | P3 | `TopBar.test` |
| K14 | Dashboard Log activity | P4, P6 | `*Form.test`, `dashboard.spec` |
| K15 | Pipeline strip | P6 | `dashboard/*.test`, `dashboard.spec` |

### Success criteria (intent)

| ID | Criterion | Phases | Tests |
|---|---|---|---|
| C1 | One command, lands on the dashboard with data | P0, P1, P7 | `test_startup`, `start.spec` |
| C2 | Add, search, sort, edit, delete, persist, reset | P1, P2, P4 | `test_organizations`, `test_contacts`, `test_deals`, `organizations.spec`, `contacts.spec`, `deals.spec`, `persistence.spec` |
| C3 | Status filter, linked records | P4 | `organizations.spec`, `contacts.spec`, `deals.spec`, `links.spec` |
| C4 | Pipeline drag, totals, add, late | P2, P5 | `test_positions`, `test_pipeline`, `deals.spec`, `pipeline.spec` |
| C5 | Activities, timelines, follow-ups | P2, P4, P6 | `test_activities`, `test_timeline`, `activities.spec`, `dashboard.spec` |
| C6 | Dashboard figures match the data | P2, P6 | `test_dashboard`, `dashboard.spec` |
| C7 | Sharp, on-brand, stunning dashboard | P6, P7 | `dashboard.spec`; Eye |
| C8 | Walkthrough by the agent, then the owner's sign-off | P7 | Eye only |
| C9 | The problem's five questions | P6, P7 | `problem.spec`; Eye |
