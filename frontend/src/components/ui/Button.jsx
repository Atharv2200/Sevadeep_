import Spinner from './Spinner'

const VARIANTS = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-md',
  secondary: 'bg-white hover:bg-gray-100 text-primary-600 border-2 border-primary-600',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5',
  lg: 'px-8 py-3',
}

// Renders a <button> by default; pass `as={Link} to="..."` to get a router link
// that looks like a button. `loading` disables the control and shows a spinner.
export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  const isButton = Component === 'button'
  return (
    <Component
      {...(isButton ? { type: 'button', disabled: disabled || loading } : {})}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner className="w-4 h-4" />}
      {children}
    </Component>
  )
}
