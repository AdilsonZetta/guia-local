import {
  Car,
  GraduationCap,
  Hammer,
  HeartPulse,
  Home,
  PartyPopper,
  PawPrint,
  Smartphone,
  Sparkles,
  Tag,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS: Record<string, LucideIcon> = {
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
