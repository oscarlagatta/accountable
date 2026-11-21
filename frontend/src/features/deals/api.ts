import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isDeleted, refreshAfterChange } from '@/app/queryClient'
import { api } from '@/lib/api'
import type { StageKey } from './stages'

export type Deal = {
  id: number
  name: string
  organization_id: number | null
  organization_name: string | null
  contact_id: number | null
  contact_name: string | null
  stage: StageKey
  value: number
  probability: number
  expected_revenue: number
  close_date: string
  late: boolean
  position: number
}

export type DealInput = {
  name: string
  organization_id: number | null
  contact_id: number | null
  stage: StageKey
  value: number
  probability: number
  close_date: string
}

export type DealDeletePreview = { name: string; activities: number; stage_changes: number }

export type Stage = { key: StageKey; label: string; probability: number; open: boolean }

export const dealKeys = {
  all: ['deals'] as const,
  one: (id: number) => ['deals', id] as const,
}

export function useDeals() {
  return useQuery({ queryKey: dealKeys.all, queryFn: () => api.get<Deal[]>('/deals') })
}

export function useDeal(id: number) {
  return useQuery({
    queryKey: dealKeys.one(id),
    queryFn: () => api.get<Deal>(`/deals/${id}`),
    enabled: !isDeleted('deals', id),
  })
}

/** The stage list (labels and probabilities) comes from the API, never from the frontend. */
export function useStages() {
  return useQuery({
    queryKey: ['pipeline'],
    queryFn: () => api.get<{ stages: Stage[] }>('/pipeline'),
    select: (data) => data.stages,
  })
}

export function useSaveDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: Partial<DealInput> }) =>
      id ? api.patch<Deal>(`/deals/${id}`, data) : api.post<Deal>('/deals', data),
    onSuccess: () => refreshAfterChange(qc),
  })
}

export function useDeleteDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/deals/${id}`),
    onSuccess: (_data, id) => refreshAfterChange(qc, ['deals', id] as const),
  })
}

export const dealDeletePreview = (id: number) => api.get<DealDeletePreview>(`/deals/${id}/delete-preview`)
