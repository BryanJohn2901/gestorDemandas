"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";

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
  colaboradorFormSchema,
  type ColaboradorFormValues,
} from "@/lib/validations/colaborador";
import { createColaborador, updateColaborador } from "@/app/actions/colaboradores";
import type { Cliente, Profile } from "@/types/database";

// Este diálogo só é usado dentro da tela de colaboradores de uma empresa —
// nunca recebe um perfil master (master não pertence a empresa nenhuma).
export type ColaboradorProfile = Omit<Profile, "role"> & {
  role: "admin" | "gestor" | "colaborador" | "cliente";
};

type ColaboradorFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  colaborador?: ColaboradorProfile;
  clientes: Pick<Cliente, "id" | "nome">[];
};

const emptyValues: ColaboradorFormValues = {
  nome: "",
  email: "",
  cargo: "",
  role: "colaborador",
  status: "ativo",
  cliente_id: "",
  avatar_url: "",
};

export function ColaboradorFormDialog({
  open,
  onOpenChange,
  mode,
  colaborador,
  clientes,
}: ColaboradorFormDialogProps) {
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<ColaboradorFormValues>({
    resolver: zodResolver(colaboradorFormSchema),
    defaultValues: colaborador
      ? {
          nome: colaborador.nome,
          email: colaborador.email,
          cargo: colaborador.cargo,
          role: colaborador.role,
          status: colaborador.status,
          cliente_id: colaborador.cliente_id ?? "",
          avatar_url: colaborador.avatar_url ?? "",
        }
      : emptyValues,
  });

  const role = form.watch("role");

  useEffect(() => {
    if (open) {
      // Reset intencional ao reabrir: o diálogo fica montado o tempo todo
      // (só o Radix Dialog interno esconde/mostra), então sem isso o estado
      // da abertura anterior (senha temporária, form) vazaria pra próxima.
      // Remontar via `key` evitaria isso, mas cortaria a animação de saída.
      setTempPassword(null);
      setCopied(false);
      form.reset(
        colaborador
          ? {
              nome: colaborador.nome,
              email: colaborador.email,
              cargo: colaborador.cargo,
              role: colaborador.role,
              status: colaborador.status,
              cliente_id: colaborador.cliente_id ?? "",
              avatar_url: colaborador.avatar_url ?? "",
            }
          : emptyValues
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, colaborador]);

  async function onSubmit(values: ColaboradorFormValues) {
    const result =
      mode === "create"
        ? await createColaborador(values)
        : await updateColaborador(colaborador!.id, values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    if (mode === "create" && result.tempPassword) {
      setTempPassword(result.tempPassword);
      return;
    }

    toast.success("Colaborador atualizado.");
    onOpenChange(false);
  }

  function copyPassword() {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (tempPassword) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conta criada</DialogTitle>
            <DialogDescription>
              Compartilhe a senha temporária abaixo com a pessoa. Ela não será
              exibida novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
            <span className="flex-1">{tempPassword}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={copyPassword}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova conta" : "Editar conta"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "A pessoa recebe uma senha temporária para o primeiro acesso."
              : "Atualize os dados da conta."}
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
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="nome@empresa.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {role !== "cliente" && (
                <FormField
                  control={form.control}
                  name="cargo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo/área</FormLabel>
                      <FormControl>
                        <Input placeholder="Design, Tráfego, Dev..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permissão</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="colaborador">Executor</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="cliente">Cliente (visualizador)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {role === "cliente" && (
              <FormField
                control={form.control}
                name="cliente_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qual cliente</FormLabel>
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
                    {clientes.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nenhum cliente cadastrado ainda — cadastre em Clientes.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {mode === "edit" && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="avatar_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar (URL, opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
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
                {form.formState.isSubmitting
                  ? "Salvando..."
                  : mode === "create"
                    ? "Criar conta"
                    : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
