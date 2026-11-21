import { useQuery } from '@tanstack/react-query'
import type { TimelineEntry } from '@/features/activities/api'
import type { StageKey } from '@/features/deals/stages'
import { api } from '@/lib/api'

export type Month = {
  month: string
  label: string
  year: number
  won_value: number
  won_count: number
  lost_count: number
}
export type StripStage = { stage: StageKey; label: string; count: number; value: number; expected: number }
export type FunnelStage = { stage: StageKey; label: string; count: number; value: number; share: number | null }
export type FollowUp = TimelineEntry & { status: 'overdue' | 'today' | 'upcoming' }

export type Dashboard = {
  today: string
  summary: {
    open_value: number
    open_expected: number
    open_count: number
    won_this_month: number
    won_count_12m: number
    lost_count_12m: number
    win_rate: number | null
    open_follow_ups: number
    overdue_follow_ups: number
  }
  months: Month[]
  strip: StripStage[]
  funnel: FunnelStage[]
  follow_ups: FollowUp[]
  recent: TimelineEntry[]
}

export function useDashboard() {
  // Worked out by the server on each load (R43), so it's always refetched when the page opens.
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<Dashboard>('/dashboard'),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
