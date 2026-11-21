import { STAGE_KEYS, stageStyle } from './stages'

describe('stage colors', () => {
  it('[K3] every stage has a color token and a readable text color', () => {
    expect(STAGE_KEYS).toEqual(['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'])
    const lightText = Object.fromEntries(STAGE_KEYS.map((k) => [k, stageStyle(k).lightText]))
    // White on Cerulean and Won's Midnight; Midnight on Sea Green, Marigold, Coral and Lost's slate.
    expect(lightText).toEqual({
      new: false,
      qualified: false,
      proposal: false,
      negotiation: true,
      won: true,
      lost: false,
    })
    for (const k of STAGE_KEYS) {
      const s = stageStyle(k)
      expect(s.token).toBe(`var(--stage-${k})`)
      expect(s.fill).toContain(`bg-stage-${k}`)
      expect(s.fill).toContain(s.lightText ? 'text-white' : 'text-ink')
    }
  })

  it('[K3] an unknown stage fails loudly', () => {
    expect(() => stageStyle('archived')).toThrow('Unknown stage: archived')
  })
})
