import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { AguardandoPagamento } from "@/components/criar-empresa/aguardando-pagamento";
import { CriarEmpresaForm } from "@/components/criar-empresa/criar-empresa-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CriarEmpresaPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function CriarEmpresaPage({ searchParams }: CriarEmpresaPageProps) {
  const { token } = await searchParams;

  if (!token) {
    redirect("/");
  }

  const admin = createAdminClient();
  const { data: preCadastro } = await admin
    .from("pre_cadastros")
    .select("status")
    .eq("token", token)
    .maybeSingle();

  if (!preCadastro) {
    redirect("/");
  }

  if (preCadastro.status === "usado") {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-4">
      <span className="text-lg font-semibold tracking-tight">TaskMonster</span>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Criar minha empresa</CardTitle>
          <CardDescription>
            {preCadastro.status === "pago"
              ? "Pagamento confirmado. Finalize seu cadastro abaixo."
              : "Confirmando seu pagamento..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {preCadastro.status === "pago" ? (
            <CriarEmpresaForm token={token} />
          ) : (
            <AguardandoPagamento />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
