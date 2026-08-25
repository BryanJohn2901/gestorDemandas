import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { updatePassword } from "@/app/actions/auth";
import { RECOVERY_COOKIE } from "@/lib/auth";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


type UpdatePasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function UpdatePasswordPage({
  searchParams,
}: UpdatePasswordPageProps) {
  const params = await searchParams;

  // Só acessível vindo do link de e-mail (app/auth/confirm/route.ts seta
  // esse cookie). Impede que alguém já logado no app chegue aqui direto e
  // troque a senha de outra pessoa sem nunca ter clicado no link.
  const cookieStore = await cookies();
  if (!cookieStore.get(RECOVERY_COOKIE)) {
    redirect(
      `/forgot-password?error=${encodeURIComponent("Acesse pelo link enviado no seu e-mail.")}`
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG local, next/image bloqueia otimização de SVG */}
      <img
        src="/logo-nexo.svg"
        alt="Nexo"
        width={210}
        height={81}
        className="h-9 w-auto"
      />

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Definir nova senha</CardTitle>
          <CardDescription>Escolha uma nova senha de acesso.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            {params.error && (
              <p className="text-sm text-destructive">{params.error}</p>
            )}

            <SubmitButton pendingText="Salvando..." className="w-full">
              Salvar nova senha
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
