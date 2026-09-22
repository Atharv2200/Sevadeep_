import AppShell from '../components/AppShell'

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/activities', label: 'Activities' },
  { to: '/admin/contributions', label: 'Contributions' },
  { to: '/admin/volunteers', label: 'Volunteers' },
  { to: '/admin/admins', label: 'Admins' },
]

export default function AdminLayout() {
  return <AppShell area="Admin" navItems={NAV_ITEMS} />
}
