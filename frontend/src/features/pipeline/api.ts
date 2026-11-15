import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { refreshAfterChange } from '@/app/queryClient'
import type { Deal, Stage } from '@/features/deals/api'
import type { StageKey } from '@/features/deals/stages'
import { api } from '@/lib/api'
import { moveCard } from './board'

export type PipelineColumn = {
  stage: StageKey
  label: string
  probability: number
  open: boolean
  count: number
  total: number
  expected: number
  deals: Deal[]
}

export type Pipeline = {
  stages: Stage[]
  columns: PipelineColumn[]
  totals: { open_count: number; open_value: number; open_expected: number }
}

export const pipelineKey = ['pipeline'] as const

export function usePipeline() {
  return useQuery({ queryKey: pipelineKey, queryFn: () => api.get<Pipeline>('/pipeline') })
}

export type Move = { dealId: number; stage: StageKey; index: number }

/**
 * Drag on the board. The cache changes first, in the same tick as the drop, so cards, column
 * totals, open totals and the strip move at once; if the server fails, the board goes back and a
 * message says so (R32).
 */
export function useMoveDeal() {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ dealId, stage, index }: Move & { before?: Pipeline }) => api.post<Deal>(`/deals/${dealId}/move`, { stage, index }),
    onError: (_err, { before }) => {
      if (before) qc.setQueryData(pipelineKey, before)
      toast.error("The move wasn't saved. The card is back where it was.")
    },
    onSettled: () => refreshAfterChange(qc),
  })
  function move(m: Move) {
    void qc.cancelQueries({ queryKey: pipelineKey })
    const before = qc.getQueryData<Pipeline>(pipelineKey)
    if (before) qc.setQueryData(pipelineKey, moveCard(before, m.dealId, m.stage, m.index))
    mutation.mutate({ ...m, before })
  }
  return { move, isError: mutation.isError, isPending: mutation.isPending }
}
