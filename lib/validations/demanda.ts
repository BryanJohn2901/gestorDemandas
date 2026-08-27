import { z } from "zod";

export const demandaFormSchema = z.object({
  titulo: z.string().trim().min(2, "Informe o título."),
  descricao: z.string().trim().optional().or(z.literal("")),
  responsavel_id: z.string().min(1, "Selecione um responsável."),
  status: z.enum(["a_fazer", "em_andamento", "em_revisao", "concluido"]),
  prioridade: z.enum(["baixa", "media", "alta", "urgente"]),
  prazo: z.string().optional().or(z.literal("")),
  cliente_projeto: z.string().trim().optional().or(z.literal("")),
  link_entrega: z
    .string()
    .trim()
    .url("Informe um link válido (ex: https://drive.google.com/...).")
    .optional()
    .or(z.literal("")),
});

export type DemandaFormValues = z.infer<typeof demandaFormSchema>;
