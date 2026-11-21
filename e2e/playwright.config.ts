import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

export const API_PORT = 8100
export const WEB_PORT = 5180
export const DB_PATH = path.join(here, '.data', 'test.db')

// Set here rather than in npm scripts so it works on every platform.
process.env.ACCOUNTABLE_DB = DB_PATH

export default defineConfig({
  testDir: './tests',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  // In CI, also write an HTML report (e2e/playwright-report) to upload when the run fails.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    channel: 'chrome',
    headless: true,
    viewport: { width: 1488, height: 1000 },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `uv run python -m backend.app.crm.seed && uv run uvicorn backend.app.main:app --port ${API_PORT}`,
      cwd: root,
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      env: { ACCOUNTABLE_DB: DB_PATH },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npm run dev --workspace frontend',
      cwd: root,
      url: `http://localhost:${WEB_PORT}`,
      env: { PORT: String(WEB_PORT), API_PORT: String(API_PORT) },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
