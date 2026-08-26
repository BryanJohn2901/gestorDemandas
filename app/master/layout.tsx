import type { ReactNode } from "react";
import { requireMaster } from "@/lib/auth";
import { MasterSidebar } from "@/components/layout/master-sidebar";
import { MasterMobileNav } from "@/components/layout/master-mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

export default async function MasterLayout({ children }: { children: ReactNode }) {
  const profile = await requireMaster();

  return (
    <div className="flex min-h-screen">
      <MasterSidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b bg-background px-4 md:px-6">
          <MasterMobileNav />
          <span className="text-sm font-medium md:hidden">Master</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserMenu profile={profile} />
          </div>
        </header>
        <main className="flex-1 bg-muted/20 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
