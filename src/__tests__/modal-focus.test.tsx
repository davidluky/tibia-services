import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Confirm">
        <button type="button">First</button>
        <button type="button">Second</button>
      </Modal>
    </>
  )
}

describe('Modal focus management', () => {
  it('moves focus into the dialog on open and restores it on close', () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    trigger.focus()

    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close dialog' }))

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
  })

  it('cycles Tab from the last focusable back to the first', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))

    const close = screen.getByRole('button', { name: 'Close dialog' })
    const second = screen.getByRole('button', { name: 'Second' })
    second.focus()

    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(close)

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(second)
  })
})
