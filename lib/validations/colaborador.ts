import { z } from "zod";

export const colaboradorFormSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome completo."),
  email: z.string().trim().email("E-mail inválido."),
  cargo: z.string().trim().min(1, "Informe o cargo/área."),
  role: z.enum(["admin", "colaborador"]),
  status: z.enum(["ativo", "inativo"]),
  avatar_url: z
    .string()
    .trim()
    .url("URL inválida.")
    .optional()
    .or(z.literal("")),
});

export type ColaboradorFormValues = z.infer<typeof colaboradorFormSchema>;
