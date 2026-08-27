"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { STATUS_ORDER, STATUS_CONFIG, PRIORIDADE_CONFIG } from "@/lib/demandas";
import {
  demandaFormSchema,
  type DemandaFormValues,
} from "@/lib/validations/demanda";
import { createDemanda, updateDemanda } from "@/app/actions/demandas";
import type {
  Demanda,
  DemandaPrioridade,
  Profile,
  ProjetoComCliente,
} from "@/types/database";

type DemandaFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  demanda?: Demanda;
  colaboradores: Pick<Profile, "id" | "nome" | "status">[];
  projetos: ProjetoComCliente[];
  onSaved?: (id: string) => void;
};

const emptyValues: DemandaFormValues = {
  titulo: "",
  descricao: "",
  responsavel_id: "",
  status: "a_fazer",
  prioridade: "media",
  prazo: "",
  projeto_id: "",
  link_entrega: "",
};

export function DemandaFormDialog({
  open,
  onOpenChange,
  mode,
  demanda,
  colaboradores,
  projetos,
  onSaved,
}: DemandaFormDialogProps) {
  const router = useRouter();
  const [initialResponsavelId] = useState(demanda?.responsavel_id ?? undefined);

  const form = useForm<DemandaFormValues>({
    resolver: zodResolver(demandaFormSchema),
    defaultValues: demanda
      ? {
          titulo: demanda.titulo,
          descricao: demanda.descricao ?? "",
          responsavel_id: demanda.responsavel_id ?? "",
          status: demanda.status,
          prioridade: demanda.prioridade,
          prazo: demanda.prazo ?? "",
          projeto_id: demanda.projeto_id ?? "",
          link_entrega: demanda.link_entrega ?? "",
        }
      : emptyValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        demanda
          ? {
              titulo: demanda.titulo,
              descricao: demanda.descricao ?? "",
              responsavel_id: demanda.responsavel_id ?? "",
              status: demanda.status,
              prioridade: demanda.prioridade,
              prazo: demanda.prazo ?? "",
              projeto_id: demanda.projeto_id ?? "",
              link_entrega: demanda.link_entrega ?? "",
            }
          : emptyValues
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, demanda]);

  const responsavelOptions = colaboradores.filter(
    (c) => c.status === "ativo" || c.id === initialResponsavelId
  );

  async function onSubmit(values: DemandaFormValues) {
    const result =
      mode === "create"
        ? await createDemanda(values)
        : await updateDemanda(demanda!.id, values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(mode === "create" ? "Demanda criada." : "Demanda atualizada.");
    onOpenChange(false);
    router.refresh();
    if (mode === "create" && result.id) {
      onSaved?.(result.id);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova demanda" : "Editar demanda"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Preencha os dados e atribua a um colaborador."
              : "Atualize os dados da demanda."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Criar arte para campanha X" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Detalhes da demanda (aceita markdown simples)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="responsavel_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {responsavelOptions.map((c) => (
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
                name="projeto_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projeto</FormLabel>
                    <Select
                      value={field.value || "nenhum"}
                      onValueChange={(v) => field.onChange(v === "nenhum" ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="nenhum">Nenhum</SelectItem>
                        {projetos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.cliente?.nome ? `${p.cliente.nome} · ${p.nome}` : p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {projetos.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nenhum projeto cadastrado ainda — cadastre em Clientes.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="link_entrega"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link de entrega</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: https://drive.google.com/..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
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
                        {STATUS_ORDER.map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_CONFIG[status].label}
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
                name="prioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(PRIORIDADE_CONFIG) as DemandaPrioridade[]).map(
                          (p) => (
                            <SelectItem key={p} value={p}>
                              {PRIORIDADE_CONFIG[p].label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prazo"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Prazo</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="h-4 w-4" />
                            {field.value
                              ? format(new Date(`${field.value}T00:00:00`), "dd/MM/yy", {
                                  locale: ptBR,
                                })
                              : "Sem prazo"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          locale={ptBR}
                          selected={
                            field.value ? new Date(`${field.value}T00:00:00`) : undefined
                          }
                          onSelect={(date) =>
                            field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                          }
                        />
                        {field.value && (
                          <div className="border-t p-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={() => field.onChange("")}
                            >
                              Remover prazo
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                    ? "Criar demanda"
                    : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
