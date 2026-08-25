import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
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


type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string; sent?: string }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;

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
          <CardTitle className="text-xl">Esqueci minha senha</CardTitle>
          <CardDescription>
            Informe seu e-mail. Se houver uma conta cadastrada, enviaremos um
            link para redefinir a senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {params.sent ? (
            <p className="text-sm text-muted-foreground">
              Se o e-mail informado estiver cadastrado, você vai receber um
              link para redefinir a senha em instantes.
            </p>
          ) : (
            <form action={requestPasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>

              {params.error && (
                <p className="text-sm text-destructive">{params.error}</p>
              )}

              <SubmitButton pendingText="Enviando..." className="w-full">
                Enviar link de redefinição
              </SubmitButton>
            </form>
          )}

          <Link
            href="/login"
            className="mt-4 block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Voltar para o login
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
