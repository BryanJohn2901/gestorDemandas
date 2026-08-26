"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MasterNavLinks } from "@/components/layout/master-nav-links";

export function MasterMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 gap-0 bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader className="flex-row items-center gap-2 space-y-0 border-b px-4 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG local, next/image bloqueia otimização de SVG */}
          <img
            src="/logo-nexo.svg"
            alt="Nexo"
            width={140}
            height={54}
            className="h-6 w-auto"
          />
          <SheetTitle className="sr-only">Master</SheetTitle>
        </SheetHeader>
        <MasterNavLinks onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
