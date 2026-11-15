import type { Locator, Page } from '@playwright/test'
import { expect, test } from '../fixtures'
import { api, dollars, search, sheet, todayIso, unique } from '../helpers'

type Pipeline = { columns: { stage: string; count: number; total: number; expected: number; deals: { id: number; name: string }[] }[]; totals: { open_value: number; open_expected: number } }

const column = (page: Page, label: string) => page.getByRole('region', { name: `${label} column` })
const card = (page: Page, name: string) => page.getByTestId('deal-card').filter({ has: page.getByRole('link', { name, exact: true }) })
const cardNames = async (col: Locator) => col.getByTestId('deal-card').locator('a').allTextContents()

/** Drags with the mouse in small steps, so dnd-kit sees a real drag. */
async function drag(page: Page, from: Locator, to: Locator, where: 'top' | 'center' | 'bottom' = 'center') {
  const a = (await from.boundingBox())!
  const b = (await to.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + 12, { steps: 4 })
  const y = where === 'top' ? b.y + 6 : where === 'bottom' ? b.y + b.height - 6 : b.y + b.height / 2
  await page.mouse.move(b.x + b.width / 2, y, { steps: 20 })
  await page.waitForTimeout(150)
  await page.mouse.move(b.x + b.width / 2, y + 1, { steps: 2 })
  await page.mouse.up()
}

async function addDealIn(page: Page, label: string, name: string, value: string) {
  await column(page, label).getByRole('button', { name: '+ Add deal' }).click()
  await expect(sheet(page).getByRole('combobox', { name: 'Stage' })).toHaveText(label)
  await sheet(page).getByLabel('Name').fill(name)
  await sheet(page).getByLabel('Value ($)').fill(value)
  await sheet(page).getByLabel('Close date').fill('2027-06-30')
  await sheet(page).getByRole('button', { name: 'Add deal' }).click()
  await expect(sheet(page)).toBeHidden()
}

test('[R33, R27, C4] a deal added in a column starts at the top, at that stage and its probability', async ({ page, request }) => {
  const name = unique('Board new')
  await page.goto('/pipeline')
  const before = await column(page, 'Qualified').getByTestId('column-count').textContent()
  await addDealIn(page, 'Qualified', name, '30000')
  expect((await cardNames(column(page, 'Qualified')))[0]).toBe(name)
  await expect(column(page, 'Qualified').getByTestId('column-count')).toHaveText(String(Number(before) + 1))
  const deals = await api<{ name: string; stage: string; probability: number }[]>(request, 'get', '/deals')
  expect(deals.find((d) => d.name === name)).toMatchObject({ stage: 'qualified', probability: 20 })
})

test('[R31, R27, R28, R32, K7, C4] dragging to another column changes stage and probability, updates totals at once, and adds a timeline entry', async ({ page, request }) => {
  const name = unique('Drag across')
  const deal = await api<{ id: number }>(request, 'post', '/deals', { name, value: 50000, stage: 'new', close_date: '2027-05-01' })
  await page.goto('/pipeline')
  const totalsBefore = await page.getByTestId('open-totals').textContent()
  const newTotals = await column(page, 'New').getByTestId('column-totals').textContent()

  await drag(page, card(page, name), column(page, 'Proposal').getByTestId('column-header'), 'bottom')
  await expect(card(page, name)).toBeVisible()
  await expect(column(page, 'Proposal').getByRole('link', { name, exact: true })).toBeVisible()
  // Totals change straight away: New loses $50,000; open expected revenue goes up by 35% of $50,000.
  await expect(column(page, 'New').getByTestId('column-totals')).not.toHaveText(newTotals!)
  const openExpectedBefore = dollars(totalsBefore!.split('·')[1])
  await expect.poll(async () => dollars((await page.getByTestId('open-totals').textContent())!.split('·')[1])).toBe(openExpectedBefore + 17500)

  // The deals list shows the new stage and probability.
  await page.goto('/deals')
  await search(page).fill(name)
  await expect(page.getByRole('row').filter({ hasText: name })).toContainText('Proposal')
  await expect(page.getByRole('row').filter({ hasText: name })).toContainText('40%')
  await page.goto(`/deals/${deal.id}`)
  await expect(page.getByRole('list', { name: 'Timeline' })).toContainText('Moved from New to Proposal')
})

test('[R30, C4] a card dropped higher or lower in its own column stays there after a reload', async ({ page, request }) => {
  const names = [unique('Order A'), unique('Order B'), unique('Order C')]
  for (const n of [...names].reverse()) await api(request, 'post', '/deals', { name: n, value: 1000, stage: 'negotiation', close_date: '2027-05-01' })
  await page.goto('/pipeline')
  const col = column(page, 'Negotiation')
  expect((await cardNames(col)).slice(0, 3)).toEqual(names)

  // C above A (to the top), then A below B.
  await drag(page, card(page, names[2]), card(page, names[0]), 'top')
  await expect.poll(async () => (await cardNames(col)).slice(0, 3)).toEqual([names[2], names[0], names[1]])
  await drag(page, card(page, names[0]), card(page, names[1]), 'bottom')
  await expect.poll(async () => (await cardNames(col)).slice(0, 3)).toEqual([names[2], names[1], names[0]])
  await page.waitForLoadState('networkidle')
  await page.reload()
  expect((await cardNames(column(page, 'Negotiation'))).slice(0, 3)).toEqual([names[2], names[1], names[0]])
})

