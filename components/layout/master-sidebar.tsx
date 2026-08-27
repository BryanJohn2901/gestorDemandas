import { MasterNavLinks } from "@/components/layout/master-nav-links";

export function MasterSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        {/* Nexo é uma empresa-cliente da plataforma, não a marca dela —
            placeholder até definir o nome de verdade do SaaS. */}
        <span className="text-sm font-semibold tracking-tight">TaskMonster</span>
      </div>
      <MasterNavLinks />
    </aside>
  );
}
