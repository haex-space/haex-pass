import {
  Key,
  Folder,
  Mail,
  Shield,
  Lock,
  CreditCard,
  ShoppingCart,
  MessageSquare,
  MessageCircle,
  Laptop,
  Briefcase,
  Home,
  Star,
  Heart,
  Tag,
  Bookmark,
  Calendar,
  Clock,
  FileText,
  Gift,
  Phone,
  User,
  Camera,
  Video,
  Music,
  Headphones,
  MapPin,
  Plane,
  Car,
  Ticket,
  Github,
  Wrench,
  Code,
  Server,
  Database,
  Cloud,
  Wifi,
  Lightbulb,
  Rocket,
  Twitter,
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  Tv,
  Apple,
  Globe,
} from 'lucide-vue-next';

export const useIconComponents = () => {
  const iconComponents: Record<string, any> = {
    'key': Key,
    'folder': Folder,
    'folder-lock': Folder,
    'mail': Mail,
    'shield': Shield,
    'lock': Lock,
    'credit-card': CreditCard,
    'shopping-cart': ShoppingCart,
    'message': MessageSquare,
    'message-square': MessageSquare,
    'message-circle': MessageCircle,
    'laptop': Laptop,
    'briefcase': Briefcase,
    'home': Home,
    'star': Star,
    'heart': Heart,
    'tag': Tag,
    'bookmark': Bookmark,
    'calendar': Calendar,
    'clock': Clock,
    'file': FileText,
    'gift': Gift,
    'phone': Phone,
    'user': User,
    'camera': Camera,
    'video': Video,
    'music': Music,
    'headphones': Headphones,
    'map-pin': MapPin,
    'plane': Plane,
    'car': Car,
    'ticket': Ticket,
    'github': Github,
    'wrench': Wrench,
    'code': Code,
    'server': Server,
    'database': Database,
    'cloud': Cloud,
    'wifi': Wifi,
    'lightbulb': Lightbulb,
    'rocket': Rocket,
    'twitter': Twitter,
    'facebook': Facebook,
    'linkedin': Linkedin,
    'instagram': Instagram,
    'youtube': Youtube,
    'tv': Tv,
    'apple': Apple,
    'globe': Globe,
  };

  const icons = Object.keys(iconComponents);

  const getIconComponent = (iconName: string | null | undefined, fallback: any = Key) => {
    if (!iconName) return fallback;
    return iconComponents[iconName] || fallback;
  };

  const getTextColor = (backgroundColor: string) => {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  return {
    iconComponents,
    icons,
    getIconComponent,
    getTextColor,
  };
};
