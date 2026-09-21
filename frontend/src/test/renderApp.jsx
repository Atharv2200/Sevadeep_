import { render } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import Providers from '../app/providers'
import AppRoutes from '../app/router'

function LocationDisplay() {
  const location = useLocation()
  return <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>
}

// Renders the real route table with the real providers at `path`. Only the
// network (see mockApi) is faked.
export function renderApp(path = '/') {
  return render(
    <Providers>
      <MemoryRouter initialEntries={[path]}>
        <LocationDisplay />
        <AppRoutes />
      </MemoryRouter>
    </Providers>
  )
}
