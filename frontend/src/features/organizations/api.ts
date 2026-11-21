import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isDeleted, refreshAfterChange } from '@/app/queryClient'
import type { ContactStatus } from '@/features/contacts/api'
import type { Deal } from '@/features/deals/api'
import { api } from '@/lib/api'

export type OrganizationRow = {
  id: number
  name: string
  industry: string | null
  website: string | null
  contact_count: number
  open_deal_count: number
  open_value: number
}

export type Organization = {
  id: number
  name: string
  industry: string | null
  website: string | null
  notes: string | null
  contacts: {
    id: number
    name: string
    email: string | null
    phone: string | null
    job_title: string | null
    status: ContactStatus
  }[]
  deals: Deal[]
}

export type OrganizationInput = { name: string; website: string | null; industry: string | null; notes: string | null }
export type OrganizationDeletePreview = { name: string; contacts: number; deals: number }

export const organizationKeys = {
  all: ['organizations'] as const,
  one: (id: number) => ['organizations', id] as const,
}

export function useOrganizations() {
  return useQuery({ queryKey: organizationKeys.all, queryFn: () => api.get<OrganizationRow[]>('/organizations') })
}

export function useOrganization(id: number) {
  return useQuery({
    queryKey: organizationKeys.one(id),
    queryFn: () => api.get<Organization>(`/organizations/${id}`),
    enabled: !isDeleted('organizations', id),
  })
}

export function useSaveOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: OrganizationInput }) =>
      id ? api.patch<Organization>(`/organizations/${id}`, data) : api.post<Organization>('/organizations', data),
    onSuccess: () => refreshAfterChange(qc),
  })
}

export function useDeleteOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/organizations/${id}`),
    onSuccess: (_data, id) => refreshAfterChange(qc, ['organizations', id] as const),
  })
}

export const organizationDeletePreview = (id: number) =>
  api.get<OrganizationDeletePreview>(`/organizations/${id}/delete-preview`)
