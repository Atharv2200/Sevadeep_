import { categoryStyle } from './categoryStyle'

export default function CategoryIcon({ category, className = 'w-12 h-12' }) {
  const { Icon, color } = categoryStyle(category)
  return (
    <div className={`${className} flex-shrink-0 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white`} aria-hidden="true">
      <Icon className="w-1/2 h-1/2" />
    </div>
  )
}
