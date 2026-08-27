import { z } from "zod";

export const colaboradorFormSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome completo."),
    email: z.string().trim().email("E-mail inválido."),
    cargo: z.string().trim().optional().or(z.literal("")),
    role: z.enum(["admin", "gestor", "colaborador", "cliente"]),
    status: z.enum(["ativo", "inativo"]),
    cliente_id: z.string().optional().or(z.literal("")),
    avatar_url: z
      .string()
      .trim()
      .url("URL inválida.")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.role === "cliente" || (data.cargo ?? "").trim().length > 0, {
    message: "Informe o cargo/área.",
    path: ["cargo"],
  })
  .refine((data) => data.role !== "cliente" || Boolean(data.cliente_id), {
    message: "Selecione o cliente que esta conta representa.",
    path: ["cliente_id"],
  })
  .refine((data) => data.role === "cliente" || !data.cliente_id, {
    message: "Cliente só se aplica à permissão Visualizador.",
    path: ["cliente_id"],
  });

export type ColaboradorFormValues = z.infer<typeof colaboradorFormSchema>;
