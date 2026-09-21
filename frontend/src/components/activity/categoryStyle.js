import { BookOpen, CalendarHeart, HandHeart, Shirt, Trash2, User, Users } from 'lucide-react'

// Icon and gradient per activity category, matching the landing-page tiles.
export const CATEGORY_STYLES = {
  CLOTHES: { Icon: Shirt, color: 'from-blue-500 to-blue-600' },
  BOOKS: { Icon: BookOpen, color: 'from-green-500 to-green-600' },
  CLEANLINESS: { Icon: Trash2, color: 'from-yellow-500 to-yellow-600' },
  FOOD: { Icon: HandHeart, color: 'from-red-500 to-red-600' },
  HEALTH: { Icon: Users, color: 'from-purple-500 to-purple-600' },
  ELDERLY_CARE: { Icon: User, color: 'from-pink-500 to-pink-600' },
  OTHER: { Icon: CalendarHeart, color: 'from-gray-500 to-gray-600' },
}

export function categoryStyle(category) {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.OTHER
}
