import { requireMaster } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ONLINE_JANELA_MS = 5 * 60_000;
const EVENTOS_JANELA_DIAS = 30;

const ACAO_LABEL: Record<string, string> = {
  login: "Login",
  create_demanda: "Criou demanda",
  update_demanda: "Editou demanda",
  update_demanda_status: "Mudou status",
  delete_demanda: "Excluiu demanda",
  create_colaborador: "Criou colaborador",
  view_board: "Abriu o Board",
  view_dashboard: "Abriu o Dashboard",
};

export default async function AtividadePage() {
  await requireMaster();

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, nome, subscription_status")
    .order("nome");

  const planoValor = Number(process.env.ASAAS_PLANO_VALOR ?? "19.90");
  const assinaturasAtivas = (empresas ?? []).filter(
    (e) => e.subscription_status === "ativa"
  ).length;
  const mrr = assinaturasAtivas * planoValor;

  // Master não tem RLS pra ler profiles de outra empresa (de propósito) —
  // usa o client de serviço, só com os campos que essa tela precisa.
  const { data: perfis } = await admin
    .from("profiles")
    .select("id, nome, empresa_id, last_seen_at")
    .not("empresa_id", "is", null)
    .order("nome");

  // Server Component roda de novo a cada request (sem re-render do lado do
  // cliente pra reaproveitar) — Date.now() aqui é seguro apesar do lint.
  // eslint-disable-next-line react-hooks/purity
  const agora = Date.now();
  const desde = new Date(agora - EVENTOS_JANELA_DIAS * 24 * 60 * 60_000).toISOString();
  const { data: eventos } = await supabase
    .from("eventos_uso")
    .select("profile_id, acao")
    .gte("created_at", desde);

  const contagemPorPerfil = new Map<string, Map<string, number>>();
  for (const evento of eventos ?? []) {
    const porAcao = contagemPorPerfil.get(evento.profile_id) ?? new Map<string, number>();
    porAcao.set(evento.acao, (porAcao.get(evento.acao) ?? 0) + 1);
    contagemPorPerfil.set(evento.profile_id, porAcao);
  }

  const perfisPorEmpresa = new Map<string, typeof perfis>();
  for (const perfil of perfis ?? []) {
    if (!perfil.empresa_id) continue;
    const lista = perfisPorEmpresa.get(perfil.empresa_id) ?? [];
    lista.push(perfil);
    perfisPorEmpresa.set(perfil.empresa_id, lista);
  }

  function estaOnline(lastSeenAt: string | null) {
    if (!lastSeenAt) return false;
    return agora - new Date(lastSeenAt).getTime() < ONLINE_JANELA_MS;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Atividade</h1>
        <p className="text-muted-foreground">
          Quem tá online e o que cada usuário mais usa, últimos {EVENTOS_JANELA_DIAS} dias.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receita recorrente (MRR)</CardTitle>
          <CardDescription>
            {assinaturasAtivas} assinatura{assinaturasAtivas === 1 ? "" : "s"} ativa
            {assinaturasAtivas === 1 ? "" : "s"} × R$ {planoValor.toFixed(2).replace(".", ",")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            R$ {mrr.toFixed(2).replace(".", ",")}
            <span className="text-sm font-normal text-muted-foreground">/mês</span>
          </p>
        </CardContent>
      </Card>

      {(empresas ?? []).map((empresa) => {
        const usuarios = perfisPorEmpresa.get(empresa.id) ?? [];
        return (
          <Card key={empresa.id}>
            <CardHeader>
              <CardTitle className="text-base">{empresa.nome}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {usuarios.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem usuários ainda.</p>
              )}
              {usuarios.map((usuario) => {
                const online = estaOnline(usuario.last_seen_at);
                const acoes = contagemPorPerfil.get(usuario.id);
                return (
                  <div
                    key={usuario.id}
                    className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-muted-foreground/30"}`}
                      />
                      <span className="font-medium">{usuario.nome}</span>
                      <Badge variant={online ? "secondary" : "outline"}>
                        {online ? "Online" : "Offline"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {acoes && acoes.size > 0 ? (
                        Array.from(acoes.entries()).map(([acao, count]) => (
                          <Badge key={acao} variant="outline" className="font-normal">
                            {ACAO_LABEL[acao] ?? acao}: {count}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem atividade registrada.</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
