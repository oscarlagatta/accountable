import type { APIRequestContext, Locator, Page } from '@playwright/test'
import { expect } from './fixtures'

/** A name no other test uses, so tests that change data don't trip over each other. */
export function unique(label: string) {
  return `${label} ${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
}

export async function api<T>(request: APIRequestContext, method: 'get' | 'post' | 'patch' | 'delete', path: string, data?: unknown): Promise<T> {
  const res = await request[method](`/api${path}`, data === undefined ? undefined : { data })
  expect(res.ok(), `${method.toUpperCase()} ${path}: ${res.status()}`).toBe(true)
  return (res.status() === 204 ? undefined : await res.json()) as T
}

/** Picks an option in a RecordPicker by its label. */
export async function pick(page: Page, label: string | RegExp, option: string) {
  await page.getByRole('combobox', { name: label }).click()
  await page.getByPlaceholder(/^Search/).last().fill(option)
  await page.getByRole('option', { name: new RegExp(escape(option)) }).first().click()
}

/** Chooses an option in a shadcn Select. */
export async function choose(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

export function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function search(page: Page) {
  return page.getByRole('searchbox')
}

/** The table row whose first cell is exactly `name`. */
export function row(page: Page, name: string): Locator {
  return page.getByRole('row').filter({ has: page.getByRole('cell', { name, exact: true }) })
}

/** The text of one column for every visible row. */
export async function columnText(page: Page, index: number) {
  const rows = page.getByRole('row')
  const n = await rows.count()
  const out: string[] = []
  for (let i = 1; i < n; i++) out.push((await rows.nth(i).getByRole('cell').nth(index).textContent()) ?? '')
  return out
}

export function dollars(text: string) {
  return Number(text.replace(/[^0-9-]/g, ''))
}

export async function rowAction(page: Page, name: string, action: 'Edit' | 'Delete') {
  const r = row(page, name).first()
  await r.hover()
  await r.getByRole('button', { name: `${action} ${name}` }).click()
}

export function sheet(page: Page) {
  return page.getByRole('dialog')
}

export function toast(page: Page, text: string) {
  return expect(page.locator('[data-sonner-toast]').filter({ hasText: text }).first()).toBeVisible()
}

export function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function isoInDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
