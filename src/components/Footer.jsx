import React from 'react';
import Logo from './Logo';
import { Phone, Mail, MapPin } from 'lucide-react';

export default function Footer({ scrollToSection }) {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container-custom">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Logo className="w-10 h-10" showText textClassName="text-2xl font-bold text-white" />
            </div>
            <p className="text-gray-400">
              Spreading hope and kindness through community service and social welfare activities.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><button onClick={() => scrollToSection('home')} className="text-gray-400 hover:text-white transition-colors">Home</button></li>
              <li><button onClick={() => scrollToSection('about')} className="text-gray-400 hover:text-white transition-colors">About</button></li>
              <li><button onClick={() => scrollToSection('activities')} className="text-gray-400 hover:text-white transition-colors">Activities</button></li>
              <li><button onClick={() => scrollToSection('contact')} className="text-gray-400 hover:text-white transition-colors">Contact</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-4">Activities</h4>
            <ul className="space-y-2">
              <li><span className="text-gray-400">Clothes Distribution</span></li>
              <li><span className="text-gray-400">Books Distribution</span></li>
              <li><span className="text-gray-400">Cleanliness Drives</span></li>
              <li><span className="text-gray-400">Health Camps</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-4">Contact Info</h4>
            <ul className="space-y-2 text-gray-400">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                +91 98765 43210
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                contact@sevadeep.org
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                City, State - 123456
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Sevadeep NGO. All rights reserved. Made with ❤️ for humanity.</p>
        </div>
      </div>
    </footer>
  );
}