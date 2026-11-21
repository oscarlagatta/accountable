import fs from 'node:fs'
import path from 'node:path'
import { STAGE_KEYS, stageStyle } from '@/features/deals/stages'

const src = path.resolve(import.meta.dirname, '..')
const css = fs.readFileSync(path.join(src, 'index.css'), 'utf8')

// Recharts draws with these default colors, and shadcn's chart component
// matches them in attribute selectors to restyle them. They are selectors, not colors we set.
const ALLOWED = [/\[stroke='#ccc'\]|\[stroke='#fff'\]|#ccc|#fff/]
const COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\boklch\(|\bhsla?\(/

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return sourceFiles(p)
    return /\.(tsx?|css)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : []
  })
}

describe('color tokens', () => {
  it('[K3, K12] no color values appear in src/ outside index.css', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(src)) {
      if (file.endsWith('index.css')) continue
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const isChartSelector = file.endsWith(path.join('ui', 'chart.tsx')) && ALLOWED.some((r) => r.test(line))
          if (COLOR.test(line) && !isChartSelector)
            offenders.push(`${path.relative(src, file)}:${i + 1}: ${line.trim()}`)
        })
    }
    expect(offenders).toEqual([])
  })

  it('[K3, K12] every stage color is a token defined in index.css', () => {
    for (const key of STAGE_KEYS) {
      const { token } = stageStyle(key)
      expect(css).toMatch(new RegExp(`--stage-${key}:\\s*var\\(--[a-z-]+\\)`))
      expect(token).toBe(`var(--stage-${key})`)
    }
  })

  it('[K12] the brand colors are defined once, on :root', () => {
    for (const hex of [
      '#06d6a0',
      '#ffc145',
      '#f78c6b',
      '#118ab2',
      '#ef476f',
      '#073b4c',
      '#cdd8db',
      '#f0f4f5',
      '#8aa1a9',
    ]) {
      const count = css.toLowerCase().split(hex).length - 1
      expect(count, hex).toBe(1)
    }
  })
})
