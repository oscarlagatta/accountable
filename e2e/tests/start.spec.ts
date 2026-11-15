import { expect, test } from '../fixtures'

test('[R1, C1] opening the app lands on the dashboard', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('[R5, K2] fonts are bundled and no request leaves localhost', async ({ page, externalRequests }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready
    return {
      sans: document.fonts.check('600 16px "Instrument Sans Variable"'),
      mono: document.fonts.check('16px "JetBrains Mono Variable"'),
      families: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
    }
  })
  expect(loaded.families.join(',')).toContain('Instrument Sans Variable')
  expect(loaded.families.join(',')).toContain('JetBrains Mono Variable')
  expect(loaded.sans).toBe(true)
  expect(loaded.mono).toBe(true)
  expect(externalRequests).toEqual([])
})

test('[R7, C1] every section opens with sample data', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('open-value')).not.toHaveText('$0')
  await expect(page.getByTestId('follow-up').first()).toBeVisible()
  for (const [path, min] of [['/organizations', 20], ['/contacts', 100], ['/deals', 70]] as const) {
    await page.goto(path)
    await expect(page.getByRole('row').nth(min)).toBeVisible()
  }
  await page.goto('/pipeline')
  await expect(page.getByTestId('deal-card').nth(60)).toBeVisible()
})
