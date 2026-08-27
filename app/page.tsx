import Link from "next/link";
import { redirect } from "next/navigation";
import {
  KanbanSquare,
  Users,
  Building2,
  Timer,
  Link2,
  ShieldCheck,
  Check,
  ArrowRight,
} from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { iniciarAssinatura } from "@/app/actions/assinatura";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: KanbanSquare,
    title: "Kanban e Lista",
    description:
      "Acompanhe as demandas da equipe em quadro ou em lista, com filtros por status, prioridade e responsável.",
  },
  {
    icon: Building2,
    title: "Clientes e projetos",
    description:
      "Cadastre clientes e os projetos de cada um. Filtre tudo que um cliente precisa num clique.",
  },
  {
    icon: ShieldCheck,
    title: "Permissões por papel",
    description:
      "Administrador, Gestor, Executor e Cliente (visualizador externo) — cada um vê só o que precisa ver.",
  },
  {
    icon: Timer,
    title: "Tempo trabalhado",
    description:
      "Timer de iniciar/pausar em cada demanda, pra ter uma ideia real de quanto tempo cada tarefa leva.",
  },
  {
    icon: Link2,
    title: "Link de entrega",
    description:
      "Cada demanda guarda o link do Drive, Milanote ou onde o resultado deve ser entregue.",
  },
  {
    icon: Users,
    title: "Toda a equipe num lugar só",
    description:
      "Convide colaboradores, acompanhe quem está sobrecarregado e centralize a comunicação do time.",
  },
];

const PASSOS = [
  {
    numero: "1",
    titulo: "Assine",
    descricao: "R$ 19,90/mês, sem contrato de fidelidade. Cancele quando quiser.",
  },
  {
    numero: "2",
    titulo: "Crie sua empresa",
    descricao: "Assim que o pagamento confirmar, você monta seu workspace.",
  },
  {
    numero: "3",
    titulo: "Convide o time",
    descricao: "Adicione colaboradores, cadastre clientes e comece a organizar as demandas.",
  },
];

const BENEFICIOS_PLANO = [
  "Demandas, Kanban e Lista ilimitados",
  "Clientes e projetos ilimitados",
  "Controle de acesso por papel (Admin, Gestor, Executor, Cliente)",
  "Timer de tempo trabalhado por demanda",
  "Colaboradores ilimitados",
];

function ContratarButton({
  className,
  size = "default",
}: {
  className?: string;
  size?: "default" | "lg";
}) {
  return (
    <form action={iniciarAssinatura}>
      <Button type="submit" size={size} className={className}>
        Contratar
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}

type HomeProps = {
  searchParams: Promise<{ erro?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect(profile.role === "master" ? "/master" : "/dashboard");
  }

  // Local (npm run dev): pula a landing e vai direto pro login — essa
  // página institucional só faz sentido em produção, pra visitante real.
  if (process.env.NODE_ENV !== "production") {
    redirect("/login");
  }

  const { erro } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="text-lg font-semibold tracking-tight">TaskMonster</span>
          <nav className="flex items-center gap-6">
            <a
              href="#recursos"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:block"
            >
              Recursos
            </a>
            <a
              href="#preco"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:block"
            >
              Preço
            </a>
            <Link
              href="/login"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:block"
            >
              Entrar
            </Link>
            <ContratarButton />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
          {erro && (
            <div className="mx-auto mb-8 max-w-md rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erro}
            </div>
          )}
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Gestão de demandas sem bagunça de planilha
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Organize tarefas, clientes e projetos da sua equipe num só lugar —
            com controle de acesso por papel e tempo trabalhado medido de
            verdade.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ContratarButton size="lg" />
            <a
              href="#recursos"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Ver recursos
            </a>
          </div>
        </section>

        {/* Recursos */}
        <section id="recursos" className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                Tudo que o time precisa pra entregar no prazo
              </h2>
              <p className="mt-3 text-muted-foreground">
                Construído pra agências e times de operação — não pra encher
                de recurso que ninguém usa.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <Card key={feature.title}>
                  <CardContent className="space-y-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-medium">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="border-t border-border/60">
          <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight">
              Como funciona
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {PASSOS.map((passo) => (
                <div key={passo.numero} className="text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {passo.numero}
                  </div>
                  <h3 className="mt-4 font-medium">{passo.titulo}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {passo.descricao}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Preço */}
        <section id="preco" className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                Um plano, sem pegadinha
              </h2>
              <p className="mt-3 text-muted-foreground">
                Um preço só, tudo incluso. Sem limite de demandas escondido.
              </p>
            </div>

            <Card className="mx-auto mt-10 max-w-sm">
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-semibold tracking-tight">
                    R$ 19,90
                    <span className="text-base font-normal text-muted-foreground">
                      /mês
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cancele quando quiser, sem multa.
                  </p>
                </div>

                <ul className="space-y-2.5 text-sm">
                  {BENEFICIOS_PLANO.map((beneficio) => (
                    <li key={beneficio} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{beneficio}</span>
                    </li>
                  ))}
                </ul>

                <ContratarButton className="w-full" size="lg" />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span>&copy; {new Date().getFullYear()} TaskMonster</span>
          <div className="flex items-center gap-6">
            <Link href="/termos" className="hover:text-foreground">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="hover:text-foreground">
              Privacidade
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Entrar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
