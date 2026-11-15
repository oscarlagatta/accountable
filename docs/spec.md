# Spec: the Accountable MVP

This is the spec for the MVP described in `docs/intent.md`. It covers what the app does in detail and how it's built and designed. The stack is in `docs/TECH_STACK.md` and the look is from the brand skill (`.claude/skills/brand`).

## Concerns

These are gaps or tensions found while writing the spec. Each one has a proposed answer, and the spec follows it. Change any of them before Build if they're wrong.

1. **Deleting a contact or a deal isn't covered by the intent.** It only covers organizations. Proposed:
   - Deleting a contact keeps its deals and leaves them with no main contact. It deletes the activities logged on the contact.
   - Deleting a deal deletes its activities and its stage-change entries.
   - The confirm dialog gives the counts, for example "2 deals will have no main contact. 5 activities will be deleted."
2. **The fonts need the internet if they come from Google Fonts.** That breaks "needs no internet connection to use". Proposed: install the three fonts as npm packages (`@fontsource-variable/instrument-sans`, `@fontsource/instrument-serif`, `@fontsource-variable/jetbrains-mono`) and bundle them with the app. They're the same Google Fonts files.
3. **The pipeline has six stages, but the brand has five colors.** Raspberry is also the obvious color for "late" and "overdue". Proposed:
   - The four open stages use the brand order: New Sea Green, Qualified Marigold, Proposal Coral, Negotiation Cerulean.
   - Won is Midnight and Lost is a muted slate (`#8AA1A9`).
   - Raspberry is kept for things that need attention: late deals, overdue follow-ups and delete buttons.
4. **The sales funnel needs to know how far each deal got.** A lost deal sits in Lost, so its current stage doesn't say where it dropped out. Proposed:
   - The funnel counts a deal at every stage it has reached, using its stage-change entries.
   - The sample data includes stage history for every deal, so lost deals drop out at realistic stages.
   - A deal created straight into a later stage counts as having reached the stages before it.
5. **The word "qualified" means two things.** It's a contact status and a deal stage. Both are in the intent, so the spec keeps both. Labels always say which one they mean: "Status: Qualified" on contacts, and the stage column or "Stage: Qualified" on deals.
6. **A deal's activities follow its current main contact.** If a deal's main contact changes, the deal's activities move to the new contact's timeline. They're shown by looking up the deal's contact when the timeline is read, rather than being copied to the contact. That seems right, but it means a contact's timeline can change when a deal is edited.
7. **The close date when a deal is won or lost.** The intent says "expected or actual close date" but not when one becomes the other. Proposed:
   - Moving a deal to Won or Lost sets its close date to today, unless that move happens in the edit form, where the date entered is kept.
   - Moving it back to an open stage keeps the date and leaves it for the user to edit.
   - "Revenue won by month" uses the close date of won deals.
8. **The sample data is dated relative to the day it's created.** That way there are always follow-ups due soon and deals running late. If the app sits unused for months, the data goes stale. `npm run seed` brings it back to life. Data the user enters is never shifted.
9. **"Today" is the computer's local date.** Overdue, late and "last 12 months" use the date on the computer the app runs on. That's correct for one person on one machine. It will need revisiting when the app is hosted (Render runs on UTC).
10. **Stage-change entries.** They appear in timelines and recent activity like activities. Proposed: they can't be edited or deleted by hand, since they're a record of what happened, and they go when their deal is deleted.
11. **A deal's main contact can belong to a different organization than the deal, or to none.** The intent makes both optional and doesn't link them. Proposed:
   - The contact picker in the deal form lists the deal's organization's contacts first, then everyone else.
   - The form doesn't block a mismatch.
12. **Light mode only, but dark mode is likely next.** The colors are defined as CSS variables in one place, so dark mode can be added later without touching every component. Only the light values are filled in.

## Requirements

Numbers in brackets, such as [C2], point to the intent's success criteria.

### Running it

