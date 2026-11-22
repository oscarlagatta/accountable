#!/usr/bin/env node
// PreToolUse hook for read-only agents: allows a Bash command only when every
// part of it (split on pipes, && , || and ;) is a command that reads. Blocks
// redirection, command substitution, and anything not on the list.

import { readFileSync } from 'node:fs'

const { tool_input: toolInput = {} } = JSON.parse(readFileSync(0, 'utf8') || '{}')
const command = typeof toolInput.command === 'string' ? toolInput.command : ''

const READ_COMMANDS = new Set([
  'cat',
  'head',
  'tail',
  'grep',
  'rg',
  'wc',
  'ls',
  'sort',
  'uniq',
  'cut',
  'tr',
  'pwd',
  'sed',
  'find',
  'cd',
  'echo',
])
const READ_GIT = new Set([
  'diff',
  'log',
  'show',
  'status',
  'blame',
  'rev-parse',
  'merge-base',
  'ls-files',
  'grep',
  'shortlog',
  'describe',
  'cat-file',
])

const block = (why) => {
  console.error(`Blocked: ${why}. This agent may only run commands that read.`)
  process.exit(2)
}

if (/[`]|\$\(|>|<\(/.test(command)) block('redirection or command substitution')

for (const part of command.split(/\|\||&&|[|;\n]/)) {
  const words = part.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) continue
  const [name, ...args] = words
  if (name === 'git') {
    const sub = args.find((a) => !a.startsWith('-'))
    if (!READ_GIT.has(sub)) block(`git ${sub ?? ''} is not a read-only git command`)
    if (args.some((a) => a === '--output' || a.startsWith('--output='))) block('git --output writes a file')
    continue
  }
  if (!READ_COMMANDS.has(name)) block(`${name} is not on the read-only list`)
  if (name === 'sed' && args.some((a) => /^-[a-zA-Z]*i/.test(a) || a.startsWith('--in-place')))
    block('sed -i edits files')
  if (name === 'find' && args.some((a) => ['-exec', '-execdir', '-delete', '-ok', '-fprint'].includes(a))) {
    block('find with -exec or -delete')
  }
}
process.exit(0)
