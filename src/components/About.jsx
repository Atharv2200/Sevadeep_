import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Users, BookOpen, HandHeart } from 'lucide-react';

export default function About() {
  return (
    <section id="about" className="section-padding bg-white">
      <div className="container-custom">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">About Sevadeep</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A non-profit organization committed to serving humanity and creating positive change in society
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-bold text-gray-900">Our Mission</h3>
            <p className="text-gray-600 leading-relaxed">
              Sevadeep NGO was founded with a simple yet powerful vision: to serve those in need and create a society where everyone has access to basic necessities and opportunities for growth.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We believe that small acts of kindness can create ripples of change. Through our dedicated team of volunteers and supporters, we work tirelessly to bring hope to the underprivileged sections of society.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
                <span className="text-gray-700 font-medium">Community Service</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
                <span className="text-gray-700 font-medium">Education Support</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
                <span className="text-gray-700 font-medium">Healthcare Access</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
                <span className="text-gray-700 font-medium">Environmental Care</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-8 rounded-2xl text-white">
              <Heart className="w-12 h-12 mb-4" />
              <h4 className="text-xl font-bold mb-2">Compassion</h4>
              <p className="text-primary-100 text-sm">Serving with love and empathy</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-8 rounded-2xl text-white mt-8">
              <Users className="w-12 h-12 mb-4" />
              <h4 className="text-xl font-bold mb-2">Community</h4>
              <p className="text-blue-100 text-sm">Building stronger together</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-8 rounded-2xl text-white">
              <BookOpen className="w-12 h-12 mb-4" />
              <h4 className="text-xl font-bold mb-2">Education</h4>
              <p className="text-green-100 text-sm">Empowering through knowledge</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 rounded-2xl text-white mt-8">
              <HandHeart className="w-12 h-12 mb-4" />
              <h4 className="text-xl font-bold mb-2">Service</h4>
              <p className="text-orange-100 text-sm">Dedicated to helping others</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}