import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isDeleted, refreshAfterChange } from '@/app/queryClient'
import type { StageKey } from '@/features/deals/stages'
import { api } from '@/lib/api'

export type ActivityKind = 'note' | 'call' | 'email'

export const ACTIVITY_KINDS: { key: ActivityKind; label: string }[] = [
  { key: 'note', label: 'Note' },
  { key: 'call', label: 'Call' },
  { key: 'email', label: 'Email' },
]

export type TimelineEntry = {
  id: number
  kind: ActivityKind | 'stage_change'
  description: string
  occurred_at: string
  follow_up_date: string | null
  done: boolean
  from_stage: StageKey | null
  to_stage: StageKey | null
  contact_id: number | null
  contact_name: string | null
  deal_id: number | null
  deal_name: string | null
}

export type ActivityInput = {
  kind: ActivityKind
  contact_id?: number | null
  deal_id?: number | null
  description: string
  occurred_at: string
  follow_up_date: string | null
}

export type ActivityPatch = Partial<Omit<ActivityInput, 'contact_id' | 'deal_id'>> & { done?: boolean }

export type TimelineOwner = { kind: 'contact' | 'deal'; id: number }

export const timelineKey = (owner: TimelineOwner) =>
  [owner.kind === 'contact' ? 'contacts' : 'deals', owner.id, 'timeline'] as const

export function useTimeline(owner: TimelineOwner) {
  return useQuery({
    queryKey: timelineKey(owner),
    enabled: !isDeleted(owner.kind === 'contact' ? 'contacts' : 'deals', owner.id),
    queryFn: () => api.get<TimelineEntry[]>(`/${owner.kind === 'contact' ? 'contacts' : 'deals'}/${owner.id}/timeline`),
  })
}

export function useLogActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ActivityInput) => api.post<TimelineEntry>('/activities', data),
    onSuccess: () => refreshAfterChange(qc),
  })
}

export function useUpdateActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ActivityPatch }) =>
      api.patch<TimelineEntry>(`/activities/${id}`, data),
    onSuccess: () => refreshAfterChange(qc),
  })
}

export function useDeleteActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/activities/${id}`),
    onSuccess: (_data, id) => refreshAfterChange(qc, ['activities', id] as const),
  })
}
