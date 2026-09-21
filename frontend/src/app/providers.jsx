import { AuthProvider } from '../auth/AuthContext'

// App-wide providers. Auth is the only shared state; everything else is local to pages.
export default function Providers({ children }) {
  return <AuthProvider>{children}</AuthProvider>
}
