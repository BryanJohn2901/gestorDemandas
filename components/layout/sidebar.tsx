import { NavLinks } from "@/components/layout/nav-links";
import type { UserRole } from "@/types/database";

export function Sidebar({ role }: { role: UserRole }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG local, next/image bloqueia otimização de SVG */}
        <img
          src="/logo-nexo.svg"
          alt="Nexo"
          width={140}
          height={54}
          className="h-6 w-auto"
        />
      </div>
      <NavLinks role={role} />
    </aside>
  );
}
