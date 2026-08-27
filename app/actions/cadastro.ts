"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logEvento } from "@/lib/eventos";
import {
  cadastroFormSchema,
  type CadastroFormValues,
} from "@/lib/validations/cadastro";

type ActionResult = { success: false; error: string };

// Endpoint mais exposto do app — sem sessão nenhuma, aberto pra qualquer um
// na internet. Mensagem de erro genérica de propósito (não revela se um
// e-mail já existe — vira oráculo de enumeração de conta num endpoint
// público, diferente de createEmpresa/createColaborador que só um master/
// admin já autenticado consegue chamar).
const ERRO_GENERICO =
  "Não foi possível concluir o cadastro. Se você já tem uma conta, faça login.";

export async function signUpEmpresa(
  input: CadastroFormValues
): Promise<ActionResult> {
  const ip = await getClientIp();
  const { allowed } = checkRateLimit(`signup:${ip}`, 5, 60 * 60_000);
  if (!allowed) {
    return { success: false, error: "Muitas tentativas. Aguarde um pouco e tente de novo." };
  }

  const parsed = cadastroFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { empresaNome, nome, email, password } = parsed.data;

  // Sem sessão nenhuma ainda — empresas_insert_master exige is_master(),
  // então precisa do client de serviço mesmo pra esse insert (o client
  // normal cairia em RLS default-deny).
  const admin = createAdminClient();

  const { data: empresa, error: empresaError } = await admin
    .from("empresas")
    .insert({ nome: empresaNome })
    .select("id")
    .single();

  if (empresaError || !empresa) {
    console.error("[signUpEmpresa] empresa", empresaError);
    return { success: false, error: ERRO_GENERICO };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome, cargo: "Admin", role: "admin" },
  });

  if (error || !data.user) {
    // Rollback tem que ser com o client de serviço também — sem sessão,
    // um delete pelo client normal cai em RLS silenciosamente (0 linhas,
    // sem erro) e a empresa órfã fica pra sempre.
    await admin.from("empresas").delete().eq("id", empresa.id);
    console.error("[signUpEmpresa] user", error);
    return { success: false, error: ERRO_GENERICO };
  }

  const { error: linkError } = await admin
    .from("profiles")
    .update({ empresa_id: empresa.id })
    .eq("id", data.user.id);

  if (linkError) {
    console.error("[signUpEmpresa] link", linkError);
    return { success: false, error: ERRO_GENERICO };
  }

  // O admin client não tem cookie adapter — não consegue nunca setar
  // sessão. Só o client normal (cookie-aware) faz o login pegar de verdade.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    console.error("[signUpEmpresa] signin", signInError);
    redirect("/login?error=Conta criada. Faça login com a senha que você escolheu.");
  }

  await logEvento("signup");
  redirect("/dashboard");
}
