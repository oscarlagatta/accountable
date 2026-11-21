import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState } from 'react'
import { renderWithProviders } from '@/test/render'
import { ConfirmDialog, plural } from './ConfirmDialog'

function Harness({ onConfirm, onClose }: { onConfirm: () => Promise<unknown>; onClose: () => void }) {
  const [open, setOpen] = useState(true)
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) onClose()
      }}
      previewKey={['organizations', 7]}
      loadPreview={async () => ({ name: 'Northwind Logistics', contacts: 2, deals: 3 })}
      consequences={(p) => [
        `${plural(p.contacts, 'contact')} will have no organization.`,
        `${plural(p.deals, 'deal')} will have no organization.`,
      ]}
      onConfirm={onConfirm}
    />
  )
}

describe('ConfirmDialog', () => {
  it('[R12, K1] names the record and gives the linked-record counts', async () => {
    renderWithProviders(<Harness onConfirm={vi.fn()} onClose={vi.fn()} />)
    expect(await screen.findByRole('heading', { name: 'Delete Northwind Logistics?' })).toBeInTheDocument()
    expect(screen.getByText('2 contacts will have no organization.')).toBeInTheDocument()
    expect(screen.getByText('3 deals will have no organization.')).toBeInTheDocument()
  })

  it('[R12] Cancel does nothing', async () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    renderWithProviders(<Harness onConfirm={onConfirm} onClose={onClose} />)
    await screen.findByRole('heading', { name: 'Delete Northwind Logistics?' })
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('[R12, K1] Delete calls the API and closes', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    renderWithProviders(<Harness onConfirm={onConfirm} onClose={onClose} />)
    await screen.findByRole('heading', { name: 'Delete Northwind Logistics?' })
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('[R12] a failed delete says so and stays open', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('Organization not found'))
    renderWithProviders(<Harness onConfirm={onConfirm} onClose={vi.fn()} />)
    await screen.findByRole('heading', { name: 'Delete Northwind Logistics?' })
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Organization not found')).toBeInTheDocument()
  })

  it('[R12] after Delete, the preview of the deleted record is not fetched again', async () => {
    // Reproduces the race seen in the browser: the delete drops the record's queries from the
    // cache while the dialog is still open, and a re-render would refetch the preview (a 404).
    const loadPreview = vi.fn(async () => ({ name: 'Doomed deal' }))
    let tick: () => void = () => {}
    function Open({ expose }: { expose: (rerender: () => void) => void }) {
      const [, setN] = useState(0)
      useEffect(() => expose(() => setN((n) => n + 1)), [expose])
      return (
        <ConfirmDialog
          open
          onOpenChange={() => {}}
          previewKey={['deals', 86]}
          loadPreview={loadPreview}
          consequences={() => []}
          onConfirm={async () => undefined}
        />
      )
    }
    const { client } = renderWithProviders(
      <Open
        expose={(rerender) => {
          tick = rerender
        }}
      />,
    )
    await screen.findByRole('heading', { name: 'Delete Doomed deal?' })
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    client.removeQueries({ queryKey: ['deals', 86] })
    act(() => tick())
    await new Promise((r) => setTimeout(r, 50))
    expect(loadPreview).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: 'Delete Doomed deal?' })).toBeInTheDocument()
  })

  it('[K1] uses singular words for one record', () => {
    expect(plural(1, 'activity', 'activities')).toBe('1 activity')
    expect(plural(5, 'activity', 'activities')).toBe('5 activities')
  })
})
