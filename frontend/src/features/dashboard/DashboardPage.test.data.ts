import type { Dashboard } from './api'
const base = { done: false, from_stage: null, to_stage: null, contact_id: null, contact_name: null, deal_id: null, deal_name: null }
const LABELS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']

export const data: Dashboard = {
  today: '2026-11-15',
  summary: { open_value: 806000, open_expected: 277625, open_count: 16, won_this_month: 72000, won_count_12m: 17, lost_count_12m: 8, win_rate: 68, open_follow_ups: 7, overdue_follow_ups: 3 },
  months: LABELS.map((label, i) => ({ month: `${i === 0 ? 2025 : 2026}-${String(i === 0 ? 12 : i).padStart(2, '0')}`, label, year: i === 0 ? 2025 : 2026, won_value: (i + 1) * 10000, won_count: 1 + (i % 3), lost_count: 1 + (i % 2) })),
  strip: [
    { stage: 'new', label: 'New', count: 5, value: 138500, expected: 6925 },
    { stage: 'qualified', label: 'Qualified', count: 4, value: 232000, expected: 46400 },
    { stage: 'proposal', label: 'Proposal', count: 4, value: 268500, expected: 107400 },
    { stage: 'negotiation', label: 'Negotiation', count: 3, value: 167000, expected: 116900 },
  ],
  funnel: [
    { stage: 'new', label: 'New', count: 60, value: 2840000, share: null },
    { stage: 'qualified', label: 'Qualified', count: 45, value: 2010000, share: 71 },
    { stage: 'proposal', label: 'Proposal', count: 33, value: 1480000, share: 74 },
    { stage: 'negotiation', label: 'Negotiation', count: 28, value: 1310000, share: 89 },
    { stage: 'won', label: 'Won', count: 17, value: 1220000, share: 93 },
  ],
  follow_ups: [
    { ...base, id: 1, kind: 'email', description: 'Send revised SOW', occurred_at: '2026-11-01T09:00:00', follow_up_date: '2026-11-11', status: 'overdue', deal_id: 4, deal_name: 'ERP integration' },
    { ...base, id: 2, kind: 'call', description: 'Prep negotiation call', occurred_at: '2026-11-02T09:00:00', follow_up_date: '2026-11-15', status: 'today', deal_id: 5, deal_name: 'Managed support renewal' },
    { ...base, id: 3, kind: 'note', description: 'Demo for clinical leads', occurred_at: '2026-11-03T09:00:00', follow_up_date: '2026-11-17', status: 'upcoming', contact_id: 9, contact_name: 'Ana Petrov' },
  ],
  recent: [
    { ...base, id: 10, kind: 'stage_change', description: 'Moved from Proposal to Negotiation', occurred_at: '2026-11-15T09:42:00', follow_up_date: null, to_stage: 'negotiation', deal_id: 6, deal_name: 'Warehouse scanners rollout' },
    { ...base, id: 11, kind: 'note', description: 'Agreed scope for phase one', occurred_at: '2026-11-14T09:10:00', follow_up_date: null, contact_id: 7, contact_name: 'Lena Fischer' },
  ],
}

