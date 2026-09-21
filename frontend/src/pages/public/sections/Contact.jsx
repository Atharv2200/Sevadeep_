import { motion } from 'framer-motion'
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter } from 'lucide-react'
import { contactDetails } from '../homeContent'

const INPUT_CLASSES =
  'w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-200 outline-none transition-all'
const SOCIAL_LINK_CLASSES =
  'w-12 h-12 bg-primary-600 hover:bg-primary-700 rounded-xl flex items-center justify-center text-white transition-colors'

function ContactItem({ icon: Icon, title, lines }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600">
          {lines.map((line, index) => (
            <span key={line}>
              {index > 0 && <br />}
              {line}
            </span>
          ))}
        </p>
      </div>
    </div>
  )
}

export default function Contact() {
  return (
    <section id="contact" className="section-padding bg-gradient-to-br from-primary-50 to-orange-50">
      <div className="container-custom">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Get In Touch</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">Join us in making a difference. Contact us to volunteer or support our cause.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12">
          <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="space-y-8">
            <ContactItem icon={MapPin} title="Address" lines={contactDetails.address} />
            <ContactItem icon={Phone} title="Phone" lines={contactDetails.phones} />
            <ContactItem icon={Mail} title="Email" lines={contactDetails.emails} />

            <div className="flex gap-4 pt-4">
              <a href="#" aria-label="Facebook" className={SOCIAL_LINK_CLASSES}>
                <Facebook className="w-6 h-6" />
              </a>
              <a href="#" aria-label="Twitter" className={SOCIAL_LINK_CLASSES}>
                <Twitter className="w-6 h-6" />
              </a>
              <a href="#" aria-label="Instagram" className={SOCIAL_LINK_CLASSES}>
                <Instagram className="w-6 h-6" />
              </a>
              <a href="#" aria-label="LinkedIn" className={SOCIAL_LINK_CLASSES}>
                <Linkedin className="w-6 h-6" />
              </a>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="bg-white rounded-2xl p-8 shadow-xl">
            <form className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Full Name</label>
                <input type="text" className={INPUT_CLASSES} placeholder="Enter your name" />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Email Address</label>
                <input type="email" className={INPUT_CLASSES} placeholder="Enter your email" />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Phone Number</label>
                <input type="tel" className={INPUT_CLASSES} placeholder="Enter your phone number" />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Message</label>
                <textarea rows="4" className={`${INPUT_CLASSES} resize-none`} placeholder="Tell us how you'd like to help"></textarea>
              </div>
              <button type="submit" className="btn-primary w-full">
                Send Message
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
