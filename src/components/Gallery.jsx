import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

export default function Gallery() {
  return (
    <section id="gallery" className="section-padding bg-white">
      <div className="container-custom">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Our Impact</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Glimpses of our activities and the lives we've touched
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: item * 0.05 }}
              whileHover={{ scale: 1.05 }}
              className={`aspect-square rounded-2xl overflow-hidden shadow-lg ${
                item % 2 === 0 ? 'bg-gradient-to-br from-primary-400 to-primary-600' : 'bg-gradient-to-br from-blue-400 to-blue-600'
              } flex items-center justify-center`}
            >
              <Heart className="w-16 h-16 text-white/80" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}