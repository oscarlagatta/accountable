# Spec: Accountable

This spec describes Accountable as it stands today: what it does, how it's built and how it looks. It is the authority on the product. A change is planned in its own folder under `docs/changes/`, and once it's built, this spec is updated to describe the product with the change in it.

The stack is in `docs/TECH_STACK.md` and the look is from the brand skill (`.claude/skills/brand`). The design follows mockup 2, Command: `docs/mockups/mockup-2-command.html`, with its screenshot `docs/mockups/mockup-2-command.png`. Where the mockup and this spec differ, this spec wins.

## Problem

A small business keeps track of its customers and sales in spreadsheets, inboxes and people's heads. Nobody can see at a glance which companies we deal with, who our contacts are, what's in the sales pipeline, what happened last with a customer or what needs doing next.

## The product

Accountable is a business management system: a sales CRM that will grow into a full Business OS, including ERP. Today it's a complete sales CRM for one person, running on their own computer: a private Salesforce that does the everyday CRM essentials well, and feels sharp, modern and professional.

It has five sections: the Dashboard (the landing page), Organizations, Contacts, Deals and the Pipeline board. It keeps four kinds of record:

- **Organization**: a company we do business with. It has many contacts and many deals; contacts and deals don't have to belong to one.
- **Contact**: a person we deal with, with a status of lead, qualified or customer. A lead is a contact with the lead status, so there's no separate list of leads. The status changes only when someone edits it, not when a deal is won.
- **Deal**: a potential sale, with its organization, main contact, stage, value in US dollars, probability of close and expected or actual close date.
- **Activity**: a note, call or email logged on a contact or a deal, optionally with a follow-up date that shows on the dashboard as a task until it's marked done. Stage changes are recorded as activities too.

### Who uses it

- One salesperson, using it on their own computer every day. The rest of the sales team joins later.
- It's a learning project built through a course, so the sample data is the main data. Real use is a bonus.
- No other systems are involved.

### Limits

- It handles one salesperson's book and stays quick with it: up to about 1,000 contacts, 500 deals and 5,000 activities.
- It runs locally with one command on Mac, Linux and Windows, and needs no internet connection to use.
- Every change is kept, through a browser refresh and a restart.
- Light mode only, designed for a laptop or desktop screen.

## Concerns

Decisions on points that weren't obvious when the product was first specified, with the reason for each. Code and tests refer to them by number, such as Concerns 4, so the numbers stay fixed.

1. **Deleting a contact or a deal.**
   - Deleting a contact keeps its deals and leaves them with no main contact. It deletes the activities logged on the contact.
   - Deleting a deal deletes its activities and its stage-change entries.
   - Deleting an organization keeps its contacts and deals and leaves them with no organization.
   - The confirm dialog gives the counts, for example "2 deals will have no main contact. 5 activities will be deleted."
2. **Fonts are bundled.** Loading them from Google Fonts would need the internet, so the three fonts are npm packages (`@fontsource-variable/instrument-sans`, `@fontsource/instrument-serif`, `@fontsource-variable/jetbrains-mono`), the same files bundled with the app.
3. **Stage colors.** The pipeline has six stages and the brand has five colors, and Raspberry is the obvious color for "late" and "overdue".
   - The four open stages use the brand order: New Sea Green, Qualified Marigold, Proposal Coral, Negotiation Cerulean.
   - Won is Midnight and Lost is a muted slate (`#8AA1A9`).
   - Raspberry is kept for things that need attention: late deals, overdue follow-ups and delete buttons.
4. **The sales funnel uses stage history.** A lost deal sits in Lost, so its current stage doesn't say where it dropped out.
   - The funnel counts a deal at every stage it has reached, using its stage-change entries.
   - The sample data includes stage history for every deal, so lost deals drop out at realistic stages.
   - A deal created straight into a later stage counts as having reached the stages before it.
5. **"Qualified" means two things**: a contact status and a deal stage. Labels always say which: "Status: Qualified" on contacts, and the stage column or "Stage: Qualified" on deals.
6. **A deal's activities follow its current main contact.** They're shown in a contact's timeline by looking up the deal's contact when the timeline is read, rather than being copied to the contact. So a contact's timeline changes when a deal's main contact is changed.
7. **The close date when a deal is won or lost.**
   - Moving a deal to Won or Lost sets its close date to today, unless that move happens in the edit form, where the date entered is kept.
   - Moving it back to an open stage keeps the date and leaves it for the user to edit.
   - "Revenue won by month" uses the close date of won deals.
