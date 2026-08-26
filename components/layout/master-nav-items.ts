import { Building2, type LucideIcon } from "lucide-react"

export type MasterNavItem = {
  title: string
  href: string
  icon: LucideIcon
}

export const masterNavItems: MasterNavItem[] = [
  { title: "Empresas", href: "/master", icon: Building2 },
]
