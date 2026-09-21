import AppShell from '../components/AppShell'

const NAV_ITEMS = [
  { to: '/volunteer', label: 'Dashboard', end: true },
  { to: '/volunteer/profile', label: 'Profile' },
]

export default function VolunteerLayout() {
  return <AppShell area="Volunteer" navItems={NAV_ITEMS} />
}
