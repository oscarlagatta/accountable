# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/spec.md`: the product as it stands today, and the authority on what it does. Read it first.
- `docs/changes/<branch>/`: one folder per change, named after its branch, with the change's `intent.md` and `plan.md`. Read only the folder for the branch you're on; the others are history.
- `docs/TECH_STACK.md`: the stack
- `docs/STANDARDS.md`: the code standards every change must meet
- `docs/STATUS.md`: what's done so far

When a change is built, update `docs/spec.md` so it describes the product with the change in it.

Update `docs/STATUS.md` when you finish a piece of work

## Checks

Run `npm run check` before calling any work done; it must exit 0. It runs every check below, keeps going after a failure, and ends with a PASS/FAIL summary:

- Prettier and ESLint on `frontend/` (TypeScript, React Hooks and jsx-a11y recommended rules)
- `ruff format --check` and `ruff check` on `backend/`
- Cyclomatic complexity of at most 15 per function (ESLint `complexity`, ruff `C901`)
- `tsc` for the frontend and `ty` for the backend
- gitleaks over the git history and the working tree (the git-ignored `.env` is allowed)
- the traceability check, then pytest and Vitest, each with at least 80% coverage, then Playwright end to end

`npm run check:quick` runs the same without the end-to-end tests. `npm run format` fixes the formatting. Don't weaken a rule to make a check pass; if a rule doesn't suit the project, ask first.

ESLint runs from the repo root with TypeScript 6 (`typescript` in the root package.json is an alias of `@typescript/typescript6`), because typescript-eslint can't load TypeScript 7. The frontend's own `tsc` is TypeScript 7.

## Hooks

- Git pre-commit (`lefthook.yml`, installed by `npm install`): formats the staged files, then runs ESLint, ruff, tsc, ty and gitleaks on the staged changes. No tests. A partly staged file that needs formatting stops the commit.
- Agent hooks (`.claude/settings.json`, scripts in `.claude/hooks/`): when you finish a turn, `npm run check:quick` runs and any failure comes back to you once to fix. Edits to `.env` files are blocked.

## Tests

Run `npm test` before calling any work done; it must exit 0. It runs, in order and stopping at the first failure: the traceability check (`scripts/check-trace.mjs --strict`), pytest, Vitest, then Playwright end to end. A failure in an early stage means the later ones did not run.

- Playwright starts its own backend (port 8100) and frontend (port 5180) on a fresh `e2e/.data/test.db`, so those ports must be free and Google Chrome installed. It never touches `backend/data/accountable.db`.
- Every e2e test fails on any browser console error, including a 404 from the app's own API.
- Each test title starts with the spec IDs it proves, such as `[R30]` (pytest: the docstring). The traceability check fails if an ID in `docs/spec.md` or `docs/changes/mvp/intent.md` has no tagged test.
