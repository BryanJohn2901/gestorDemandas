import { type EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RECOVERY_COOKIE } from "@/lib/auth";

// Endpoint pra onde o Supabase manda o usuário depois de clicar no link do
// e-mail (recuperação de senha, convite, etc). O formato do link varia com a
// config do projeto — pode vir "token_hash"+"type" (OTP) ou "code" (PKCE) —
// então tenta os dois em vez de assumir um só.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : token_hash && type
      ? await supabase.auth.verifyOtp({ type, token_hash })
      : { error: new Error("Link sem token_hash/type nem code.") };

  if (!error) {
    if (next === "/update-password") {
      // Marca que essa sessão passou pelo link de e-mail — sem isso, quem
      // já está logado por outro motivo poderia acessar /update-password
      // direto e trocar a senha de qualquer um, sem nunca ter clicado no
      // link de recuperação.
      const cookieStore = await cookies();
      cookieStore.set(RECOVERY_COOKIE, "1", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 10 * 60,
        path: "/",
      });
    }
    redirect(next);
  }

  console.error("[auth/confirm]", error);
  redirect(
    `/login?error=${encodeURIComponent("Link inválido ou expirado. Solicite um novo.")}`
  );
}
