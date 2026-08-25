"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  empresaRenameSchema,
  type EmpresaRenameValues,
} from "@/lib/validations/empresa";
import { updateEmpresa } from "@/app/actions/empresas";
import type { Empresa } from "@/types/database";

export function EmpresaRenameDialog({
  empresa,
  open,
  onOpenChange,
}: {
  empresa: Empresa;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<EmpresaRenameValues>({
    resolver: zodResolver(empresaRenameSchema),
    defaultValues: { nome: empresa.nome },
  });

  useEffect(() => {
    if (open) {
      form.reset({ nome: empresa.nome });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, empresa.nome]);

  async function onSubmit(values: EmpresaRenameValues) {
    const result = await updateEmpresa(empresa.id, values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Empresa atualizada.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar empresa</DialogTitle>
          <DialogDescription>Renomeie a empresa.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da empresa</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da empresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Salvando..." : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
