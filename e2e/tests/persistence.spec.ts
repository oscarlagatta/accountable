import { spawn, execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '../fixtures'
import { api, search, unique } from '../helpers'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const env = { ...process.env, ACCOUNTABLE_DB: process.env.ACCOUNTABLE_DB! }

async function waitFor(url: string) {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`${url} did not start`)
}

test('[R6, C2] changes survive a server restart', async ({ page }) => {
  const name = unique('Survivor Co')
  await page.goto('/organizations')
  await page.getByRole('button', { name: 'Add organization' }).click()
  await page.getByRole('dialog').getByLabel('Name').fill(name)
  await page.getByRole('dialog').getByRole('button', { name: 'Add organization' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()

  // A fresh backend process on the same database file sees the change.
  const server = spawn('uv', ['run', 'uvicorn', 'backend.app.main:app', '--port', '8199'], { cwd: root, env, stdio: 'ignore', shell: process.platform === 'win32' })
  try {
    await waitFor('http://127.0.0.1:8199/api/health')
    const orgs = (await (await fetch('http://127.0.0.1:8199/api/organizations')).json()) as { name: string }[]
    expect(orgs.map((o) => o.name)).toContain(name)
  } finally {
    server.kill()
  }
})

test('[R3, C2] npm run seed brings back the sample data, while the app is running', async ({ page, request }) => {
  const name = unique('Gone after reset')
  await api(request, 'post', '/organizations', { name })
  execFileSync('npm', ['run', 'seed'], { cwd: root, env, stdio: 'ignore', shell: process.platform === 'win32' })
  const orgs = await api<{ name: string }[]>(request, 'get', '/organizations')
  expect(orgs.map((o) => o.name)).not.toContain(name)
  expect(orgs).toHaveLength(25)
  await page.goto('/organizations')
  await search(page).fill(name)
  await expect(page.getByText(`No organizations match "${name}"`)).toBeVisible()
  expect((await api<unknown[]>(request, 'get', '/deals')).length).toBe(80)
})
