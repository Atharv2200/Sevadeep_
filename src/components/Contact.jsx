import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

export default function Contact() {
  return (
    <section id="contact" className="section-padding bg-gradient-to-br from-primary-50 to-orange-50">
      <div className="container-custom">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Get In Touch</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join us in making a difference. Contact us to volunteer or support our cause.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Address</h3>
                <p className="text-gray-600">123 NGO Street, Community Center<br/>City, State - 123456</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Phone</h3>
                <p className="text-gray-600">+91 98765 43210<br/>+91 87654 32109</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Email</h3>
                <p className="text-gray-600">contact@sevadeep.org<br/>info@sevadeep.org</p>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <a href="#" className="w-12 h-12 bg-primary-600 hover:bg-primary-700 rounded-xl flex items-center justify-center text-white transition-colors">
                <Facebook className="w-6 h-6" />
              </a>
              <a href="#" className="w-12 h-12 bg-primary-600 hover:bg-primary-700 rounded-xl flex items-center justify-center text-white transition-colors">
                <Twitter className="w-6 h-6" />
              </a>
              <a href="#" className="w-12 h-12 bg-primary-600 hover:bg-primary-700 rounded-xl flex items-center justify-center text-white transition-colors">
                <Instagram className="w-6 h-6" />
              </a>
              <a href="#" className="w-12 h-12 bg-primary-600 hover:bg-primary-700 rounded-xl flex items-center justify-center text-white transition-colors">
                <Linkedin className="w-6 h-6" />
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-white rounded-2xl p-8 shadow-xl"
          >
            <form className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Full Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Email Address</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Phone Number</label>
                <input 
                  type="tel" 
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                  placeholder="Enter your phone number"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Message</label>
                <textarea 
                  rows="4"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-200 outline-none transition-all resize-none"
                  placeholder="Tell us how you'd like to help"
                ></textarea>
              </div>
              <button type="submit" className="btn-primary w-full">
                Send Message
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}