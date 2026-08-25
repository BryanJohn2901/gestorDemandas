import { z } from "zod";

export const empresaFormSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da empresa."),
  adminNome: z.string().trim().min(2, "Informe o nome do administrador."),
  adminEmail: z.string().trim().email("E-mail inválido."),
  adminCargo: z.string().trim().min(1, "Informe o cargo do administrador."),
});

export type EmpresaFormValues = z.infer<typeof empresaFormSchema>;

export const empresaRenameSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da empresa."),
});

export type EmpresaRenameValues = z.infer<typeof empresaRenameSchema>;
