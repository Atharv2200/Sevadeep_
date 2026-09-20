import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Logo from './Logo';
import { Menu, X } from 'lucide-react';

export default function Navigation({ scrollToSection }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleScroll = (id) => {
    scrollToSection(id);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-md z-50">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          <div className="cursor-pointer" onClick={() => handleScroll('home')}>
            <Logo className="w-10 h-10" showText textClassName="text-2xl font-bold text-gray-800" />
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => handleScroll('home')} className="text-gray-700 hover:text-primary-600 transition-colors font-medium">Home</button>
            <button onClick={() => handleScroll('about')} className="text-gray-700 hover:text-primary-600 transition-colors font-medium">About</button>
            <button onClick={() => handleScroll('activities')} className="text-gray-700 hover:text-primary-600 transition-colors font-medium">Activities</button>
            <button onClick={() => handleScroll('gallery')} className="text-gray-700 hover:text-primary-600 transition-colors font-medium">Gallery</button>
            <button onClick={() => handleScroll('contact')} className="text-gray-700 hover:text-primary-600 transition-colors font-medium">Contact</button>
            <button onClick={() => handleScroll('contact')} className="btn-primary">Volunteer Now</button>
          </div>

          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white border-t"
        >
          <div className="container-custom py-4 flex flex-col gap-4">
            <button onClick={() => handleScroll('home')} className="text-left text-gray-700 hover:text-primary-600 transition-colors font-medium py-2">Home</button>
            <button onClick={() => handleScroll('about')} className="text-left text-gray-700 hover:text-primary-600 transition-colors font-medium py-2">About</button>
            <button onClick={() => handleScroll('activities')} className="text-left text-gray-700 hover:text-primary-600 transition-colors font-medium py-2">Activities</button>
            <button onClick={() => handleScroll('gallery')} className="text-left text-gray-700 hover:text-primary-600 transition-colors font-medium py-2">Gallery</button>
            <button onClick={() => handleScroll('contact')} className="text-left text-gray-700 hover:text-primary-600 transition-colors font-medium py-2">Contact</button>
            <button onClick={() => handleScroll('contact')} className="btn-primary w-full">Volunteer Now</button>
          </div>
        </motion.div>
      )}
    </nav>
  );
}