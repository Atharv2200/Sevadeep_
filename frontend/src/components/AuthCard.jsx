import Logo from './Logo'

// The centred card used by sign-in, registration and password change.
export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
      <div className="text-center mb-6">
        <Logo className="w-14 h-14 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
      </div>
      {children}
      {footer && <div className="mt-6 text-center text-sm text-gray-600">{footer}</div>}
    </div>
  )
}
