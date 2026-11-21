#!/usr/bin/env node
// Formats the staged files passed in by lefthook and stages the result.
// Frontend files go through Prettier, backend Python through ruff format.
//
// A file that also has unstaged changes is refused. Before the hook runs,
// lefthook sets those changes aside as a patch (.git/info/lefthook-unstaged.patch)
// and applies it again afterwards; if the file was reformatted in between, the
// patch lands on the wrong lines. Outside lefthook, `git diff` finds them instead.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const files = process.argv.slice(2)
if (files.length === 0) process.exit(0)

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' }).stdout.trim()
const run = (cmd, args) => spawnSync(cmd, args, { stdio: 'inherit' }).status === 0

function partlyStaged() {
  const patch = git('rev-parse', '--git-path', 'info/lefthook-unstaged.patch')
  const hidden = existsSync(patch)
    ? [...readFileSync(patch, 'utf8').matchAll(/^diff --git a\/(.+) b\//gm)].map((m) => m[1])
    : []
  const visible = git('diff', '--name-only', '--', ...files).split('\n')
  return files.filter((f) => hidden.includes(f) || visible.includes(f))
}

// Fully staged files are formatted and staged again. Partly staged ones are only
// checked, and the commit stops if they need formatting.
const partial = partlyStaged()
const whole = files.filter((f) => !partial.includes(f))

function format(list, check) {
  const py = list.filter((f) => f.endsWith('.py'))
  const other = list.filter((f) => !f.endsWith('.py'))
  let ok = true
  if (other.length)
    ok =
      run('npx', ['prettier', check ? '--check' : '--write', '--ignore-unknown', '--log-level', 'warn', ...other]) && ok
  if (py.length) ok = run('uv', ['run', 'ruff', 'format', '--quiet', ...(check ? ['--check'] : []), ...py]) && ok
  return ok
}

let ok = true
if (whole.length) ok = format(whole, false) && run('git', ['add', '--', ...whole])
if (partial.length && !format(partial, true)) {
  ok = false
  console.error('These files are only partly staged and need formatting, so they were left alone:')
  for (const f of partial) console.error(`  ${f}`)
  console.error('Run npm run format and stage the result, or stage the whole file, then commit again.')
}
process.exit(ok ? 0 : 1)
