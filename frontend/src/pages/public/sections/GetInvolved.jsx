import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HeartHandshake } from 'lucide-react'
import { useAuth } from '../../../auth/AuthContext'
import { homePathFor } from '../../../lib/constants'

// No public contact channel (email/phone/social) exists yet, and there is no
// backend to receive messages, so this points people at the one thing the
// platform actually does: sign volunteers up and let them sign in.
export default function GetInvolved() {
  const { user } = useAuth()

  return (
    <section id="get-involved" className="section-padding bg-gradient-to-br from-primary-50 to-orange-50">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
            <HeartHandshake className="w-8 h-8" aria-hidden="true" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Get Involved</h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Sevadeep runs on volunteers. Create an account to see open activities, check in with a scan of a QR
            code, and build a verified record of the hours you give.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {user ? (
              <Link to={homePathFor(user)} className="btn-primary">
                Go to my dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary">
                  Join as a volunteer
                </Link>
                <Link to="/login" className="btn-secondary">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
