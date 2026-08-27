import { z } from "zod";

export const cadastroFormSchema = z
  .object({
    empresaNome: z.string().trim().min(2, "Informe o nome da empresa."),
    nome: z.string().trim().min(2, "Informe seu nome completo."),
    email: z.string().trim().email("E-mail inválido."),
    password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type CadastroFormValues = z.infer<typeof cadastroFormSchema>;
