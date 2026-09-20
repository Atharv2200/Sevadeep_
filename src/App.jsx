import React from 'react';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import Stats from './components/Stats';
import About from './components/About';
import Activities from './components/Activities';
import Gallery from './components/Gallery';
import Contact from './components/Contact';
import Footer from './components/Footer';
import { 
  Shirt, 
  BookOpen, 
  Trash2, 
  Users, 
  HandHeart,
  Heart
} from 'lucide-react';

function App() {
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
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation scrollToSection={scrollToSection} />
      <Hero scrollToSection={scrollToSection} />
      <Stats stats={stats} />
      <About />
      <Activities activities={activities} />
      <Gallery />
      <Contact />
      <Footer scrollToSection={scrollToSection} />
    </div>
  );
}

export default App;