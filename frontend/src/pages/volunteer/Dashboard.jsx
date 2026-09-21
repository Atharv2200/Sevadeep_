import { motion } from 'framer-motion'
import { Award, Calendar, Clock, Mail, Phone, TrendingUp } from 'lucide-react'
import { volunteersApi } from '../../api/volunteers'
import { Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatDate, formatHours } from '../../lib/format'

function StatCard({ icon: Icon, tone, value, label, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="!p-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tone}`}>
            <Icon className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-gray-600">{label}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export default function Dashboard() {
  const { data, error, loading, reload } = useAsync((signal) => volunteersApi.getMe({ signal }), [])

  if (loading && !data) {
    return (
      <div className="py-20 flex justify-center text-primary-600">
        <Spinner className="w-8 h-8" label="Loading your dashboard…" />
      </div>
    )
  }
  if (error) return <ErrorState error={error} onRetry={reload} />

  const { volunteer, stats } = data

  return (
    <>
      <PageHeader title="Volunteer Dashboard" description="Your profile and your contribution to Sevadeep at a glance" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="mb-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-24 h-24 flex-shrink-0 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-3xl font-bold" aria-hidden="true">
              {volunteer.name.charAt(0)}
            </div>
            <div className="flex-grow">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{volunteer.name}</h2>
              <p className="text-gray-600 mb-4">Volunteer ID: {volunteer.volunteerId}</p>
              <div className="grid sm:grid-cols-3 gap-4 text-gray-600 text-sm">
                <div className="flex items-center gap-2"><Mail className="w-4 h-4" aria-hidden="true" />{volunteer.email}</div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4" aria-hidden="true" />{volunteer.phone}</div>
                <div className="flex items-center gap-2"><Award className="w-4 h-4" aria-hidden="true" />Since {formatDate(volunteer.joinedAt)}</div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <StatCard icon={Clock} tone="bg-primary-100 text-primary-600" value={formatHours(stats.verifiedHours)} label="Verified hours" delay={0} />
        <StatCard icon={Calendar} tone="bg-green-100 text-green-600" value={stats.activitiesAttended} label="Activities attended" delay={0.1} />
        <StatCard icon={Award} tone="bg-yellow-100 text-yellow-600" value={stats.verifiedActivities} label="Verified contributions" delay={0.2} />
      </div>

      <Card>
        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary-600" aria-hidden="true" />
          Recent activity
        </h3>
        <EmptyState
          icon={Clock}
          title="Nothing here yet"
          description="Activities you attend and contributions that are verified will appear here."
        />
      </Card>
    </>
  )
}
