Add npm run check, which runs all of these and fails if any of them fails:
- Prettier and ESLint for the frontend, using the recommended TypeScript, React Hooks and accessibility rules
- ruff format and ruff check for the backend
- A maximum cyclomatic complexity of 15 per function, using ESLint's complexity rule and ruff's C901 rule
- tsc for the frontend and ty for the backend
- gitleaks across the repo, allowing the git-ignored .env
- npm test, with unit test coverage of at least 80%
  Add npm run check:quick, which runs the same checks without the end-to-end tests. Add npm run format to fix the formatting. Fix what the checks find, without weakening any rule. If a rule doesn't suit this project, ask me first. Add npm run check to AGENTS.md, run it and show me the output.