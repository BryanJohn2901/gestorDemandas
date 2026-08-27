import { z } from "zod";

export const projetoFormSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do projeto."),
  cliente_id: z.string().min(1, "Selecione um cliente."),
});

export type ProjetoFormValues = z.infer<typeof projetoFormSchema>;
