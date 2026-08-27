import Link from "next/link";
import { signIn } from "@/app/actions/auth";
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


type LoginPageProps = {
  searchParams: Promise<{ error?: string; redirect?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirect || "/dashboard";

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
          <CardTitle className="text-xl">Gestor de Demandas</CardTitle>
          <CardDescription>
            Acesse com as credenciais fornecidas pelo administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signIn} className="space-y-4">
            <input type="hidden" name="redirectTo" value={redirectTo} />

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

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            {params.error && (
              <p className="text-sm text-destructive">{params.error}</p>
            )}

            <SubmitButton pendingText="Entrando..." className="w-full">
              Entrar
            </SubmitButton>
          </form>

          <Link
            href="/forgot-password"
            className="mt-4 block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Esqueci minha senha
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