- R1. `npm run dev` starts the backend on `http://localhost:8000` and the frontend on `http://localhost:5173`, and prints the address to open. Opening it lands on the dashboard. [C1]
- R2. If the database file doesn't exist, the backend creates it and fills it with sample data on start. [C1]
- R3. `npm run seed` deletes the data and fills the database with fresh sample data. It works whether or not the app is running. [C2]
- R4. `npm test` runs the frontend, backend and end-to-end tests, and fails if any fail. The tests use their own database file and never touch the real one.
- R5. Everything works with no internet connection once dependencies are installed, including fonts.
- R6. Every change is saved in the database as soon as it's made. Nothing is kept only in the browser. [C2]

### Tables (Organizations, Contacts, Deals)

- R7. Each section opens on a table of all its records. [C2]
- R8. A search box filters the table as you type, matching any text column, case-insensitive. [C2]
- R9. Clicking a column heading sorts by it. Clicking again reverses the order. An arrow shows the current sort. The default sort is the name, A to Z. [C2]
- R10. An "Add" button opens a form in a side panel. Saving adds the record and shows it in the table. [C2]
- R11. Each row has edit and delete actions. Clicking the row itself opens the record's page. [C2, C3]
- R12. Delete asks first, in a dialog that names the record and says what happens to linked records, with counts (see Concerns 1). [C2]
- R13. The Contacts table has a status filter with All, Lead, Qualified and Customer, which works together with the search. [C3]
- R14. The tables stay quick with 1,000 rows. All rows are loaded at once and searched and sorted in the browser, with no pagination.

Table columns:

| Table | Columns |
|---|---|
| Organizations | Name, Industry, Website, Contacts (count), Open deals (count), Open value |
| Contacts | Name, Organization, Job title, Email, Phone, Status |
| Deals | Name, Organization, Main contact, Stage, Value, Probability, Expected revenue, Close date |

In the Deals table, a late deal's close date is shown in Raspberry with a "Late" label. A deal is late when it's in an open stage and its close date is before today. [Intent: Deals]

### Record pages

- R15. **Organization page**: its details and notes, with edit and delete. It has a contacts list and a deals list, each with an "Add" that pre-fills the organization. [C3]
- R16. **Contact page**: details, status and organization (linked), with edit and delete. It lists the contact's deals as main contact, and has a timeline. [C3]
- R17. **Deal page**: details (stage, value, probability, expected revenue, close date, organization and main contact, both linked), with edit and delete, and a timeline. [C3]
- R18. Every linked record name is a link to that record's page. [C3]

### Activities and timelines

- R19. Contact and deal pages have a "Log activity" form with these fields: [C5]
  - type: note, call or email
  - description
  - when it happened (defaults to now)
  - an optional follow-up date
- R20. A timeline lists entries newest first, by when they happened. [C5]
  - A contact's timeline shows its own activities and the activities of deals where it's the main contact. Those carry a link to the deal.
  - A deal's timeline shows its own activities and stage changes.
- R21. Each activity in a timeline can be edited and deleted (delete asks first). An activity with a follow-up shows its date and a "Mark done" control. [C5]
- R22. Changing a deal's stage creates an entry such as "Moved from Proposal to Negotiation". This happens whether the stage was changed by dragging or in the edit form. Adding a new deal into a column isn't a change, so it creates no entry. The entry appears in the deal's timeline, its main contact's timeline and the dashboard's recent activity. [C5]

### Deals, stages and probability

- R23. The stage probabilities are New 5%, Qualified 20%, Proposal 40%, Negotiation 70%, Won 100% and Lost 0%. A new deal gets its stage's probability. [C4]
- R24. When the stage changes, the probability becomes the new stage's, even if it was set by hand. A probability set by hand (0 to 100, whole numbers) is kept until the stage next changes. [C4]
- R25. Expected revenue for a deal is its value times its probability. Open means any stage except Won and Lost. [Intent]
- R26. Values are whole US dollars, from $0 up, shown as `$45,000`. On the dashboard, large figures can be shortened, as in `$1.2M`. The currency always shows. [Brand]

### Pipeline board

