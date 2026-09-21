import { AlertCircle, CheckCircle, Info } from 'lucide-react'

const TONES = {
  error: { icon: AlertCircle, classes: 'bg-red-50 border-red-200 text-red-800', role: 'alert' },
  success: { icon: CheckCircle, classes: 'bg-green-50 border-green-200 text-green-800', role: 'status' },
  info: { icon: Info, classes: 'bg-blue-50 border-blue-200 text-blue-800', role: 'status' },
}

export default function Alert({ tone = 'info', title, children, className = '' }) {
  const { icon: Icon, classes, role } = TONES[tone]
  return (
    <div role={role} className={`flex gap-3 rounded-xl border p-4 ${classes} ${className}`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'text-sm mt-1' : ''}>{children}</div>}
      </div>
    </div>
  )
}
