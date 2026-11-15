// Stage colors only. Labels, order and probabilities come from the API (GET /api/pipeline).

export const STAGE_KEYS = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const
export type StageKey = (typeof STAGE_KEYS)[number]

type StageStyle = {
  /** CSS value for the stage color, for inline styles and chart fills. */
  token: string
  /** Tailwind classes for a block filled with the stage color, with readable text on it. */
  fill: string
  /** Tailwind class for the stage color as a background only. */
  bg: string
  /** Whether text on the stage color is white (true) or Midnight (false). */
  lightText: boolean
}

const STYLES: Record<StageKey, StageStyle> = {
  new: { token: 'var(--stage-new)', fill: 'bg-stage-new text-ink', bg: 'bg-stage-new', lightText: false },
  qualified: { token: 'var(--stage-qualified)', fill: 'bg-stage-qualified text-ink', bg: 'bg-stage-qualified', lightText: false },
  proposal: { token: 'var(--stage-proposal)', fill: 'bg-stage-proposal text-ink', bg: 'bg-stage-proposal', lightText: false },
  negotiation: { token: 'var(--stage-negotiation)', fill: 'bg-stage-negotiation text-white', bg: 'bg-stage-negotiation', lightText: true },
  won: { token: 'var(--stage-won)', fill: 'bg-stage-won text-white', bg: 'bg-stage-won', lightText: true },
  lost: { token: 'var(--stage-lost)', fill: 'bg-stage-lost text-ink', bg: 'bg-stage-lost', lightText: false },
}

export function isStageKey(key: string): key is StageKey {
  return (STAGE_KEYS as readonly string[]).includes(key)
}

export function stageStyle(key: string): StageStyle {
  if (!isStageKey(key)) throw new Error(`Unknown stage: ${key}`)
  return STYLES[key]
}
