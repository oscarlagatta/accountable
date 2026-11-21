import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockApi, renderWithProviders } from '@/test/render'
import type { TimelineEntry } from './api'
import { ActivityForm } from './ActivityForm'

const entry: TimelineEntry = {
  id: 7,
  kind: 'call',
  description: 'Intro call',
  occurred_at: '2026-11-10T09:30:00',
  follow_up_date: '2026-11-20',
  done: false,
  from_stage: null,
  to_stage: null,
  contact_id: 3,
  contact_name: 'Ada Lane',
  deal_id: null,
  deal_name: null,
}

describe('ActivityForm', () => {
  it('[R19] logs a call with a follow-up on its contact; when defaults to now', async () => {
    const { calls } = mockApi({ 'POST /activities': { id: 1 } })
    renderWithProviders(<ActivityForm owner={{ kind: 'contact', id: 3 }} />)
    const user = userEvent.setup()
    expect((screen.getByLabelText('When') as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    await user.click(screen.getByRole('button', { name: 'Log activity' }))
    expect(await screen.findByText('Required')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Call' }))
    await user.type(screen.getByLabelText('What happened'), 'Called about the renewal')
    await user.clear(screen.getByLabelText('When'))
    await user.type(screen.getByLabelText('When'), '2026-11-14T09:05')
    await user.type(screen.getByLabelText(/Follow-up date/), '2026-11-20')
    await user.click(screen.getByRole('button', { name: 'Log activity' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0].body).toEqual({
      kind: 'call',
      description: 'Called about the renewal',
      occurred_at: '2026-11-14T09:05:00',
      follow_up_date: '2026-11-20',
      contact_id: 3,
    })
    // The form clears for the next one.
    await waitFor(() => expect(screen.getByLabelText('What happened')).toHaveValue(''))
  })

  it('[R19] logs on a deal', async () => {
    const { calls } = mockApi({ 'POST /activities': { id: 1 } })
    renderWithProviders(<ActivityForm owner={{ kind: 'deal', id: 12 }} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('radio', { name: 'Email' }))
    await user.type(screen.getByLabelText('What happened'), 'Sent pricing')
    await user.click(screen.getByRole('button', { name: 'Log activity' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0].body).toMatchObject({ kind: 'email', deal_id: 12, follow_up_date: null })
  })

  it('[R21] edits an existing activity', async () => {
    const { calls } = mockApi({ 'PATCH /activities/7': { ...entry, description: 'Intro call, went well' } })
    const onDone = vi.fn()
    renderWithProviders(<ActivityForm activity={entry} onDone={onDone} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    expect(screen.getByRole('radio', { name: 'Call' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('When')).toHaveValue('2026-11-10T09:30')
    expect(screen.getByLabelText(/Follow-up date/)).toHaveValue('2026-11-20')
    await user.type(screen.getByLabelText('What happened'), ', went well')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(calls[0]).toMatchObject({ method: 'PATCH', path: '/activities/7' })
    expect(calls[0].body).toEqual({
      kind: 'call',
      description: 'Intro call, went well',
      occurred_at: '2026-11-10T09:30:00',
      follow_up_date: '2026-11-20',
    })
  })

  it('[K14] on the dashboard it asks for a contact or deal first, and logs against the one chosen', async () => {
    const { calls } = mockApi({
      'GET /contacts': [{ id: 3, name: 'Ada Lane', organization_name: 'Acme' }],
      'GET /deals': [{ id: 12, name: 'Fleet pilot', organization_name: 'Acme' }],
      'POST /activities': { id: 1 },
    })
    renderWithProviders(<ActivityForm pickTarget />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('What happened'), 'Check in')
    await user.click(screen.getByRole('button', { name: 'Log activity' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a contact or a deal')
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)

    await user.click(screen.getByRole('combobox', { name: 'On' }))
    await user.click(await screen.findByRole('option', { name: /Fleet pilot/ }))
    await user.click(screen.getByRole('button', { name: 'Log activity' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1))
    expect(calls.find((c) => c.method === 'POST')!.body).toMatchObject({ deal_id: 12, description: 'Check in' })
  })
  it('[K14] on the dashboard it can log against a contact', async () => {
    const { calls } = mockApi({
      'GET /contacts': [{ id: 3, name: 'Ada Lane', organization_name: 'Acme' }],
      'GET /deals': [{ id: 12, name: 'Fleet pilot', organization_name: 'Acme' }],
      'POST /activities': { id: 1 },
    })
    const onDone = vi.fn()
    renderWithProviders(<ActivityForm pickTarget onDone={onDone} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: 'On' }))
    await user.click(await screen.findByRole('option', { name: /Ada Lane/ }))
    await user.click(screen.getByRole('radio', { name: 'Email' }))
    await user.type(screen.getByLabelText('What happened'), 'Sent the deck')
    await user.click(screen.getByRole('button', { name: 'Log activity' }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(calls.find((c) => c.method === 'POST')!.body).toMatchObject({
      contact_id: 3,
      kind: 'email',
      description: 'Sent the deck',
      follow_up_date: null,
    })
    expect(calls.find((c) => c.method === 'POST')!.body).not.toHaveProperty('deal_id')
  })

  it("[R19] shows the server's field errors next to the field, and other errors under the form", async () => {
    mockApi({
      'POST /activities': () =>
        new Response(
          JSON.stringify({
            detail: 'Invalid',
            errors: { description: 'Too long', contact_id: 'That contact was deleted' },
          }),
          { status: 422 },
        ),
    })
    const onDone = vi.fn()
    renderWithProviders(<ActivityForm owner={{ kind: 'contact', id: 3 }} onDone={onDone} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('What happened'), 'A very long note')
    await user.click(screen.getByRole('button', { name: 'Log activity' }))
    expect(await screen.findByText('Too long')).toBeInTheDocument()
    expect(screen.getByText('That contact was deleted')).toBeInTheDocument()
    expect(screen.getByLabelText('What happened')).toHaveValue('A very long note')
    expect(onDone).not.toHaveBeenCalled()
  })

  it('[R19] says when the server cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    renderWithProviders(<ActivityForm owner={{ kind: 'deal', id: 12 }} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('What happened'), 'Called')
    await user.click(screen.getByRole('button', { name: 'Log activity' }))
    expect(
      await screen.findByText('Could not reach the server. Check that Accountable is running.'),
    ).toBeInTheDocument()
  })
})
