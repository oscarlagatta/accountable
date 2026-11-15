import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures'
import { api, isoInDays, toast, unique } from '../helpers'

async function logActivity(page: Page, kind: 'Note' | 'Call' | 'Email', text: string, when: string, followUp?: string) {
  const form = page.getByRole('form', { name: 'Log activity' })
  await form.getByRole('radio', { name: kind }).click()
  await form.getByLabel('What happened').fill(text)
  await form.getByLabel('When').fill(when)
  if (followUp) await form.getByLabel(/Follow-up date/).fill(followUp)
  await form.getByRole('button', { name: 'Log activity' }).click()
  await expect(page.getByRole('list', { name: 'Timeline' })).toContainText(text)
}

function entries(page: Page) {
  return page.getByRole('list', { name: 'Timeline' }).getByTestId('timeline-entry')
}

test('[R19, R20, C5] log a note, a call and an email with a follow-up on a contact; newest first, after a reload too', async ({ page, request }) => {
  const c = await api<{ id: number }>(request, 'post', '/contacts', { first_name: 'Tess', last_name: unique('Hale').replace(/\s/g, '') })
  await page.goto(`/contacts/${c.id}`)
  await expect(page.getByText('No activities yet. Log a call, email or note above.')).toBeVisible()
  await logActivity(page, 'Call', 'Intro call', '2026-10-01T09:00')
  await logActivity(page, 'Email', 'Sent pricing', '2026-10-03T14:30', isoInDays(5))
  await logActivity(page, 'Note', 'Prefers email', '2026-10-02T11:00')
  await page.reload()
  await expect(entries(page)).toHaveCount(3)
  await expect(entries(page).nth(0)).toContainText('Sent pricing')
  await expect(entries(page).nth(1)).toContainText('Prefers email')
  await expect(entries(page).nth(2)).toContainText('Intro call')
  await expect(entries(page).nth(0).getByRole('img')).toHaveAttribute('aria-label', 'Email')
  await expect(entries(page).nth(0).getByRole('button', { name: 'Mark done' })).toBeVisible()
})

test('[R19, R20, C5] an activity on a deal shows on the deal and on its main contact, with a link to the deal', async ({ page, request }) => {
  const c = await api<{ id: number }>(request, 'post', '/contacts', { first_name: 'Ugo', last_name: unique('Marsh').replace(/\s/g, '') })
  const deal = await api<{ id: number; name: string }>(request, 'post', '/deals', { name: unique('Marsh rollout'), contact_id: c.id, value: 1000, close_date: '2027-01-01' })
  await page.goto(`/deals/${deal.id}`)
  await logActivity(page, 'Call', 'Walked through the proposal', '2026-11-02T10:00', isoInDays(3))
  await page.goto(`/contacts/${c.id}`)
  const entry = entries(page).filter({ hasText: 'Walked through the proposal' })
  await expect(entry).toBeVisible()
  await entry.getByRole('link', { name: deal.name }).click()
  await expect(page).toHaveURL(new RegExp(`/deals/${deal.id}$`))
})

test('[R21, C5] edit, delete and mark done, checked after a reload', async ({ page, request }) => {
  const c = await api<{ id: number }>(request, 'post', '/contacts', { first_name: 'Vic', last_name: unique('Nolan').replace(/\s/g, '') })
  await api(request, 'post', '/activities', { kind: 'note', contact_id: c.id, description: 'Draft note', occurred_at: '2026-10-01T09:00:00' })
  await api(request, 'post', '/activities', { kind: 'call', contact_id: c.id, description: 'Call back', occurred_at: '2026-10-02T09:00:00', follow_up_date: isoInDays(-2) })
  await page.goto(`/contacts/${c.id}`)

  const followUp = entries(page).filter({ hasText: 'Call back' })
  await expect(followUp).toContainText('Overdue')
  await followUp.getByRole('button', { name: 'Mark done' }).click()
  await toast(page, 'Follow-up marked done')
  await expect(followUp).toContainText('Follow-up done')

  const note = entries(page).filter({ hasText: 'Draft note' })
  await note.hover()
  await note.getByRole('button', { name: 'Edit activity' }).click()
  const form = page.getByRole('form', { name: 'Edit activity' })
  await form.getByLabel('What happened').fill('Agreed scope for phase one')
  await form.getByRole('button', { name: 'Save' }).click()
  await toast(page, 'Activity saved')

  await page.reload()
  await expect(entries(page).filter({ hasText: 'Call back' })).toContainText('Follow-up done')
  await expect(entries(page).filter({ hasText: 'Agreed scope for phase one' })).toBeVisible()

  const edited = entries(page).filter({ hasText: 'Agreed scope for phase one' })
  await edited.hover()
  await edited.getByRole('button', { name: 'Delete activity' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await toast(page, 'Activity deleted')
  await page.reload()
  await expect(entries(page)).toHaveCount(1)
})
