import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Profile } from "@/types/database";

export function Header({ profile }: { profile: Profile }) {
  return (
    <header className="flex h-14 items-center gap-2 border-b bg-background px-4 md:px-6">
      <MobileNav role={profile.role} />
      <span className="text-sm font-medium md:hidden">Gestor de Demandas</span>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <UserMenu profile={profile} />
      </div>
    </header>
  );
}
