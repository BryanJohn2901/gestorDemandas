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
      {/* Nexo é uma empresa-cliente, não a marca da plataforma — placeholder
          até definir o nome de verdade do SaaS. */}
      <span className="text-lg font-semibold tracking-tight">Gestor de Demandas</span>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Criar workspace</CardTitle>
          <CardDescription>
            Crie sua empresa e comece a usar agora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CadastroForm />

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
