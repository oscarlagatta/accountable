import { QueryClient } from '@tanstack/react-query'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: 1 },
      mutations: { retry: 0 },
    },
  })
}

export const queryClient = makeQueryClient()

/**
 * After a change, refetch what's on screen. A change to one record can move figures
 * elsewhere (counts, open value, timelines, the board, the dashboard), so every query is
 * marked stale and the active ones refetch.
 *
 * `removed` names a deleted record's queries (such as ['deals', 12]); they're dropped
 * rather than refetched, since the record is gone. Delete previews are never refetched.
 */
export function refreshAfterChange(client: QueryClient = queryClient, removed?: readonly [string, number]) {
  if (removed) {
    deleted.add(removed.join(':'))
    client.removeQueries({ queryKey: removed })
  }
  return client.invalidateQueries({ predicate: (q) => !q.queryKey.includes('delete-preview') })
}

// Records deleted in this session. Their queries are turned off, so a page that is still on
// screen for a moment after the delete doesn't ask the server for a record that is gone.
const deleted = new Set<string>()

export function isDeleted(kind: string, id: number) {
  return deleted.has(`${kind}:${id}`)
}
