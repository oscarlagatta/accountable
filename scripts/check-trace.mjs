#!/usr/bin/env node
// Checks that every requirement, concern and success criterion is mapped to a
// phase and to tests in docs/changes/mvp/plan.md, and (with --strict) that the tests exist
// and carry the IDs in their titles, such as "[R30] ...".
//
// Without --strict, the test-file checks run only on test files that already
// exist, which is how the check follows the phases as they are built.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const strict = process.argv.includes('--strict')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

const EYE_ALLOWED = new Set(['C7', 'C8', 'C9', 'R5', 'R14', 'R44'])
const EYE_ONLY_ALLOWED = new Set(['C8'])

const errors = []
const fail = (msg) => errors.push(msg)

/** The lines of a markdown section, from its heading to the next heading of the same or higher level. */
function section(text, heading) {
  const lines = text.split('\n')
  const start = lines.findIndex((l) => l.replace(/^#+\s*/, '').trim() === heading && l.startsWith('#'))
  if (start === -1) throw new Error(`Section "${heading}" not found`)
  const level = lines[start].match(/^#+/)[0].length
  const out = []
  for (const line of lines.slice(start + 1)) {
    const m = line.match(/^(#+)\s/)
    if (m && m[1].length <= level) break
    out.push(line)
  }
  return out
}

function numberedItems(lines) {
  return lines.filter((l) => /^\d+\.\s/.test(l)).map((l) => Number(l.match(/^(\d+)/)[1]))
}

// 1. IDs from the source documents
const spec = read('docs/spec.md')
const intent = read('docs/changes/mvp/intent.md')
const plan = read('docs/changes/mvp/plan.md')

const sourceIds = new Set()
for (const m of spec.matchAll(/^- R(\d+)\./gm)) sourceIds.add(`R${m[1]}`)
for (const n of numberedItems(section(spec, 'Concerns'))) sourceIds.add(`K${n}`)
for (const n of numberedItems(section(intent, 'Success criteria'))) sourceIds.add(`C${n}`)

// The test files listed under Proof, with where they live
const proofFiles = [] // { name: 'lib/format.test.ts', key: 'lib/format.test', glob: 'frontend/src/lib/format.test.ts' }
let area = null
for (const line of section(plan, 'Proof')) {
  if (line.startsWith('####')) {
    if (/Backend/.test(line)) area = 'backend'
    else if (/Frontend/.test(line)) area = 'frontend'
    else if (/End-to-end/.test(line)) area = 'e2e'
    else area = null
    continue
  }
  const m = area && line.match(/^\|\s*`([^`]+)`\s*\|/)
  if (!m) continue
  const name = m[1]
  const glob =
    area === 'backend'
      ? `backend/tests/**/${name.replace(/^.*\//, '')}`
      : area === 'frontend'
        ? `frontend/src/${name}`
        : `e2e/tests/${name}`
  proofFiles.push({ name, key: name.replace(/\.(py|tsx?|mjs)$/, ''), glob })
}

function proofFor(traceName) {
  return proofFiles.find((p) => p.key === traceName || p.key.endsWith(`/${traceName}`))
}

// 2 and 3. The Traceability tables
const rows = new Map() // id -> { phases, tests, eye }
for (const line of section(plan, 'Traceability')) {
  const cells = line.split('|').map((c) => c.trim())
  if (cells.length < 6 || !/^[RKC]\d+$/.test(cells[1])) continue
  const [, id, , phases, testsCell] = cells
  if (rows.has(id)) fail(`${id} has more than one row in the Traceability table`)
  const tests = [...testsCell.matchAll(/`([^`]+)`/g)].map((m) => m[1])
  const eye = /\bEye\b/.test(testsCell)
  rows.set(id, { phases: phases.split(',').map((p) => p.trim()).filter(Boolean), tests, eye })
}

for (const id of sourceIds) {
  const row = rows.get(id)
  if (!row) {
    fail(`${id} has no row in the Traceability table`)
    continue
  }
  if (row.phases.length === 0) fail(`${id} has no phase`)
  if (row.tests.length === 0 && !row.eye) fail(`${id} has neither a test nor a check by eye`)
  if (row.eye && !EYE_ALLOWED.has(id)) fail(`${id} may not rely on a check by eye`)
  if (row.eye && row.tests.length === 0 && !EYE_ONLY_ALLOWED.has(id)) fail(`${id} needs a test as well as a check by eye`)
}

for (const [id, row] of rows) {
  if (!sourceIds.has(id)) fail(`${id} is in the Traceability table but not in the spec or the intent`)
  for (const t of row.tests) if (!proofFor(t)) fail(`${id} names \`${t}\`, which isn't listed under Proof`)
}

// 4. The test files themselves
const tagsCache = new Map()
function filesFor(proof) {
  return fs.globSync(proof.glob, { cwd: root })
}
function tagsIn(file) {
  if (!tagsCache.has(file)) {
    const text = fs.readFileSync(path.join(root, file), 'utf8')
    const tags = new Set()
    for (const m of text.matchAll(/\[((?:[RKC]\d+)(?:\s*,\s*[RKC]\d+)*)\]/g)) {
      for (const id of m[1].split(',')) tags.add(id.trim())
    }
    tagsCache.set(file, tags)
  }
  return tagsCache.get(file)
}

if (strict) {
  for (const p of proofFiles) if (filesFor(p).length === 0) fail(`${p.name} is listed under Proof but doesn't exist (${p.glob})`)
}

for (const [id, row] of rows) {
  if (!sourceIds.has(id) || row.tests.length === 0) continue
  const files = row.tests.flatMap((t) => (proofFor(t) ? filesFor(proofFor(t)) : []))
  if (!strict && files.length === 0) continue
  if (!files.some((f) => tagsIn(f).has(id))) {
    fail(`${id}: none of its tests (${row.tests.join(', ')}) has a title tagged [${id}]`)
  }
}

if (errors.length) {
  console.error(`Traceability check failed${strict ? ' (strict)' : ''}:`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
const existing = proofFiles.filter((p) => filesFor(p).length > 0).length
console.log(
  `Traceability check passed${strict ? ' (strict)' : ''}: ${sourceIds.size} IDs mapped, ${existing} of ${proofFiles.length} test files present.`,
)
