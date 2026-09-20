import React from 'react';
import { motion } from 'framer-motion';

export default function Activities({ activities }) {
  return (
    <section id="activities" className="section-padding bg-gray-50">
      <div className="container-custom">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Our Activities</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Making a difference through diverse community service initiatives
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activities.map((activity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-8 shadow-lg card-hover"
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${activity.color} rounded-xl flex items-center justify-center text-white mb-6`}>
                {activity.icon}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{activity.title}</h3>
              <p className="text-gray-600 leading-relaxed">{activity.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}