import { BrowserRouter } from 'react-router-dom'
import Providers from './providers'
import AppRoutes from './router'

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Providers>
  )
}
