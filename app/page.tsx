import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { iniciarAssinatura } from "@/app/actions/assinatura";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function Home() {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect(profile.role === "master" ? "/master" : "/dashboard");
  }

  // Local (npm run dev): pula a tela de "assine agora" e vai direto pro
  // login — essa página institucional só faz sentido em produção, pra
  // visitante de verdade. Em build de produção (Vercel) isso nunca entra.
  if (process.env.NODE_ENV !== "production") {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-4">
      <div className="max-w-md space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">TaskMonster</h1>
        <p className="text-muted-foreground">
          Gestão de demandas e tarefas para equipes.
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Assine agora</CardTitle>
          <CardDescription>
            R$ 19,90/mês. Crie sua empresa assim que o pagamento for confirmado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={iniciarAssinatura}>
            <Button type="submit" className="w-full">
              Assinar — R$ 19,90/mês
            </Button>
          </form>
        </CardContent>
      </Card>

      <Link
        href="/login"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Já tenho uma conta
      </Link>
    </main>
  );
}
