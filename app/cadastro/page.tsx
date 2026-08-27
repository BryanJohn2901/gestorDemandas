import Link from "next/link";
import { CadastroForm } from "@/components/cadastro/cadastro-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CadastroPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-4">
      <span className="text-lg font-semibold tracking-tight">TaskMonster</span>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Criar workspace</CardTitle>
          <CardDescription>
            Crie sua empresa e comece a usar agora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CadastroForm />

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Ao criar um workspace, você concorda com os{" "}
            <Link href="/termos" className="underline underline-offset-4 hover:text-foreground">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" className="underline underline-offset-4 hover:text-foreground">
              Política de Privacidade
            </Link>
            .
          </p>

          <Link
            href="/login"
            className="mt-4 block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Já tenho uma conta
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
