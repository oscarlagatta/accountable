import { expect, test } from '../fixtures'

test('[R44, C9] from the dashboard, the five questions are each a few clicks away', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Sections' })

  // 1. Which companies we deal with: one click.
  await nav.getByRole('link', { name: 'Organizations' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Organizations' })).toBeVisible()
  await expect(page.getByRole('row').nth(20)).toBeVisible()

  // 2. Who our contacts are at a given company: two clicks.
  await page.getByRole('row').nth(1).getByRole('cell').first().click()
  const contacts = page.getByRole('list', { name: 'Contacts' })
  await expect(contacts.getByRole('link').first()).toBeVisible()

  // 3. What's in the pipeline and what it's worth: one click on the dashboard's strip.
  await nav.getByRole('link', { name: 'Dashboard' }).click()
  const openValue = await page.getByTestId('open-value').textContent()
  await page.getByTestId('pipeline-strip').click()
  await expect(page.getByTestId('open-totals')).toContainText(`${openValue} open`)
  await expect(page.getByTestId('deal-card').nth(40)).toBeVisible()

  // 4. What happened last with a given customer: open a contact from recent activity; the timeline is newest first.
  await nav.getByRole('link', { name: 'Dashboard' }).click()
  await page.getByTestId('recent-entry').first().getByRole('link').click()
  const timeline = page.getByRole('list', { name: 'Timeline' })
  await expect(timeline.getByTestId('timeline-entry').first()).toBeVisible()

  // 5. What needs doing next: the follow-ups on the dashboard, overdue first.
  await nav.getByRole('link', { name: 'Dashboard' }).click()
  const followUps = page.getByTestId('follow-up')
  await expect(followUps.nth(5)).toBeVisible()
  await expect(followUps.first()).toContainText('Overdue')
})
