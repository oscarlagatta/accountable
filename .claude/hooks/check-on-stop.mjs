#!/usr/bin/env node
// Stop hook: runs `npm run check:quick` when the agent finishes a turn. If it
// fails, the stop is blocked and the output goes back to the agent to fix.
// When the agent stops again while still continuing from that block
// (stop_hook_active), it is let through, so this can't loop.

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const input = JSON.parse(readFileSync(0, 'utf8') || '{}')
if (input.stop_hook_active) process.exit(0)

const result = spawnSync('npm run check:quick 2>&1', {
  shell: true,
  cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})
if (result.status === 0) process.exit(0)

const output = (result.stdout || '').replace(/\x1b\[[0-9;]*m/g, '')
const tail = output.split('\n').slice(-200).join('\n')
const reason = `npm run check:quick failed. Fix the failures, then run it again to confirm.\n\n${tail}`
console.log(JSON.stringify({ decision: 'block', reason }))
