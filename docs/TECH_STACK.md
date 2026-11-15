This project will use the following high level technical stack:

1. Node.js 26, the current LTS (24 or later works) / TypeScript for the frontend, using React and Vite, in `frontend/`
2. Python 3.12 for the backend using uv, with FastAPI, in `backend/`, with `pyproject.toml` and `uv.lock` at the repo root

The frontend gets its data from the backend's JSON API. The backend keeps the data in a local SQLite database file, using SQLAlchemy Core with no raw SQL, and fills it with the sample data when the database is new.

Prefer popular, well-supported libraries to custom code, such as for the data tables, the charts and the drag-and-drop pipeline. Don't hand-roll what a mature library does well. The MVP uses:

- Styling: Tailwind CSS
- Components: shadcn/ui for dialogs, menus, side panels (Sheet), selects, forms (its Form components, built on React Hook Form and Zod), charts (its Chart components, built on Recharts), toasts (Sonner) and the other UI building blocks. Its components are copied into `frontend/src/components/ui/` and themed with the brand's colors and fonts.
- Other frontend libraries: React Router, TanStack Query, TanStack Table (with shadcn's Data Table pattern), dnd-kit, Lucide icons and date-fns
- Backend: FastAPI, Pydantic, SQLAlchemy Core and Uvicorn, with Faker (on a fixed seed) for the sample data
- Root: concurrently, to run the backend and frontend together

The fonts are installed as npm packages (`@fontsource-variable/instrument-sans`, `@fontsource/instrument-serif`, `@fontsource-variable/jetbrains-mono`) and bundled with the app rather than loaded from Google Fonts, so the app works with no internet connection.

The backend runs on port 8000 and the frontend on 5173, and Vite passes `/api` through to the backend. The database file is `backend/data/accountable.db`, which git ignores, unless the `ACCOUNTABLE_DB` environment variable names another file. "Today" means the local date on the computer the app runs on.

For now it runs locally. Later, Supabase will provide sign-in and the database, and the app will be deployed to Render.

Commands are npm scripts in a `package.json` at the repo root, with `frontend/` as an npm workspace, so they work the same on Mac, Linux and Windows:

- `npm run dev` starts the backend and the frontend together
- `npm test` runs all the tests and fails if any test fails
- `npm run seed` resets the database to the sample data

`docs/STATUS.md` says how to run the app. `README.md` is the course's own guide, so leave it as it is.

Testing will cover:

1. Unit tests for the frontend, using Vitest
2. Unit tests for the backend, using pytest
3. End-to-end tests of the whole app in a browser, in `e2e/`, using Playwright Test (`@playwright/test`) with the installed Google Chrome. They start the app themselves, so `npm test` needs nothing else running.

The tests use a database of their own, set through `ACCOUNTABLE_DB`, so running them never changes your data.
