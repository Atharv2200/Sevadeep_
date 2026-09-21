import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Link } from 'react-router-dom'
import { Alert, Button, StatusBadge, TextField } from './index'

describe('Button', () => {
  it('is disabled and busy while loading', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button', { name: /save/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('does not submit forms unless asked to', () => {
    render(<Button>Plain</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('can render as a router link', () => {
    render(
      <MemoryRouter>
        <Button as={Link} to="/register">Join</Button>
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: 'Join' })).toHaveAttribute('href', '/register')
  })
})

describe('TextField', () => {
  it('links the label, hint and error to the input', () => {
    const { rerender } = render(<TextField label="Email" hint="We never share it" />)
    const input = screen.getByLabelText('Email')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).toHaveAccessibleDescription('We never share it')

    rerender(<TextField label="Email" hint="We never share it" error="Enter a valid email address" />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter a valid email address')
  })
})

describe('Alert and StatusBadge', () => {
  it('announces errors assertively and other messages politely', () => {
    const { rerender } = render(<Alert tone="error">Nope</Alert>)
    expect(screen.getByRole('alert')).toHaveTextContent('Nope')
    rerender(<Alert tone="success">Saved</Alert>)
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
  })

  it('labels known statuses and passes unknown ones through', () => {
    const { rerender } = render(<StatusBadge status="SUSPENDED" />)
    expect(screen.getByText('Suspended')).toBeInTheDocument()
    rerender(<StatusBadge status="MYSTERY" />)
    expect(screen.getByText('MYSTERY')).toBeInTheDocument()
  })
})
