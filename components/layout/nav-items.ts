import {
  LayoutDashboard,
  ListTodo,
  KanbanSquare,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Minhas tarefas", href: "/demandas/minhas", icon: UserCheck },
  { title: "Lista", href: "/demandas", icon: ListTodo },
  { title: "Board", href: "/demandas/board", icon: KanbanSquare },
  { title: "Colaboradores", href: "/colaboradores", icon: Users, adminOnly: true },
];
