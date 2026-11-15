import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures'
import { api, search, unique } from '../helpers'

async function follow(page: Page, link: ReturnType<Page['getByRole']>, url: RegExp, heading: string) {
  await link.click()
  await expect(page).toHaveURL(url)
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
}

test('[R18, C3] linked names in tables and record pages go to the right record', async ({ page, request }) => {
  const org = await api<{ id: number; name: string }>(request, 'post', '/organizations', { name: unique('Linkwood Labs') })
  const c = await api<{ id: number; name: string }>(request, 'post', '/contacts', { first_name: 'Lou', last_name: unique('Link').replace(/\s/g, ''), organization_id: org.id })
  const deal = await api<{ id: number; name: string }>(request, 'post', '/deals', { name: unique('Link deal'), organization_id: org.id, contact_id: c.id, value: 100, close_date: '2027-01-01' })
  await api(request, 'post', '/activities', { kind: 'note', deal_id: deal.id, description: 'Linked note' })

  // Contacts table: organization link.
  await page.goto('/contacts')
  await search(page).fill(c.name)
  await follow(page, page.getByRole('link', { name: org.name }), new RegExp(`/organizations/${org.id}$`), org.name)
  // Organization page: contact and deal links.
  await follow(page, page.getByRole('list', { name: 'Contacts' }).getByRole('link', { name: c.name }), new RegExp(`/contacts/${c.id}$`), c.name)
  // Contact page: organization link, deal list link and the timeline's deal link.
  await expect(page.getByRole('link', { name: org.name }).first()).toHaveAttribute('href', `/organizations/${org.id}`)
  await follow(page, page.getByRole('list', { name: 'Timeline' }).getByRole('link', { name: deal.name }), new RegExp(`/deals/${deal.id}$`), deal.name)
  // Deal page: organization and contact links.
  await follow(page, page.getByRole('link', { name: c.name }).first(), new RegExp(`/contacts/${c.id}$`), c.name)
  await follow(page, page.getByRole('list', { name: 'Deals' }).getByRole('link', { name: deal.name }), new RegExp(`/deals/${deal.id}$`), deal.name)
  await follow(page, page.getByRole('link', { name: org.name }).first(), new RegExp(`/organizations/${org.id}$`), org.name)

  // Deals table: organization and main contact links.
  await page.goto('/deals')
  await search(page).fill(deal.name)
  await follow(page, page.getByRole('link', { name: c.name }), new RegExp(`/contacts/${c.id}$`), c.name)
  await page.goto('/deals')
  await search(page).fill(deal.name)
  await follow(page, page.getByRole('link', { name: org.name }), new RegExp(`/organizations/${org.id}$`), org.name)

  // Pipeline card.
  await page.goto('/pipeline')
  await follow(page, page.getByRole('link', { name: deal.name, exact: true }), new RegExp(`/deals/${deal.id}$`), deal.name)
})

test('[R18, C3] the dashboard\'s follow-ups and recent activity link to their contact or deal', async ({ page }) => {
  await page.goto('/')
  const fu = page.getByTestId('follow-up').first().getByRole('link')
  const fuName = (await fu.textContent())!
  await follow(page, fu, /\/(contacts|deals)\/\d+$/, fuName)
  await page.goto('/')
  const recent = page.getByTestId('recent-entry').first().getByRole('link')
  const recentName = (await recent.textContent())!
  await follow(page, recent, /\/(contacts|deals)\/\d+$/, recentName)
})
