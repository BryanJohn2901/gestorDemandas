"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Guarda de hidratação: o tema real só existe no cliente (next-themes lê
  // localStorage), então o primeiro render do servidor precisa ficar neutro.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative">
          {mounted ? (
            <>
              <Sun className="h-4 w-4 scale-100 dark:scale-0" />
              <Moon className="absolute h-4 w-4 scale-0 dark:scale-100" />
            </>
          ) : (
            <Sun className="h-4 w-4" />
          )}
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setTheme("light")}>Claro</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("dark")}>Escuro</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("system")}>Sistema</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
