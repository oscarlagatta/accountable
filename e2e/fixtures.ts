import { test as base, expect } from '@playwright/test'

type Fixtures = {
  /** Every request the page made to a host other than localhost. */
  externalRequests: string[]
}

/**
 * A page that fails the test on any console error or uncaught page error.
 */
export const test = base.extend<Fixtures>({
  externalRequests: async ({ page }, use) => {
    const external: string[] = []
    page.on('request', (req) => {
      const url = new URL(req.url())
      if (!['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol.startsWith('http')) {
        external.push(req.url())
      }
    })
    await use(external)
  },
  page: async ({ page }, use) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
    })
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
    await use(page)
    expect(errors, 'browser console errors').toEqual([])
  },
})

export { expect }
