import { expect, test } from '../fixtures'
import { api, choose, isoInDays, pick, sheet, todayIso, unique } from '../helpers'

type Dash = {
  summary: { open_value: number; open_expected: number; won_this_month: number; win_rate: number | null; open_follow_ups: number; overdue_follow_ups: number }
  months: { won_value: number; won_count: number }[]
  follow_ups: { description: string }[]
}
const usd = (n: number) => `$${n.toLocaleString('en-US')}`

test('[R36, R43, C6] the figures on the page match the API', async ({ page, request }) => {
  await page.goto('/')
  const d = await api<Dash>(request, 'get', '/dashboard')
  await expect(page.getByTestId('open-value')).toHaveText(usd(d.summary.open_value))
  await expect(page.getByTestId('open-expected')).toHaveText(usd(d.summary.open_expected))
  await expect(page.getByTestId('won-this-month')).toHaveText(usd(d.summary.won_this_month))
  await expect(page.getByTestId('win-rate')).toHaveText(`${d.summary.win_rate}%`)
  await expect(page.getByTestId('follow-ups-overdue')).toHaveText(`${d.summary.overdue_follow_ups} of ${d.summary.open_follow_ups}`)
  await expect(page.getByTestId('follow-up')).toHaveCount(d.follow_ups.length)
  await expect(page.getByTestId('recent-entry')).toHaveCount(10)
})

test('[R36, R37, R38, R43, C6, C7] marking a deal won changes won this month, the win rate and the charts', async ({ page, request }) => {
  const name = unique('Dashboard win')
  const deal = await api<{ id: number }>(request, 'post', '/deals', { name, value: 33000, stage: 'negotiation', close_date: isoInDays(30) })
  await page.goto('/')
  const before = await api<Dash>(request, 'get', '/dashboard')
  await expect(page.getByTestId('won-this-month')).toHaveText(usd(before.summary.won_this_month))

  await page.goto(`/deals/${deal.id}`)
  await page.getByRole('button', { name: 'Edit' }).click()
  await choose(page, 'Stage', 'Won')
  await sheet(page).getByLabel('Close date').fill(todayIso())
  await sheet(page).getByRole('button', { name: 'Save' }).click()
  await expect(sheet(page)).toBeHidden()

  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByTestId('won-this-month')).toHaveText(usd(before.summary.won_this_month + 33000))
  const after = await api<Dash>(request, 'get', '/dashboard')
  await expect(page.getByTestId('win-rate')).toHaveText(`${after.summary.win_rate}%`)
  expect(after.months.at(-1)!.won_value).toBe(before.months.at(-1)!.won_value + 33000)
  expect(after.months.at(-1)!.won_count).toBe(before.months.at(-1)!.won_count + 1)
  await expect(page.getByTestId('open-value')).toHaveText(usd(before.summary.open_value - 33000))
  // The revenue chart's peak label or line moves with the data; at least its points are drawn for 12 months.
  await expect(page.getByTestId('revenue-chart').locator('.recharts-area-curve')).toBeVisible()
  await expect(page.getByTestId('recent-entry').first()).toContainText('Moved from Negotiation to Won')
})

test('[R41, K14, C5, C6] Log activity on the dashboard asks for a contact or deal; the follow-up shows, then goes when marked done', async ({ page, request }) => {
  const last = unique('Ross').replace(/\s/g, '')
  await api(request, 'post', '/contacts', { first_name: 'Nia', last_name: last })
  const task = unique('Call Nia back')
  await page.goto('/')
  await page.getByRole('button', { name: 'Log activity' }).click()
  const form = sheet(page)
  await form.getByLabel('What happened').fill(task)
  await form.getByLabel(/Follow-up date/).fill(isoInDays(2))
  await form.getByRole('button', { name: 'Log activity' }).click()
  await expect(form.getByRole('alert')).toHaveText('Choose a contact or a deal')
  await pick(page, 'On', `Nia ${last}`)
  await form.getByRole('button', { name: 'Log activity' }).click()
  await expect(sheet(page)).toBeHidden()

  const row = page.getByTestId('follow-up').filter({ hasText: task })
  await expect(row).toBeVisible()
  await expect(row.getByRole('link', { name: `Nia ${last}` })).toBeVisible()
  await row.getByRole('checkbox').click()
  await expect(row).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('follow-up').filter({ hasText: task })).toHaveCount(0)
})

test('[R37, R38, R39, R40, K15, C7] the line chart, bar chart, funnel and strip are there, and the strip opens the board', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('revenue-chart').locator('.recharts-area-curve')).toBeVisible()
  await expect(page.getByTestId('won-lost-chart').locator('.recharts-bar-rectangle').first()).toBeVisible()
  await expect(page.getByTestId('funnel-chart').locator('.recharts-bar-rectangle')).toHaveCount(5)
  await expect(page.getByTestId('pipeline-strip').locator('[data-stage]')).toHaveCount(4)
  await expect(page.getByTestId('strip-stage')).toHaveCount(4)
  await page.getByTestId('pipeline-strip').click()
  await expect(page).toHaveURL(/\/pipeline$/)
  await page.goBack()
  await page.getByTestId('strip-stage').nth(2).click()
  await expect(page).toHaveURL(/\/pipeline$/)
})
