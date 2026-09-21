export default function Card({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component className={`bg-white rounded-2xl shadow-xl p-6 md:p-8 ${className}`} {...props}>
      {children}
    </Component>
  )
}
