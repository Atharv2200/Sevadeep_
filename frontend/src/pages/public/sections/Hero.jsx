import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, HelpCircle } from 'lucide-react'
import Logo from '../../../components/Logo'
import { useAuth } from '../../../auth/AuthContext'
import { homePathFor } from '../../../lib/constants'

export default function Hero() {
  const { user } = useAuth()
  const cta = user ? { to: homePathFor(user), label: 'Open my dashboard' } : { to: '/register', label: 'Join as Volunteer' }

  return (
    <section id="home" className="pt-16 min-h-screen flex items-center bg-gradient-to-br from-primary-50 via-white to-orange-50">
      <div className="container-custom section-padding">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Spreading Hope &amp;
              <span className="text-primary-600"> Kindness</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Sevadeep NGO is dedicated to making a positive impact in society through various community service activities. Join us in our mission to help those in need.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to={cta.to} className="btn-primary">
                {cta.label}
              </Link>
              <Link to="/#about" className="btn-secondary">
                Learn More
              </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="relative">
            <div className="w-full h-96 bg-gradient-to-br from-red-600 via-orange-500 to-amber-500 rounded-3xl shadow-2xl flex items-center justify-center p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] rounded-3xl"></div>
              <Logo className="w-48 h-48 drop-shadow-2xl relative z-10" />
            </div>
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-yellow-400 rounded-2xl shadow-lg flex items-center justify-center">
              <HelpCircle className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-green-400 rounded-2xl shadow-lg flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