test('[R30, C4] a card dropped in the middle of another column stays there after a reload', async ({ page, request }) => {
  const names = [unique('Mid A'), unique('Mid B')]
  for (const n of [...names].reverse()) await api(request, 'post', '/deals', { name: n, value: 1000, stage: 'qualified', close_date: '2027-05-01' })
  const mover = unique('Mid mover')
  await api(request, 'post', '/deals', { name: mover, value: 1000, stage: 'new', close_date: '2027-05-01' })
  await page.goto('/pipeline')
  await drag(page, card(page, mover), card(page, names[1]), 'top')
  await expect.poll(async () => (await cardNames(column(page, 'Qualified'))).slice(0, 3)).toEqual([names[0], mover, names[1]])
  await page.waitForLoadState('networkidle')
  await page.reload()
  expect((await cardNames(column(page, 'Qualified'))).slice(0, 3)).toEqual([names[0], mover, names[1]])
})

test('[R35, C4] dragging works with the keyboard: Space, arrows, Space', async ({ page, request }) => {
  const names = [unique('Key A'), unique('Key B')]
  for (const n of [...names].reverse()) await api(request, 'post', '/deals', { name: n, value: 1000, stage: 'proposal', close_date: '2027-05-01' })
  await page.goto('/pipeline')
  await card(page, names[0]).focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(200)
  await page.keyboard.press('Space')
  await expect.poll(async () => (await cardNames(column(page, 'Proposal'))).slice(0, 2)).toEqual([names[1], names[0]])

  // Across columns: right arrow moves it to Negotiation.
  await card(page, names[0]).focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(200)
  await page.keyboard.press('Space')
  await expect(column(page, 'Negotiation').getByRole('link', { name: names[0], exact: true })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.reload()
  await expect(column(page, 'Negotiation').getByRole('link', { name: names[0], exact: true })).toBeVisible()
})

test('[R31, R28, K7, C4] dragging to Won sets today\'s close date and leaves the deal out of the open totals', async ({ page, request }) => {
  const name = unique('Win it')
  const deal = await api<{ id: number }>(request, 'post', '/deals', { name, value: 40000, stage: 'negotiation', close_date: '2027-08-01' })
  await page.goto('/pipeline')
  const before = await api<Pipeline>(request, 'get', '/pipeline')
  await drag(page, card(page, name), column(page, 'Won').getByTestId('column-header'), 'bottom')
  await expect(column(page, 'Won').getByRole('link', { name, exact: true })).toBeVisible()
  await expect.poll(async () => dollars((await page.getByTestId('open-totals').textContent())!.split('·')[0])).toBe(before.totals.open_value - 40000)
  await page.waitForLoadState('networkidle')
  const after = await api<{ stage: string; probability: number; close_date: string }>(request, 'get', `/deals/${deal.id}`)
  expect(after).toMatchObject({ stage: 'won', probability: 100, close_date: todayIso() })
})

test('[R29, R34, C4] cards show their fields, late cards show Late, and clicking a card opens the deal', async ({ page, request }) => {
  const pipeline = await api<{ columns: { deals: { id: number; name: string; late: boolean; value: number }[] }[] }>(request, 'get', '/pipeline')
  const late = pipeline.columns.flatMap((c) => c.deals).find((d) => d.late)!
  await page.goto('/pipeline')
  await expect(card(page, late.name).first()).toContainText('Late')
  await expect(card(page, late.name).first()).toContainText(`$${late.value.toLocaleString('en-US')}`)
  const name = unique('Click me')
  const deal = await api<{ id: number }>(request, 'post', '/deals', { name, value: 1000, stage: 'lost', close_date: '2026-01-01' })
  await page.reload()
  // Click the card body, not the name link.
  await card(page, name).locator('div').last().click()
  await expect(page).toHaveURL(new RegExp(`/deals/${deal.id}$`))
})

test('[R27, R28] six columns in order, the strip and the header totals', async ({ page }) => {
  await page.goto('/pipeline')
  const headers = await page.getByTestId('column-header').locator('h2').allTextContents()
  expect(headers).toEqual(['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'])
  await expect(page.getByTestId('open-totals')).toContainText('Won and Lost not counted')
  await expect(page.getByTestId('summary-strip').locator('[data-stage]')).toHaveCount(4)
  await expect(column(page, 'Won').getByTestId('column-totals')).not.toContainText('exp.')
  await expect(column(page, 'New').getByTestId('column-totals')).toContainText('exp.')
})
