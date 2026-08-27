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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  projetoFormSchema,
  type ProjetoFormValues,
} from "@/lib/validations/projeto";
import { createProjeto, updateProjeto } from "@/app/actions/projetos";
import type { Cliente, Projeto } from "@/types/database";

type ProjetoFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  projeto?: Projeto;
  clientes: Cliente[];
};

const emptyValues: ProjetoFormValues = { nome: "", cliente_id: "" };

export function ProjetoFormDialog({
  open,
  onOpenChange,
  mode,
  projeto,
  clientes,
}: ProjetoFormDialogProps) {
  const form = useForm<ProjetoFormValues>({
    resolver: zodResolver(projetoFormSchema),
    defaultValues: projeto
      ? { nome: projeto.nome, cliente_id: projeto.cliente_id }
      : emptyValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        projeto ? { nome: projeto.nome, cliente_id: projeto.cliente_id } : emptyValues
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projeto]);

  async function onSubmit(values: ProjetoFormValues) {
    const result =
      mode === "create"
        ? await createProjeto(values)
        : await updateProjeto(projeto!.id, values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(mode === "create" ? "Projeto criado." : "Projeto atualizado.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo projeto" : "Editar projeto"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Vincule o projeto a um cliente já cadastrado."
              : "Atualize os dados do projeto."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do projeto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Site institucional" {...field} />
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
                    ? "Criar projeto"
                    : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