8. **The sample data is dated relative to the day it's created**, so there are always follow-ups due soon and deals running late. If the app sits unused for months, the data goes stale, and `npm run seed` brings it back to life. Data the user enters is never shifted.
9. **"Today" is the computer's local date.** Overdue, late and "last 12 months" use the date on the computer the app runs on. That's right for one person on one machine, and will need revisiting if the app is hosted (Render runs on UTC).
10. **Stage-change entries are locked.** They appear in timelines and recent activity like activities, but can't be edited or deleted by hand, since they're a record of what happened. They go when their deal is deleted.
11. **A deal's main contact can belong to a different organization than the deal, or to none.**
   - The contact picker in the deal form lists the deal's organization's contacts first, then everyone else.
   - The form doesn't block a mismatch.
12. **Colors are CSS variables in one place**, so dark mode can be added without touching every component. Only the light values are filled in.
13. **No "Search everything" box.** The mockup has one in the top bar, but search is per table. The top bar's right-hand side is empty.
14. **"Log activity" on the dashboard.** Activities belong to a contact or a deal, so the dashboard's form starts with a picker for one of them.
15. **The dashboard's pipeline visual is one strip**, as in the mockup, in place of a bar per stage. Each segment's width is its stage's open value, and under it each stage has its name, count, value and expected revenue. Clicking a segment or its figures opens the pipeline board.

## Requirements

### Running it

- R1. `npm run dev` starts the backend on `http://localhost:8000` and the frontend on `http://localhost:5173`, and prints the address to open. Opening it lands on the dashboard.
- R2. If the database file doesn't exist, the backend creates it and fills it with sample data on start.
- R3. `npm run seed` deletes the data and fills the database with fresh sample data. It works whether or not the app is running.
- R4. `npm test` runs the frontend, backend and end-to-end tests, and fails if any fail. The tests use their own database file and never touch the real one.
- R5. Everything works with no internet connection once dependencies are installed, including fonts.
- R6. Every change is saved in the database as soon as it's made. Nothing is kept only in the browser.

### Tables (Organizations, Contacts, Deals)

- R7. Each section opens on a table of all its records.
- R8. A search box filters the table as you type, matching any text column, case-insensitive.
- R9. Clicking a column heading sorts by it. Clicking again reverses the order. An arrow shows the current sort. The default sort is the name, A to Z.
- R10. An "Add" button opens a form in a side panel. Saving adds the record and shows it in the table.
- R11. Each row has edit and delete actions. Clicking the row itself opens the record's page.
- R12. Delete asks first, in a dialog that names the record and says what happens to linked records, with counts (see Concerns 1).
- R13. The Contacts table has a status filter with All, Lead, Qualified and Customer, which works together with the search.
- R14. The tables stay quick with 1,000 rows. All rows are loaded at once and searched and sorted in the browser, with no pagination.

Table columns:

| Table | Columns |
|---|---|
| Organizations | Name, Industry, Website, Contacts (count), Open deals (count), Open value |
| Contacts | Name, Organization, Job title, Email, Phone, Status |
| Deals | Name, Organization, Main contact, Stage, Value, Probability, Expected revenue, Close date |

In the Deals table, a late deal's close date is shown in Raspberry with a "Late" label. A deal is late when it's in an open stage and its close date is before today.

### Record pages

- R15. **Organization page**: its details and notes, with edit and delete. It has a contacts list and a deals list, each with an "Add" that pre-fills the organization.
- R16. **Contact page**: details, status and organization (linked), with edit and delete. It lists the contact's deals as main contact, and has a timeline.
- R17. **Deal page**: details (stage, value, probability, expected revenue, close date, organization and main contact, both linked), with edit and delete, and a timeline.
- R18. Every linked record name is a link to that record's page.

### Activities and timelines

- R19. Contact and deal pages have a "Log activity" form with these fields:
  - type: note, call or email
  - description
  - when it happened (defaults to now)
  - an optional follow-up date
- R20. A timeline lists entries newest first, by when they happened.
  - A contact's timeline shows its own activities and the activities of deals where it's the main contact. Those carry a link to the deal.
  - A deal's timeline shows its own activities and stage changes.
- R21. Each activity in a timeline can be edited and deleted (delete asks first). An activity with a follow-up shows its date and a "Mark done" control.
- R22. Changing a deal's stage creates an entry such as "Moved from Proposal to Negotiation". This happens whether the stage was changed by dragging or in the edit form. Adding a new deal into a column isn't a change, so it creates no entry. The entry appears in the deal's timeline, its main contact's timeline and the dashboard's recent activity.

