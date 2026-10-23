import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Heart,
  CheckCircle,
  DollarSign,
  Sparkles,
  Users,
  Clock,
  ShieldCheck,
  CreditCard,
  QrCode,
  Building2,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { donationsApi } from '../../api/donations'
import { Alert, Button, Card, Spinner, TextField } from '../../components/ui'

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000]

export default function Donate() {
  const { user } = useAuth()

  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const [amount, setAmount] = useState(2500)
  const [customAmount, setCustomAmount] = useState('')
  const [selectedActivity, setSelectedActivity] = useState('')
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [note, setNote] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('UPI')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successReceipt, setSuccessReceipt] = useState(null)

  useEffect(() => {
    let active = true
    donationsApi
      .getSummaryStats()
      .then((data) => {
        if (active) setStats(data)
      })
      .catch((err) => console.error('Failed to load donation stats:', err))
      .finally(() => {
        if (active) setLoadingStats(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (user) {
      if (user.name) setDonorName(user.name)
      if (user.email) setDonorEmail(user.email)
    }
  }, [user])

  const handlePresetSelect = (preset) => {
    setAmount(preset)
    setCustomAmount('')
  }

  const handleCustomChange = (e) => {
    const val = e.target.value
    setCustomAmount(val)
    const num = Number(val)
    if (!isNaN(num) && num > 0) {
      setAmount(num)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const finalAmount = Number(amount)
    if (!finalAmount || finalAmount < 1) {
      setError('Please enter a valid donation amount of at least ₹1.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        amount: finalAmount,
        activity: selectedActivity || undefined,
        note: note ? note.trim() : undefined,
        donorName: donorName ? donorName.trim() : user?.name || undefined,
        donorEmail: donorEmail ? donorEmail.trim() : user?.email || undefined,
      }

      const donation = await donationsApi.create(payload)
      setSuccessReceipt(donation)
      // Refresh stats
      donationsApi.getSummaryStats().then(setStats).catch(() => {})
    } catch (err) {
      setError(err.message || 'Unable to complete donation. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSuccessReceipt(null)
    setAmount(2500)
    setCustomAmount('')
    setNote('')
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Hero Header */}
      <section className="bg-gradient-to-br from-primary-600 via-orange-600 to-amber-600 text-white pt-16 pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-6">
              <Heart className="w-4 h-4 fill-white" />
              Direct Grassroots Impact
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
              Fuel Meaningful Change With Every Rupee
            </h1>
            <p className="text-lg sm:text-xl text-orange-100 max-w-2xl mx-auto leading-relaxed">
              Every donation powers on-the-ground volunteer activities: meals packed, elders visited, blankets distributed, and children mentored with 100% verified proof.
            </p>
          </motion.div>

          {/* Quick Metrics */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <span className="text-xs uppercase tracking-wider text-orange-200 font-semibold block mb-1">
                Total Raised
              </span>
              <span className="text-2xl sm:text-3xl font-bold">
                {loadingStats ? '…' : `₹${(stats?.totalRaised || 0).toLocaleString()}`}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <span className="text-xs uppercase tracking-wider text-orange-200 font-semibold block mb-1">
                Donations Made
              </span>
              <span className="text-2xl sm:text-3xl font-bold">
                {loadingStats ? '…' : stats?.totalDonations || 0}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <span className="text-xs uppercase tracking-wider text-orange-200 font-semibold block mb-1">
                Activities Funded
              </span>
              <span className="text-2xl sm:text-3xl font-bold">
                {loadingStats ? '…' : stats?.activitiesFunded || 0}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <span className="text-xs uppercase tracking-wider text-orange-200 font-semibold block mb-1">
                Verified Proofs
              </span>
              <span className="text-2xl sm:text-3xl font-bold">
                {loadingStats ? '…' : stats?.verifiedCompletions || 0}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 -mt-12 relative z-20">
        {successReceipt ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-8 sm:p-10 shadow-xl border-t-4 border-t-green-500 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Thank You for Your Generous Support!
              </h2>
              <p className="text-gray-600 max-w-lg mx-auto mb-8">
                Your donation has been received and allocated. Our volunteers will put your contribution to work with full photographic verification and impact reporting.
              </p>

              <div className="bg-gray-50 rounded-xl p-6 max-w-md mx-auto text-left space-y-3 border border-gray-200 mb-8">
                <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Receipt Ref</span>
                  <span className="font-mono font-bold text-gray-800">
                    #{successReceipt.id.slice(-8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Amount Contributed</span>
                  <span className="text-lg font-bold text-primary-600">
                    ₹{successReceipt.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Contributor</span>
                  <span className="font-medium text-gray-800">
                    {successReceipt.donor?.name || 'Anonymous Donor'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Allocated To</span>
                  <span className="font-medium text-gray-800">
                    {successReceipt.activity ? successReceipt.activity.title : 'Sevadeep General Impact Fund'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    {successReceipt.status}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                {user ? (
                  <Button as={Link} to="/volunteer/donations" variant="primary">
                    View in My Donations
                  </Button>
                ) : (
                  <Button as={Link} to="/register" variant="primary">
                    Create Volunteer Account
                  </Button>
                )}
                <Button onClick={resetForm} variant="secondary">
                  Make Another Contribution
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <Card className="p-6 sm:p-10 shadow-xl border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && <Alert tone="error">{error}</Alert>}

              {/* 1. Choose Amount */}
              <div>
                <label className="block text-base font-bold text-gray-900 mb-3">
                  1. Select Donation Amount
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
                  {PRESET_AMOUNTS.map((preset) => {
                    const isSelected = amount === preset && !customAmount
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handlePresetSelect(preset)}
                        className={`py-3 px-4 rounded-xl font-bold text-base transition-all border ${
                          isSelected
                            ? 'bg-primary-600 text-white border-primary-600 shadow-md ring-2 ring-primary-200'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400 hover:bg-primary-50/50'
                        }`}
                      >
                        ₹{preset.toLocaleString()}
                      </button>
                    )
                  })}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 font-bold">
                    ₹
                  </div>
                  <input
                    type="number"
                    min="1"
                    placeholder="Or enter a custom amount (e.g. 15000)"
                    value={customAmount}
                    onChange={handleCustomChange}
                    className="w-full pl-8 pr-4 py-3 rounded-lg border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-gray-900"
                  />
                </div>
              </div>

              {/* 2. Choose Cause / Activity */}
              <div>
                <label htmlFor="cause-select" className="block text-base font-bold text-gray-900 mb-2">
                  2. Choose Specific Initiative or Cause
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Direct your contribution to a specific live event, or support the general grassroots fund.
                </p>
                <select
                  id="cause-select"
                  value={selectedActivity}
                  onChange={(e) => setSelectedActivity(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:border-primary-600 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-gray-900"
                >
                  <option value="">🌟 General Community Fund (Allocated where need is highest)</option>
                  {stats?.openActivities &&
                    stats.openActivities.map((act) => (
                      <option key={act.id} value={act.id}>
                        📍 {act.title} ({act.category})
                      </option>
                    ))}
                </select>
              </div>

              {/* 3. Donor Details */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-base font-bold text-gray-900">
                    3. Contributor Information
                  </label>
                  {user && (
                    <span className="text-xs bg-primary-100 text-primary-800 font-medium px-2 py-0.5 rounded-full">
                      Signed in as {user.name || user.email}
                    </span>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <TextField
                    label="Full Name"
                    placeholder="e.g. Ananya Sharma"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                  />
                  <TextField
                    label="Email Address"
                    type="email"
                    placeholder="For receipt & impact updates"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                  />
                </div>

                <div className="mt-4">
                  <TextField
                    label="Personal Note or Dedication (Optional)"
                    multiline
                    rows={2}
                    placeholder="Dedicate this in honor of someone or leave an inspiring message for our volunteers..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>

              {/* 4. Payment Simulation Method */}
              <div>
                <label className="block text-base font-bold text-gray-900 mb-3">
                  4. Payment Method
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                      paymentMethod === 'UPI'
                        ? 'border-primary-600 bg-primary-50 text-primary-900 ring-2 ring-primary-200 font-semibold'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <QrCode className="w-6 h-6 text-primary-600" />
                    <span className="text-sm">UPI / QR Code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Card')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                      paymentMethod === 'Card'
                        ? 'border-primary-600 bg-primary-50 text-primary-900 ring-2 ring-primary-200 font-semibold'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <CreditCard className="w-6 h-6 text-primary-600" />
                    <span className="text-sm">Credit / Debit Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('NetBanking')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                      paymentMethod === 'NetBanking'
                        ? 'border-primary-600 bg-primary-50 text-primary-900 ring-2 ring-primary-200 font-semibold'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <Building2 className="w-6 h-6 text-primary-600" />
                    <span className="text-sm">Net Banking</span>
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-gray-100">
                <Button
                  type="submit"
                  size="lg"
                  loading={submitting}
                  className="w-full justify-center py-4 text-lg font-bold shadow-lg"
                >
                  Confirm & Contribute ₹{Number(amount || 0).toLocaleString()}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-3">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span>Secure 256-bit encryption · Tax receipt issued immediately</span>
                </div>
              </div>
            </form>
          </Card>
        )}

        {/* Transparency Trust Badges */}
        <section className="mt-16 grid sm:grid-cols-3 gap-6 text-center">
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">100% Direct Impact</h3>
            <p className="text-sm text-gray-600">
              Your funds go directly into material kits, rations, and volunteer field gear with zero agency waste.
            </p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">GPS & Photo Verified</h3>
            <p className="text-sm text-gray-600">
              Volunteers check in via QR codes within venue boundaries and submit photos before hours are approved.
            </p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">AI-Powered Reports</h3>
            <p className="text-sm text-gray-600">
              Receive personalized impact letters showing the exact volunteer hours and community milestones you funded.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
