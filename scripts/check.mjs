#!/usr/bin/env node
// Runs every check, keeps going after a failure, prints a summary and exits
// non-zero if any check failed. --quick skips the end-to-end tests.

import { spawnSync } from 'node:child_process'

const quick = process.argv.includes('--quick')

const checks = [
  ['Prettier (frontend)', 'npx prettier --check frontend'],
  ['ESLint (frontend)', 'npx eslint frontend'],
  ['ruff format (backend)', 'uv run ruff format --check backend'],
  ['ruff check (backend)', 'uv run ruff check backend'],
  ['tsc (frontend)', 'npm run typecheck --workspace frontend'],
  ['ty (backend)', 'uv run ty check backend'],
  ['gitleaks (git history)', 'gitleaks git --redact --no-banner .'],
  ['gitleaks (working tree)', 'gitleaks dir --redact --no-banner .'],
  ['Traceability', 'npm run test:trace'],
  ['pytest + coverage', 'npm run test:backend'],
  ['Vitest + coverage', 'npm run test:frontend'],
]
if (!quick) checks.push(['Playwright (e2e)', 'npm run test:e2e'])

const results = []
for (const [name, cmd] of checks) {
  console.log(`\n=== ${name}: ${cmd}`)
  const { status } = spawnSync(cmd, { shell: true, stdio: 'inherit' })
  results.push([name, status === 0])
}

console.log('\n=== Summary')
for (const [name, ok] of results) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
const failed = results.filter(([, ok]) => !ok).length
console.log(failed ? `\n${failed} of ${results.length} checks failed` : `\nAll ${results.length} checks passed`)
process.exit(failed ? 1 : 0)
