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
  cadastroFormSchema,
  type CadastroFormValues,
} from "@/lib/validations/cadastro";
import { signUpEmpresa } from "@/app/actions/cadastro";

const emptyValues: CadastroFormValues = {
  empresaNome: "",
  nome: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function CadastroForm() {
  const form = useForm<CadastroFormValues>({
    resolver: zodResolver(cadastroFormSchema),
    defaultValues: emptyValues,
  });

  async function onSubmit(values: CadastroFormValues) {
    const result = await signUpEmpresa(values);
    // signUpEmpresa redireciona em qualquer caminho de sucesso — só chega
    // aqui de volta se deu erro (redirect() do Next lança, não retorna).
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
          {form.formState.isSubmitting ? "Criando..." : "Criar workspace"}
        </Button>
      </form>
    </Form>
  );
}
