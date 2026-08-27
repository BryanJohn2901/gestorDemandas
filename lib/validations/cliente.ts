import { z } from "zod";

export const clienteFormSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente."),
});

export type ClienteFormValues = z.infer<typeof clienteFormSchema>;
