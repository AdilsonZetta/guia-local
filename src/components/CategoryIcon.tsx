import {
  Brush,
  Car,
  Droplets,
  Flower2,
  GraduationCap,
  Package,
  Snowflake,
  Zap,
  Hammer,
  HeartPulse,
  Home,
  PartyPopper,
  PawPrint,
  Smartphone,
  Sparkles,
  Tag,
  Star,
  Camera,
  Truck,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS: Record<string, LucideIcon> = {
  star: Star,
  instagram: Camera,
  truck: Truck,
  broom: Brush,
  brush: Brush,
  zap: Zap,
  droplets: Droplets,
  snowflake: Snowflake,
  package: Package,
  'flower-2': Flower2,
  utensils: Utensils,
  sparkles: Sparkles,
  'heart-pulse': HeartPulse,
  hammer: Hammer,
  car: Car,
  'graduation-cap': GraduationCap,
  'paw-print': PawPrint,
  smartphone: Smartphone,
  'party-popper': PartyPopper,
  home: Home,
  tag: Tag,
}

export function CategoryIcon({
  name,
  className,
}: {
  name?: string | null
  className?: string
}) {
  const Icon = (name && ICONS[name]) || Tag
  return <Icon className={cn('h-5 w-5', className)} />
}
