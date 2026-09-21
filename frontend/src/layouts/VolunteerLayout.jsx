import AppShell from '../components/AppShell'

const NAV_ITEMS = [
  { to: '/volunteer', label: 'Dashboard', end: true },
  { to: '/volunteer/activities', label: 'Activities' },
  { to: '/volunteer/history', label: 'History' },
  { to: '/volunteer/profile', label: 'Profile' },
]

export default function VolunteerLayout() {
  return <AppShell area="Volunteer" navItems={NAV_ITEMS} />
}
