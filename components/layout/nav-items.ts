import {
  LayoutDashboard,
  ListTodo,
  KanbanSquare,
  UserCheck,
  Users,
  Building2,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types/database";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  // Omitido = visível pra qualquer papel não-master (inclusive cliente).
  roles?: UserRole[];
};

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    title: "Minhas tarefas",
    href: "/demandas/minhas",
    icon: UserCheck,
    roles: ["admin", "gestor", "colaborador"],
  },
  { title: "Lista", href: "/demandas", icon: ListTodo },
  {
    title: "Board",
    href: "/demandas/board",
    icon: KanbanSquare,
    roles: ["admin", "gestor", "colaborador"],
  },
  { title: "Colaboradores", href: "/colaboradores", icon: Users, roles: ["admin"] },
  { title: "Clientes", href: "/clientes", icon: Building2, roles: ["admin", "gestor"] },
];