- R27. Six columns in order: New, Qualified, Proposal, Negotiation, Won, Lost. Each column shows its deal count, total value and expected revenue. [C4]
- R28. The board's header shows the open deals' total value and expected revenue. Won and Lost are left out. [C4]
- R29. Each card shows:
  - the deal name, organization, value and close date
  - the main contact's name
  - a "Late" label in Raspberry when the deal is late
  [C4]
- R30. A card can be dragged to any position in any column, including within its own. It stays exactly where it was dropped, after a refresh and a restart. [C4]
- R31. Dropping a card in another column changes the deal's stage and probability (R24), and adds a stage-change entry (R22). Moving to Won or Lost closes the deal and sets its close date (Concerns 7). [C4]
- R32. Totals change the moment a card is dropped, before the server answers. If the server fails, the card goes back and a message says the move wasn't saved. [C4]
- R33. Each column has an "Add deal" button. The new deal starts in that column at that stage's probability and goes to the top of the column. [C4]
- R34. Clicking a card opens the deal's page.
- R35. Dragging also works with the keyboard: Space to pick up, arrows to move, Space to drop.

### Dashboard

- R36. **Summary figures** across the top: [C6, C7]
  - open pipeline value
  - expected revenue
  - won this month
  - win rate over the last 12 months (won ÷ (won + lost), by count)
  - open follow-ups, with how many are overdue
- R37. **Revenue won by month**: a line chart of the value of deals won, for each of the last 12 months including this one. [C7]
- R38. **Deals won and lost by month**: a bar chart with the count won and the count lost for each of the last 12 months. [C7]
- R39. **Pipeline by stage**: a horizontal bar for each open stage, with its value and expected revenue, in the stage colors. Clicking a stage opens the pipeline board. [C7]
- R40. **Sales funnel**: for each stage from New to Won, the value of deals that reached it, with the share that carried on from the stage before (Concerns 4). [Intent]
- R41. **Follow-ups**: open follow-ups, overdue first (in Raspberry), then due today, then upcoming, soonest first. Each shows the activity, the contact or deal it's on (linked) and a "Mark done" control. Marked done, it leaves the list. [C5, C6]
- R42. **Recent activity**: the 10 latest activities and stage changes across everything, each linked to its contact or deal. [Intent]
- R43. All figures are worked out from the database each time the dashboard opens, so they always match the data. [C6]
- R44. With the sample data, the problem's five questions can each be answered from the dashboard in a few clicks. The sidebar has every section, and the dashboard links to records and the board. [C9]

### Sample data

- R45. Generated from a fixed random seed, so every reset gives the same data, with dates relative to today. The business is a small B2B services and software company.
- R46. Roughly 25 organizations across 6 to 8 industries, such as Healthcare, Logistics, Retail, Financial services, Manufacturing, Education and Hospitality. Names are made up and plausible, with no real companies.
- R47. Roughly 120 contacts, spread across all three statuses, mostly at organizations, with a few that have no organization.
- R48. Roughly 80 deals from $5,000 to $150,000:
  - won and lost spread over the past 12 months
  - open deals spread over the four open stages, with close dates over the next few months
  - 4 to 6 open deals running late
  - a couple with no organization
- R49. Roughly 300 activities over the past 12 months, with stage-change entries for every deal's history. About 10 open follow-ups are due in the next two weeks and 4 to 6 are overdue.

### Out of scope

As listed in the intent: sign-in, several users, dark mode, phone layout, AI, integrations, other currencies, reports beyond the dashboard, tags, custom fields, editable stages, import and export.

## Design: how it's built

### Layout of the repo