### Deals, stages and probability

- R23. The stage probabilities are New 5%, Qualified 20%, Proposal 40%, Negotiation 70%, Won 100% and Lost 0%. A new deal gets its stage's probability.
- R24. When the stage changes, the probability becomes the new stage's, even if it was set by hand. A probability set by hand (0 to 100, whole numbers) is kept until the stage next changes.
- R25. Expected revenue for a deal is its value times its probability. Open means any stage except Won and Lost.
- R26. Values are whole US dollars, from $0 up, shown as `$45,000`. On the dashboard, large figures can be shortened, as in `$1.2M`. The currency always shows.

### Pipeline board

- R27. Six columns in order: New, Qualified, Proposal, Negotiation, Won, Lost. Each column shows its deal count, total value and expected revenue.
- R28. The board's header shows the open deals' total value and expected revenue. Won and Lost are left out.
- R29. Each card shows:
  - the deal name, organization, value and close date
  - the main contact's name
  - a "Late" label in Raspberry when the deal is late
 
- R30. A card can be dragged to any position in any column, including within its own. It stays exactly where it was dropped, after a refresh and a restart.
- R31. Dropping a card in another column changes the deal's stage and probability (R24), and adds a stage-change entry (R22). Moving to Won or Lost closes the deal and sets its close date (Concerns 7).
- R32. Totals change the moment a card is dropped, before the server answers. If the server fails, the card goes back and a message says the move wasn't saved.
- R33. Each column has an "Add deal" button. The new deal starts in that column at that stage's probability and goes to the top of the column.
- R34. Clicking a card opens the deal's page.
- R35. Dragging also works with the keyboard: Space to pick up, arrows to move, Space to drop.

### Dashboard

- R36. **Summary figures** across the top:
  - open pipeline value
  - expected revenue
  - won this month
  - win rate over the last 12 months (won ÷ (won + lost), by count)
  - open follow-ups, with how many are overdue
- R37. **Revenue won by month**: a line chart of the value of deals won, for each of the last 12 months including this one.
- R38. **Deals won and lost by month**: a bar chart with the count won and the count lost for each of the last 12 months.
- R39. **Pipeline by stage**: a strip split into the four open stages, each segment as wide as its share of the open value, in the stage colors. Under it, each stage shows its name, deal count, value and expected revenue. Clicking a stage opens the pipeline board (Concerns 15).
- R40. **Sales funnel**: for each stage from New to Won, the value of deals that reached it, with the share that carried on from the stage before (Concerns 4).
- R41. **Follow-ups**: open follow-ups, overdue first (in Raspberry), then due today, then upcoming, soonest first. Each shows the activity, the contact or deal it's on (linked) and a "Mark done" control. Marked done, it leaves the list.
- R42. **Recent activity**: the 10 latest activities and stage changes across everything, each linked to its contact or deal.
- R43. All figures are worked out from the database each time the dashboard opens, so they always match the data.
- R44. With the sample data, the problem's five questions can each be answered from the dashboard in a few clicks. The top bar has every section, and the dashboard links to records and the board.

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

Sign-in, several users, dark mode, phone layout, AI, integrations, other currencies, reports beyond the dashboard, tags, custom fields, editable stages, import and export.

## Design: how it's built

### Layout of the repo

The code is grouped by business area, with one shared core, so a later area (such as ERP) is a new folder beside `crm/` and `features/` gains a folder, with nothing existing moved. There are no generic base classes or repository layers: each area has plain functions, and an abstraction comes only when there's a real second case.

```
package.json              npm workspaces (frontend, e2e) and the root scripts
pyproject.toml, uv.lock   the backend's Python project
backend/
  app/
    main.py               builds the app, includes each area's router, start-up (create + seed if new)
    core/                 what every area needs
      settings.py         database path from ACCOUNTABLE_DB, default backend/data/accountable.db
      clock.py            today() and now(), the only place the clock is read
      db.py               engine, the one shared MetaData, connection helper
    crm/                  the MVP
      tables.py           the four CRM tables (linked, so kept together)
      stages.py           stage list, order, default probabilities: the one source of stage rules
      organizations/      router.py, service.py, schemas.py
      contacts/           router.py, service.py, schemas.py
      deals/              router.py, service.py, schemas.py (stage change, positions)
      activities/         router.py, service.py, schemas.py (timelines)
      pipeline.py         router and read-only queries
      dashboard.py        router and read-only queries
      seed.py             sample data generator; also run by `npm run seed`
  tests/                  pytest, mirroring core/ and crm/, each test on a fresh temporary database
  data/                   the SQLite file (git-ignored)
frontend/
  src/
    main.tsx, index.css   mount; Tailwind, brand tokens as shadcn theme variables, font imports
    app/                  App, routes, query client, toaster, TopBar
    components/ui/        shadcn/ui components (generated by the shadcn CLI, then themed)
    components/           shared: DataTable, RecordSheet, ConfirmDialog, PageHeader, Money
    lib/                  api.ts (fetch wrapper), format.ts (money, dates, percentages)
    features/
      organizations/      pages, form, api.ts (types and query hooks)
      contacts/           pages, form, StatusBadge, api.ts
      deals/              pages, form, StageBadge, stages.ts (colors only), api.ts
      activities/         Timeline, ActivityForm (log and edit), api.ts
      pipeline/           board, column, card, drag logic, api.ts
      dashboard/          page, feature panel, charts, lists, api.ts
    vitest tests next to the files they test
e2e/
  playwright.config.ts    starts backend and frontend on test ports with a test database
  tests/
```

