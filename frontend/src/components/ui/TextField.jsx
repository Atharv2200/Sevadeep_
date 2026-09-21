import { forwardRef, useId } from 'react'

const INPUT_CLASSES =
  'w-full px-4 py-3 rounded-lg border bg-white outline-none transition-all focus:ring-2 disabled:bg-gray-100 disabled:text-gray-500'
const VALID = 'border-gray-300 focus:border-primary-600 focus:ring-primary-200'
const INVALID = 'border-red-500 focus:border-red-600 focus:ring-red-200'

export const Input = forwardRef(function Input({ invalid = false, className = '', ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${INPUT_CLASSES} ${invalid ? INVALID : VALID} ${className}`}
      {...props}
    />
  )
})

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`${INPUT_CLASSES} ${VALID} ${className}`} {...props}>
      {children}
    </select>
  )
}

// A labelled input with its hint and error wired up for screen readers.
export const TextField = forwardRef(function TextField({ label, error, hint, id, className = '', ...inputProps }, ref) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedBy = [error && `${inputId}-error`, hint && `${inputId}-hint`].filter(Boolean).join(' ')

  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-gray-700 font-medium mb-2">
        {label}
      </label>
      <Input ref={ref} id={inputId} invalid={Boolean(error)} aria-describedby={describedBy || undefined} {...inputProps} />
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1 text-sm text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
})