```
package.json            npm workspaces (frontend, e2e) and the root scripts
pyproject.toml, uv.lock the backend's Python project
backend/
  app/
    main.py             FastAPI app, routers, start-up (create + seed if new)
    db.py               engine, metadata, tables (SQLAlchemy Core)
    settings.py         database path from ACCOUNTABLE_DB, default backend/data/accountable.db
    stages.py           stage list, order, default probabilities
    routers/            organizations, contacts, deals, activities, pipeline, dashboard
    services/           the rules: stage changes, deletes, positions, dashboard figures
    seed.py             sample data generator; also run by `npm run seed`
  tests/                pytest, each test on a fresh temporary database
  data/                 the SQLite file (git-ignored)
frontend/
  src/
    api/                typed API client and TanStack Query hooks
    components/ui/      shadcn/ui components (generated by the shadcn CLI, then themed)
    components/         app components built on them: DataTable, RecordSheet, ConfirmDialog, Timeline, StageBadge, Money
    pages/              Dashboard, Organizations, Organization, Contacts, Contact, Deals, Deal, Pipeline
    index.css           Tailwind, the brand tokens as shadcn theme variables, font imports
    lib/                money and date formatting, stage colors
  vitest tests next to the files they test
e2e/
  playwright.config.ts  starts backend and frontend on test ports with a test database
  tests/
```

### Root scripts

| Script | Does |
|---|---|
| `npm run dev` | Runs `uv run uvicorn backend.app.main:app --reload --port 8000` and `vite` together, with `concurrently` |
| `npm run seed` | `uv run python -m backend.app.seed` |
| `npm test` | `uv run pytest`, then `vitest run` in `frontend`, then `playwright test` in `e2e` |

Vite proxies `/api` to the backend, so the browser only talks to one address.

### Libraries