### Root scripts

| Script | Does |
|---|---|
| `npm run dev` | Runs `uv run uvicorn backend.app.main:app --reload --port 8000` and `vite` together, with `concurrently` |
| `npm run seed` | `uv run python -m backend.app.crm.seed` |
| `npm test` | The traceability check (`scripts/check-trace.mjs --strict`), then `uv run pytest`, then `vitest run` in `frontend`, then `playwright test` in `e2e`, stopping at the first failure |

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
| Forms and validation | React Hook Form and Zod, laid out with shadcn/ui Field |
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

All rules live in each area's `service.py` (and the read-only queries in `pipeline.py` and `dashboard.py`), so they're tested once in pytest and the frontend can't skip them. Stage labels and probabilities are defined once, in `crm/stages.py`, and sent to the frontend with the pipeline. The frontend's `stages.ts` holds only colors.

- **Stage change** (`crm/deals/service.py`): in one transaction it
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
| `GET /pipeline` | Columns with their deals in order, the totals, and the stage list (key, label, probability, open) |
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
- **Playwright**: the whole app in Chrome, on a freshly seeded test database:
  - add, search, sort, edit and delete on each table, and check after a reload
  - drag between and within columns, and check after a reload
  - log a follow-up and see it on the dashboard
  - mark a deal won and see the dashboard change
  - no console errors on any page

## Design: how it looks

Everything follows the brand skill and the chosen mockup, mockup 2 (Command). The look is businesslike and dense: a Midnight top bar, mostly white panels on a pale page, Midnight text, one Midnight feature panel on the dashboard, and color used for meaning (stages, money, alerts), not decoration.

### Tokens

Defined once in `frontend/src/index.css` as CSS variables. Tailwind's `@theme` exposes them as utilities (`bg-page`, `text-ink`, `bg-stage-new` and so on). shadcn's own theme variables are pointed at the brand: `--background` is `--page`, `--card` and `--popover` are `--panel`, `--foreground` is `--ink`, `--primary` is Sea Green with Midnight text, `--destructive` is Raspberry, `--ring` is Cerulean, `--radius` is 12px, and `--chart-1` to `--chart-5` follow the brand's series order. shadcn's default outlines on cards and inputs are removed from cards and kept only where a field needs one to be seen. The tokens:

| Token | Value | Use |
|---|---|---|
| `--page` | `#F0F4F5` | Page background |
| `--panel` | `#FFFFFF` | Panels, cards, tables |
| `--ink` | `#073B4C` | Text |
| `--ink-muted` | `#073B4C` at 62% | Secondary text, column headings |
| `--mist` | `#CDD8DB` | Text on Midnight (top bar, dashboard feature panel) |
| `--raspberry-on-dark` | `#FF8FA8`, lightened Raspberry | Alerts on Midnight, such as overdue follow-ups in the feature panel |
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

The darkened text shades pass 4.5:1 on white: Sea Green ink 5.33:1, Marigold ink 4.73:1, Cerulean ink 5.16:1, Raspberry ink 5.53:1. Four brand pairings fall short and are kept as the brand sets them: `--ink-muted` on white (3.95:1), white on Cerulean (3.96:1), white on Raspberry (3.62:1) and Midnight on the Lost slate (4.46:1).

### Type

- Instrument Sans for everything: 14px body, 13px table cells, 600 weight for headings.
- JetBrains Mono for money, percentages, dates and counts, with tabular figures, so columns of numbers line up.
- Instrument Serif isn't used on the MVP's screens. The mockup's greeting is in Instrument Sans.
- All fonts are bundled (Concerns 2).

