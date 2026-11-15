import { expect, test } from '../fixtures'
import { api, choose, columnText, pick, row, rowAction, search, sheet, toast, unique } from '../helpers'

test('[R6, R10, C2] add a lead, a qualified contact and a customer; they are still there after a reload', async ({ page }) => {
  const last = unique('Quill').replace(/\s/g, '')
  await page.goto('/contacts')
  for (const [first, status] of [['Lena', 'Lead'], ['Quinn', 'Qualified'], ['Cara', 'Customer']] as const) {
    await page.getByRole('button', { name: 'Add contact' }).click()
    await sheet(page).getByLabel('First name').fill(first)
    await sheet(page).getByLabel('Last name').fill(last)
    await choose(page, 'Status', status)
    await sheet(page).getByLabel(/Email/).fill(`${first.toLowerCase()}@quill.example.com`)
    if (first === 'Quinn') await pick(page, /Organization/, 'Summit Mutual')
    await sheet(page).getByRole('button', { name: 'Add contact' }).click()
    await toast(page, 'Contact added')
    await expect(sheet(page)).toBeHidden()
  }
  await page.reload()
  await search(page).fill(last)
  await expect(page.getByRole('row')).toHaveCount(4)
  await expect(row(page, `Lena ${last}`)).toContainText('Status: Lead')
  await expect(row(page, `Quinn ${last}`)).toContainText('Status: Qualified')
  await expect(row(page, `Quinn ${last}`)).toContainText('Summit Mutual')
  await expect(row(page, `Cara ${last}`)).toContainText('Status: Customer')
})

test('[R8, R9, R13, K5, C2, C3] search, sort and filter by status', async ({ page }) => {
  await page.goto('/contacts')
  const all = await page.getByRole('row').count()
  const filter = page.getByRole('radiogroup', { name: 'Status' })
  await filter.getByRole('radio', { name: 'Customer' }).click()
  const customers = await page.getByRole('row').count()
  expect(customers).toBeLessThan(all)
  for (const status of await columnText(page, 5)) expect(status).toBe('Status: Customer')

  await search(page).fill('summit')
  for (const org of await columnText(page, 1)) expect(org).toBe('Summit Mutual')
  await filter.getByRole('radio', { name: 'All' }).click()
  await search(page).fill('')

  await page.getByRole('button', { name: 'Organization' }).click()
  const orgs = (await columnText(page, 1)).filter((o) => o !== 'None')
  expect(orgs).toEqual([...orgs].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })))
  await page.getByRole('button', { name: /Organization/ }).click()
  await expect(page.getByRole('columnheader', { name: /Organization/ })).toHaveAttribute('aria-sort', 'descending')
})

test('[R11, R12, C2] edit and delete a contact, checked after a reload', async ({ page, request }) => {
  const last = unique('Vance').replace(/\s/g, '')
  const c = await api<{ id: number }>(request, 'post', '/contacts', { first_name: 'Ola', last_name: last, status: 'lead' })
  await api(request, 'post', '/activities', { kind: 'note', contact_id: c.id, description: 'First chat' })
  await api(request, 'post', '/deals', { name: unique('Vance deal'), contact_id: c.id, value: 500, close_date: '2027-01-01' })

  await page.goto('/contacts')
  await search(page).fill(last)
  await rowAction(page, `Ola ${last}`, 'Edit')
  await choose(page, 'Status', 'Customer')
  await sheet(page).getByLabel(/Job title/).fill('Head of Digital')
  await sheet(page).getByRole('button', { name: 'Save' }).click()
  await toast(page, 'Contact saved')
  await page.reload()
  await search(page).fill(last)
  await expect(row(page, `Ola ${last}`)).toContainText('Status: Customer')
  await expect(row(page, `Ola ${last}`)).toContainText('Head of Digital')

  await rowAction(page, `Ola ${last}`, 'Delete')
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText(`Delete Ola ${last}?`)
  await expect(dialog).toContainText('1 deal will have no main contact.')
  await expect(dialog).toContainText('1 activity will be deleted.')
  await dialog.getByRole('button', { name: 'Delete' }).click()
  await toast(page, 'Contact deleted')
  await page.reload()
  await search(page).fill(last)
  await expect(page.getByText(`No contacts match "${last}"`)).toBeVisible()
})

test('[R16, C3] the contact page shows its organization, deals and timeline', async ({ page, request }) => {
  const org = await api<{ id: number }>(request, 'post', '/organizations', { name: unique('Larch Clinics') })
  const c = await api<{ id: number; name: string }>(request, 'post', '/contacts', { first_name: 'Mae', last_name: unique('Ito').replace(/\s/g, ''), organization_id: org.id, status: 'qualified', job_title: 'Practice Manager' })
  const deal = await api<{ id: number; name: string }>(request, 'post', '/deals', { name: unique('Larch portal'), organization_id: org.id, contact_id: c.id, value: 9000, close_date: '2027-01-01' })
  await api(request, 'post', '/activities', { kind: 'call', contact_id: c.id, description: 'Discovery call' })

  await page.goto(`/contacts/${c.id}`)
  await expect(page.getByRole('heading', { level: 1, name: c.name })).toBeVisible()
  await expect(page.getByText('Status: Qualified').first()).toBeVisible()
  await expect(page.getByRole('link', { name: /Larch Clinics/ }).first()).toHaveAttribute('href', `/organizations/${org.id}`)
  await expect(page.getByRole('list', { name: 'Deals' }).getByRole('link', { name: deal.name })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Timeline' })).toContainText('Discovery call')

  // Deleting from the record page goes back to the table.
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page).toHaveURL(/\/contacts$/)
  await toast(page, 'Contact deleted')
})
