"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  criarEmpresaFormSchema,
  type CriarEmpresaFormValues,
} from "@/lib/validations/criar-empresa";
import { criarEmpresaPosPagamento } from "@/app/actions/criar-empresa";

const emptyValues: CriarEmpresaFormValues = {
  empresaNome: "",
  nome: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function CriarEmpresaForm({ token }: { token: string }) {
  const form = useForm<CriarEmpresaFormValues>({
    resolver: zodResolver(criarEmpresaFormSchema),
    defaultValues: emptyValues,
  });

  async function onSubmit(values: CriarEmpresaFormValues) {
    const result = await criarEmpresaPosPagamento(token, values);
    // Em caso de sucesso, a action redireciona (não retorna) — só chega
    // aqui de volta se deu erro.
    if (result && !result.success) {
      toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="empresaNome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da empresa</FormLabel>
              <FormControl>
                <Input placeholder="Nome da sua empresa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seu nome</FormLabel>
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
                <Input type="email" autoComplete="email" placeholder="voce@empresa.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar senha</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Criando..." : "Criar minha empresa"}
        </Button>
      </form>
    </Form>
  );
}