### Shapes

- Panels and cards: white, 12px radius, no outline, a very soft shadow (`0 1px 2px` at low opacity) to lift them off the page.
- No borders on one edge, no rules across the top of the page, and no gradient fills (brand, and the user's preferences).
- Buttons: 8px radius. Primary is Sea Green with Midnight text. Secondary is white with Midnight text. Destructive is Raspberry with white text.
- Stage badges: a small pill in the stage color, Midnight text (white on Won, Cerulean and Raspberry).

### App frame

- A Midnight top bar, 60px high, across the full width. On the left is the Accountable mark (a Sea Green square with a Midnight center) and wordmark in white. Next to it are links to Dashboard, Organizations, Contacts, Deals and Pipeline in Sea Mist. The current page is white and 600 weight, on a pill of Sea Mist at 14%. The right-hand side is empty in the MVP (Concerns 13).
- Below the bar, the page has a title and a short line under it, with the page's main actions on the right (for example "Add contact"), then the content. It's at most 1440px wide, with 32px side padding, and designed for 1280px and up.

### Dashboard

- **Header**: "Good morning" (or afternoon or evening) as the title, today's date under it, and two buttons on the right: "Log activity" (Concerns 14) and "Add deal".
- **Feature panel**: a full-width Midnight panel, 14px radius, in two parts.
  - On the left are the summary figures (R36) in white JetBrains Mono, with Sea Mist labels. The open pipeline value is large (40px). Under it, in two pairs, are expected revenue and won this month, then win rate over 12 months and follow-ups overdue ("3 of 7"). The overdue count is in the lightened Raspberry.
  - On the right is "Where the open value sits": the pipeline strip (R39), 44px high with 3px gaps between segments. Under it are four columns, one per open stage, each with a colored square, the stage name, its count and its value and expected revenue in mono.
- **Charts row**: three white panels side by side. They hold revenue won by month (line), deals won and lost by month (bars, with a legend), and the sales funnel.
- **Lists row**: follow-ups, three-fifths wide, and recent activity, two-fifths.
  - Follow-ups is a table with a checkbox to mark done, the task, what it's on (linked, in Cerulean) and a due chip. The chip is Raspberry with "Overdue · Nov 11" when overdue, Marigold for today and plain for later dates.
  - Recent activity is a list with a small dot per entry. Stage changes have a dot in the new stage's color and other activities a Sea Mist dot. Each entry has its description, what it's on (linked) and when, in mono.
- **Charts**: no gridline clutter, light horizontal guides only, axis labels and values in JetBrains Mono, and a tooltip on hover with the exact figure in dollars. With three charts in a row, the month labels can show every other month. The line is Sea Green with a soft area fill (a single flat tint, not a gradient), and the latest full month's peak is labelled. In the bar chart, Won is Sea Green and Lost is slate, with 4px rounded tops.
- **The funnel** is vertical bars from New to Won in the stage colors. Each bar's height is its value, the value sits on top in mono, and the stage name and the share carried on from the stage before sit underneath.

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

- **Page header**: the title "Pipeline", and under it the open totals in one line, such as "$806,000 open · $277,625 expected revenue · Won and Lost not counted". "Add deal" is on the right.
- **Summary strip**: a thin strip (10px) under the header, split into the four open stages by value, in the stage colors. It changes as cards move.
- **Columns**: six white panels side by side, 12px radius. The board scrolls sideways if the window is narrow.
- **Column header**: a block filled with the stage color, 8px radius. It shows the stage name, a count pill, the total value and expected revenue in mono (Won and Lost show the total only) and the stage's probability ("70% likely"). Text is Midnight on Sea Green, Marigold, Coral and Lost's slate, and white on Cerulean and Won's Midnight.
- **Cards**: filled with the page color (`#F0F4F5`) inside the white column, 8px radius, no shadow. They show the deal name in 600 weight, then the organization and main contact on one line, then the value in mono on the left and the close date on the right. A late card shows "Late" in a Raspberry pill in place of the date.
- **Add deal**: a full-width "+ Add deal" button at the foot of each column, in the page color.
- **Dragging**: the card being dragged turns white, tilts slightly and lifts with a stronger shadow, and a dashed gap opens where it will land. Totals and the summary strip update on drop.

### Words

Plain and short, with no exclamation marks.
- Buttons: "Add deal", "Log activity", "Mark done", "Delete".
- Empty states say what to do: "No activities yet. Log a call, email or note above."
- Money always shows the dollar sign.