| Need | Library |
|---|---|
| Routing | React Router |
| Server data and caching | TanStack Query |
| Tables | TanStack Table |
| Styling | Tailwind CSS |
| Charts | shadcn/ui Chart (built on Recharts) |
| Drag and drop | dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`) |
| Dialogs, menus, side panel, select | shadcn/ui (Dialog, AlertDialog, DropdownMenu, Sheet, Select) |
| Forms and validation | shadcn/ui Form (built on React Hook Form and Zod) |
| Icons | Lucide |
| Dates | date-fns |
| Toasts | shadcn/ui Sonner |
| Backend | FastAPI, Pydantic, SQLAlchemy Core, Uvicorn |
| Running two processes | concurrently |
| Sample data | Faker (seeded) for people's names, plus hand-written lists for companies and deal names |

### Data model

All tables have `id` (integer primary key), `created_at` and `updated_at`. Foreign keys are on (`PRAGMA foreign_keys=ON`). Dates are ISO strings (`YYYY-MM-DD`) and times are ISO date-times in local time.

**organizations**: `name` (required), `website`, `industry`, `notes`

**contacts**:
- `first_name`, `last_name` (both required)
- `email`, `phone`, `job_title`
- `organization_id` (nullable, `ON DELETE SET NULL`)
- `status` (`lead` | `qualified` | `customer`, required)

**deals**:
- `name` (required)
- `organization_id` (nullable, `ON DELETE SET NULL`)
- `contact_id`, the main contact (nullable, `ON DELETE SET NULL`)
- `stage` (`new` | `qualified` | `proposal` | `negotiation` | `won` | `lost`)
- `value` (integer dollars, ≥ 0)
- `probability` (integer 0 to 100)
- `close_date` (required)
- `position` (integer, the order within its stage column)

**activities**:
- `kind` (`note` | `call` | `email` | `stage_change`)
- exactly one of `contact_id` or `deal_id` (`ON DELETE CASCADE`), enforced by a check constraint
- `description`, plus `from_stage` and `to_stage` for stage changes
- `occurred_at`
- `follow_up_date` (nullable)
- `done` (boolean, default false)

Indexes are on every foreign key, on `deals(stage, position)` and on `activities(follow_up_date, done)`.

### Rules in the backend

All rules live in `services/`, so they're tested once in pytest and the frontend can't skip them.

- **Stage change** (`services/deals.py`): in one transaction it
  - sets the stage and the default probability
  - sets the close date to today when moving to Won or Lost, except from the edit form with a date given
  - inserts a `stage_change` activity
  - moves the deal to its new position
- **Positions**: moving a deal to index *i* in a column renumbers that column's deals 0..n in one transaction. Columns are at most a few hundred deals, so this is cheap and simple. A new deal goes to position 0 of its column.
- **Delete previews**: `GET /api/{kind}/{id}/delete-preview` returns the counts that the confirm dialog shows.
- **Validation**: Pydantic models reject bad input with a 422 and a plain message per field. The forms show the message next to the field.

### API

All under `/api`. JSON in and out.

| Method and path | Purpose |
|---|---|
| `GET/POST /organizations`, `GET/PATCH/DELETE /organizations/{id}` | Organizations. The list includes counts and open value. |
| `GET/POST /contacts`, `GET/PATCH/DELETE /contacts/{id}` | Contacts. The list includes the organization name. |
| `GET/POST /deals`, `GET/PATCH/DELETE /deals/{id}` | Deals. The list includes the organization and contact names, expected revenue and `late`. |
| `POST /deals/{id}/move` `{stage, index}` | Drag on the board |
| `GET /{organizations,contacts,deals}/{id}/delete-preview` | Counts for the confirm dialog |
| `GET /contacts/{id}/timeline`, `GET /deals/{id}/timeline` | Timeline entries, newest first |
| `POST /activities`, `PATCH/DELETE /activities/{id}` | Activities. Stage-change entries refuse PATCH and DELETE. |
| `GET /pipeline` | Columns with their deals in order and the totals |
| `GET /dashboard` | Everything the dashboard shows, in one call |

The frontend refetches the affected queries after each change (TanStack Query invalidation). The board updates its cache before the server answers, and rolls back on error (R32).

### Tests

- **pytest**: every rule above, including:
  - stage-change side effects
  - position renumbering
  - each delete's effect on linked records
  - dashboard figures checked against a small hand-made dataset
  - the seed's spread (late deals exist, overdue follow-ups exist, every stage has deals)
- **Vitest**: money and date formatting, stage colors, the table's search and sort, the timeline's order and the forms' validation.
- **Playwright**: one test per success criterion where it can be automated, on a freshly seeded test database:
  - add, search, sort, edit and delete on each table, and check after a reload
  - drag between and within columns, and check after a reload
  - log a follow-up and see it on the dashboard
  - mark a deal won and see the dashboard change
  - no console errors on any page

## Design: how it looks

Everything follows the brand skill. The look is calm and businesslike: mostly white panels on a pale page, Midnight text, and color used for meaning (stages, money, alerts), not decoration.

### Tokens

Defined once in `frontend/src/index.css` as CSS variables. Tailwind's `@theme` exposes them as utilities (`bg-page`, `text-ink`, `bg-stage-new` and so on). shadcn's own theme variables are pointed at the brand: `--background` is `--page`, `--card` and `--popover` are `--panel`, `--foreground` is `--ink`, `--primary` is Sea Green with Midnight text, `--destructive` is Raspberry, `--ring` is Cerulean, `--radius` is 12px, and `--chart-1` to `--chart-5` follow the brand's series order. shadcn's default outlines on cards and inputs are removed from cards and kept only where a field needs one to be seen. The tokens:

| Token | Value | Use |
|---|---|---|
| `--page` | `#F0F4F5` | Page background |
| `--panel` | `#FFFFFF` | Panels, cards, tables |
| `--ink` | `#073B4C` | Text |
| `--ink-muted` | `#073B4C` at 65% | Secondary text, column headings |
| `--line` | `#073B4C` at 8% | Row dividers inside tables only |
| `--sea-green` | `#06D6A0` | Primary buttons (Midnight text), New |
| `--sea-green-ink` | `#047A5A`, darkened Sea Green | Sea Green used as text on light |
| `--marigold` | `#FFC145` | Qualified |
| `--marigold-ink` | `#9A6A00`, darkened Marigold | Marigold used as text on light |
| `--coral` | `#F78C6B` | Proposal |
| `--cerulean` | `#118AB2` | Negotiation, links, information |
| `--raspberry` | `#EF476F` | Late, overdue, delete |
| `--won` | `#073B4C` | Won |
| `--lost` | `#8AA1A9` | Lost |

The darkened text shades are checked for 4.5:1 contrast on white during Build.

### Type

