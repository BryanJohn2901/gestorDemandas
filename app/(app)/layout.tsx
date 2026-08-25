import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";


export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();

  // Master não pertence a nenhuma empresa — não deve entrar aqui nem por
  // URL direta.
  if (profile.role === "master") {
    redirect("/master");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={profile.role} />
      <div className="flex flex-1 flex-col">
        <Header profile={profile} />
        <main className="flex-1 bg-muted/20 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
