import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isDeleted, refreshAfterChange } from '@/app/queryClient'
import type { Deal } from '@/features/deals/api'
import { api } from '@/lib/api'

export type ContactStatus = 'lead' | 'qualified' | 'customer'

export const CONTACT_STATUSES: { key: ContactStatus; label: string }[] = [
  { key: 'lead', label: 'Lead' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'customer', label: 'Customer' },
]

export type ContactRow = {
  id: number
  name: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  organization_id: number | null
  organization_name: string | null
  status: ContactStatus
}

export type Contact = ContactRow & { deals: Deal[] }

export type ContactInput = {
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  organization_id: number | null
  status: ContactStatus
}

export type ContactDeletePreview = { name: string; deals: number; activities: number }

export const contactKeys = {
  all: ['contacts'] as const,
  one: (id: number) => ['contacts', id] as const,
}

export function useContacts() {
  return useQuery({ queryKey: contactKeys.all, queryFn: () => api.get<ContactRow[]>('/contacts') })
}

export function useContact(id: number) {
  return useQuery({ queryKey: contactKeys.one(id), queryFn: () => api.get<Contact>(`/contacts/${id}`), enabled: !isDeleted('contacts', id) })
}

export function useSaveContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: ContactInput }) =>
      id ? api.patch<Contact>(`/contacts/${id}`, data) : api.post<Contact>('/contacts', data),
    onSuccess: () => refreshAfterChange(qc),
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/contacts/${id}`),
    onSuccess: (_data, id) => refreshAfterChange(qc, ['contacts', id] as const),
  })
}

export const contactDeletePreview = (id: number) => api.get<ContactDeletePreview>(`/contacts/${id}/delete-preview`)