- Instrument Sans for everything: 14px body, 13px table cells, 600 weight for headings.
- JetBrains Mono for money, percentages, dates and counts, with tabular figures, so columns of numbers line up.
- Instrument Serif in one place only: the greeting line on the dashboard (for example "Good morning. Here's where sales stand.").
- All fonts are bundled (Concerns 2).

### Shapes

- Panels and cards: white, 12px radius, no outline, a very soft shadow (`0 1px 2px` at low opacity) to lift them off the page.
- No borders on one edge, no rules across the top of the page, and no gradient fills (brand, and the user's preferences).
- Buttons: 8px radius. Primary is Sea Green with Midnight text. Secondary is white with Midnight text. Destructive is Raspberry with white text.
- Stage badges: a small pill in the stage color, Midnight text (white on Won, Cerulean and Raspberry).

### App frame

- A left sidebar, 232px, white, with the Accountable wordmark at the top and links to Dashboard, Organizations, Contacts, Deals and Pipeline, each with a Lucide icon. The current page has a pale Sea Green pill behind it.
- The main area has a page title and the page's main action ("Add contact") on the right, then the content. It's at most 1440px wide and designed for 1280px and up.

### Dashboard

- A greeting line in Instrument Serif, then five summary tiles in a row (R36). Each tile has a small label, a large mono figure and a short note underneath, such as "12 deals" or "4 overdue" in Raspberry.
- Second row: the revenue-won line chart, two-thirds wide, and pipeline by stage, one-third.
- Third row: the won-and-lost bar chart and the sales funnel, half each.
- Fourth row: follow-ups and recent activity, half each.
- Charts: no gridline clutter, light horizontal guides only, values in JetBrains Mono, a tooltip on hover with the exact figure in dollars. The line is Sea Green with a soft area fill (a single flat tint, not a gradient). In the bar chart, Won is Sea Green and Lost is slate.
- The funnel is horizontal bars narrowing from New to Won, in the stage colors. Each bar has its value, and the conversion percentage sits between bars.

### Tables

- A white panel holding a toolbar (search box, filters, the "Add" button) and the table.
- Rows are 44px with hairline dividers and a pale hover background. Numbers are right-aligned in mono.
- Row actions (edit, delete) show as icon buttons on hover and are always reachable by keyboard.
- Empty search results say "No contacts match "acme"" with a button to clear the search.

### Forms and dialogs

- Add and edit open in a 440px side panel from the right, so the table stays in view.
- Labels sit above the fields, and errors show in Raspberry under the field.
- Delete confirms in a centered dialog: "Delete Northwind Logistics?", then the linked-record counts, then Cancel and a Raspberry "Delete" button.
- After saving or deleting, a short toast appears, for example "Contact added".

### Record pages

- A header panel with the name, a status or stage badge, key figures in mono (for a deal: value, probability, expected revenue and close date) and edit and delete buttons.
- Underneath are two columns. On the left are the details and linked records. On the right are the "Log activity" form and the timeline.
- The timeline is a vertical list with a small icon per kind:
  - note, call and email each have their own icon
  - stage changes use an arrow in the new stage's color
  - each entry shows the date, its description and, on a contact's timeline, a link to the deal it came from
  - follow-ups show a date chip, Raspberry when overdue, with "Mark done"

### Pipeline board

- Six columns side by side, each a pale tint of its stage color with white cards. The board scrolls sideways if the window is narrow.
- The column header has the stage name, the count, the total value and the expected revenue in mono, and an "Add deal" button.
- The board header shows the open total and the open expected revenue.
- Cards: white, 10px radius, soft shadow. They show the deal name in 600 weight, the organization, the value in mono, the main contact, and the close date. A late card shows "Late" in a Raspberry pill.
- While dragging, the card tilts slightly and lifts, and a gap opens where it will land. Totals update on drop.

### Words

Plain and short, with no exclamation marks.
- Buttons: "Add deal", "Log activity", "Mark done", "Delete".
- Empty states say what to do: "No activities yet. Log a call, email or note above."
- Money always shows the dollar sign.
