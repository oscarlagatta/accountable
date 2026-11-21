#!/usr/bin/env node
// PreToolUse hook: blocks any tool call that would change a .env file
// (.env or .env.<anything>, except .env.example). File tools are checked by
// their path; shell commands are checked for a write aimed at a .env file.

import { readFileSync } from 'node:fs'

const { tool_input: toolInput = {} } = JSON.parse(readFileSync(0, 'utf8') || '{}')

const ENV_FILE = /(^|\/)\.env(\.[^/\s]+)?$/
const isEnvFile = (p) => ENV_FILE.test(p) && !p.endsWith('.env.example')

// A .env path anywhere in a shell command, plus something that writes to it.
const ENV_IN_COMMAND = /(^|[\s'"=/<>])\.env(\.[\w-]+)?(?=$|[\s'";|&)<>])/
const WRITES =
  />|\b(tee|mv|cp|rm|ln|touch|truncate|dd|install|rsync|chmod|unlink)\b|\bsed\b.*\s-i|\bperl\b.*\s-\w*i|--in-place/
const writesEnv = (cmd) => ENV_IN_COMMAND.test(cmd) && WRITES.test(cmd)

const block = (what) => {
  console.error(`Blocked: ${what}. Editing .env files is not allowed in this project; ask the user to change it.`)
  process.exit(2)
}

for (const [key, value] of Object.entries(toolInput)) {
  if (typeof value !== 'string') continue
  if (key === 'command' && writesEnv(value)) block('this command writes to a .env file')
  if (/path|file/i.test(key) && isEnvFile(value.trim())) block(`${value} is a .env file`)
}
process.exit(0)
