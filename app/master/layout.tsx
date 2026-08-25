import type { ReactNode } from "react";
import { requireMaster } from "@/lib/auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

export default async function MasterLayout({ children }: { children: ReactNode }) {
  const profile = await requireMaster();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center gap-2 border-b bg-background px-4 md:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG local, next/image bloqueia otimização de SVG */}
        <img
          src="/logo-nexo.svg"
          alt="Nexo"
          width={140}
          height={54}
          className="h-6 w-auto"
        />
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <UserMenu profile={profile} />
        </div>
      </header>
      <main className="flex-1 bg-muted/20 p-4 md:p-6">{children}</main>
    </div>
  );
}
