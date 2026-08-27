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
  clienteFormSchema,
  type ClienteFormValues,
} from "@/lib/validations/cliente";
import { createCliente, updateCliente } from "@/app/actions/clientes";
import type { Cliente } from "@/types/database";

type ClienteFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  cliente?: Cliente;
};

const emptyValues: ClienteFormValues = { nome: "" };

export function ClienteFormDialog({
  open,
  onOpenChange,
  mode,
  cliente,
}: ClienteFormDialogProps) {
  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: cliente ? { nome: cliente.nome } : emptyValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(cliente ? { nome: cliente.nome } : emptyValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cliente]);

  async function onSubmit(values: ClienteFormValues) {
    const result =
      mode === "create"
        ? await createCliente(values)
        : await updateCliente(cliente!.id, values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(mode === "create" ? "Cliente criado." : "Cliente atualizado.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo cliente" : "Editar cliente"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Cadastre um cliente para depois criar projetos vinculados a ele."
              : "Atualize o nome do cliente."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Nexo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Salvando..."
                  : mode === "create"
                    ? "Criar cliente"
                    : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
