import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Logo from './components/Logo';
import { 
  Heart, 
  BookOpen, 
  Shirt, 
  Trash2, 
  Users, 
  HandHeart,
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin
} from 'lucide-react';

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activities = [
    {
      icon: <Shirt className="w-12 h-12" />,
      title: "Clothes Distribution",
      description: "Providing warm clothing to underprivileged communities during winter seasons and throughout the year.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: <BookOpen className="w-12 h-12" />,
      title: "Books Distribution",
      description: "Distributing educational books and study materials to children in need to support their education.",
      color: "from-green-500 to-green-600"
    },
    {
      icon: <Trash2 className="w-12 h-12" />,
      title: "Cleanliness Drives",
      description: "Organizing community cleanup drives to promote hygiene and environmental awareness.",
      color: "from-yellow-500 to-yellow-600"
    },
    {
      icon: <HandHeart className="w-12 h-12" />,
      title: "Food Distribution",
      description: "Providing nutritious meals to the homeless and those in need through regular food drives.",
      color: "from-red-500 to-red-600"
    },
    {
      icon: <Users className="w-12 h-12" />,
      title: "Health Camps",
      description: "Conducting free health checkup camps and medical assistance for rural communities.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: <Heart className="w-12 h-12" />,
      title: "Elderly Care",
      description: "Supporting senior citizens with companionship, healthcare, and daily necessities.",
      color: "from-pink-500 to-pink-600"
    }
  ];

  const stats = [
    { number: "5000+", label: "People Helped" },
    { number: "200+", label: "Volunteers" },
    { number: "50+", label: "Events Conducted" },
    { number: "10+", label: "Years of Service" }
  ];

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-md z-50">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            <div className="cursor-pointer" onClick={() => scrollToSection('home')}>
              <Logo className="w-10 h-10" showText textClassName="text-2xl font-bold text-gray-800" />
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('home')} className="text-gray-700 hover:text-primary-600 transition-colors font-medium">Home</button>
              <button onClick={() => scrollToSection('about')} className="text-gray-700 hover:text-primary-600 transition-colors font-medium">About</button>
              <button onClick={() => scrollToSection('activities')} className="text-gray-700 hover:text-primary-600 transition-colors font-medium">Activities</button>
              <button onClick={() => scrollToSection('gallery')} className="text-gray-700 hover:text-primary-600 transition-colors font-medium">Gallery</button>
              <button onClick={() => scrollToSection('contact')} className="text-gray-700 hover:text-primary-600 transition-colors font-medium">Contact</button>
              <button onClick={() => scrollToSection('contact')} className="btn-primary">Volunteer Now</button>
            </div>

            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white border-t"
          >
            <div className="container-custom py-4 flex flex-col gap-4">
              <button onClick={() => scrollToSection('home')} className="text-left text-gray-700 hover:text-primary-600 transition-colors font-medium py-2">Home</button>
              <button onClick={() => scrollToSection('about')} className="text-left text-gray-700 hover:text-primary-600 transition-colors font-medium py-2">About</button>
              <button onClick={() => scrollToSection('activities')} className="text-left text-gray-700 hover:text-primary-600 transition-colors font-medium py-2">Activities</button>
              <button onClick={() => scrollToSection('gallery')} className="text-left text-gray-700 hover:text-primary-600 transition-colors font-medium py-2">Gallery</button>
              <button onClick={() => scrollToSection('contact')} className="text-left text-gray-700 hover:text-primary-600 transition-colors font-medium py-2">Contact</button>
              <button onClick={() => scrollToSection('contact')} className="btn-primary w-full">Volunteer Now</button>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-16 min-h-screen flex items-center bg-gradient-to-br from-primary-50 via-white to-orange-50">
        <div className="container-custom section-padding">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Spreading Hope & 
                <span className="text-primary-600"> Kindness</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Sevadeep NGO is dedicated to making a positive impact in society through various community service activities. Join us in our mission to help those in need.
              </p>
              <div className="flex flex-wrap gap-4">
                <button onClick={() => scrollToSection('contact')} className="btn-primary">
                  Join as Volunteer
                </button>
                <button onClick={() => scrollToSection('about')} className="btn-secondary">
                  Learn More
                </button>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="w-full h-96 bg-gradient-to-br from-red-600 via-orange-500 to-amber-500 rounded-3xl shadow-2xl flex items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] rounded-3xl"></div>
                <Logo className="w-48 h-48 drop-shadow-2xl relative z-10" />
              </div>
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-yellow-400 rounded-2xl shadow-lg flex items-center justify-center">
                <HandHeart className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-green-400 rounded-2xl shadow-lg flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-primary-600 py-16">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-primary-100 text-lg">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
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

      {/* Activities Section */}
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

      {/* Gallery Section */}
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

      {/* Contact Section */}
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

      {/* Footer */}
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
    </div>
  );
}

export default App;
