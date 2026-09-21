import { BookOpen, HandHeart, Shirt, Trash2, User, Users } from 'lucide-react'

// Static marketing content for the public landing page.

export const activityCategories = [
  {
    Icon: Shirt,
    title: 'Clothes Distribution',
    description: 'Providing warm clothing to underprivileged communities during winter seasons and throughout the year.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    Icon: BookOpen,
    title: 'Books Distribution',
    description: 'Distributing educational books and study materials to children in need to support their education.',
    color: 'from-green-500 to-green-600',
  },
  {
    Icon: Trash2,
    title: 'Cleanliness Drives',
    description: 'Organizing community cleanup drives to promote hygiene and environmental awareness.',
    color: 'from-yellow-500 to-yellow-600',
  },
  {
    Icon: HandHeart,
    title: 'Food Distribution',
    description: 'Providing nutritious meals to the homeless and those in need through regular food drives.',
    color: 'from-red-500 to-red-600',
  },
  {
    Icon: Users,
    title: 'Health Camps',
    description: 'Conducting free health checkup camps and medical assistance for rural communities.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    Icon: User,
    title: 'Elderly Care',
    description: 'Supporting senior citizens with companionship, healthcare, and daily necessities.',
    color: 'from-pink-500 to-pink-600',
  },
]

export const impactStats = [
  { number: '5000+', label: 'People Helped' },
  { number: '200+', label: 'Volunteers' },
  { number: '50+', label: 'Events Conducted' },
  { number: '10+', label: 'Years of Service' },
]

export const galleryImages = [
  { src: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=400&fit=crop', alt: 'Food Distribution' },
  { src: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=400&h=400&fit=crop', alt: 'Education Support' },
  { src: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=400&h=400&fit=crop', alt: 'Healthcare Camp' },
  { src: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=400&h=400&fit=crop', alt: 'Community Service' },
  { src: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400&h=400&fit=crop', alt: 'Clothing Distribution' },
  { src: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&h=400&fit=crop', alt: 'Elderly Care' },
  { src: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=400&fit=crop', alt: 'Cleanliness Drive' },
  { src: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop', alt: 'Volunteer Work' },
]

export const contactDetails = {
  address: ['123 NGO Street, Community Center', 'City, State - 123456'],
  phones: ['+91 98765 43210', '+91 87654 32109'],
  emails: ['contact@sevadeep.org', 'info@sevadeep.org'],
}
