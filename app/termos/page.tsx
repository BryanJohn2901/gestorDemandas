export const metadata = {
  title: "Termos de Uso · TaskMonster",
};

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        <strong>Rascunho.</strong> Este documento foi gerado como ponto de
        partida e ainda não passou por revisão jurídica. Não use como termo
        vinculante definitivo antes que um advogado revise o conteúdo.
      </div>

      <article className="prose prose-sm dark:prose-invert max-w-none">
        <h1>Termos de Uso do TaskMonster</h1>
        <p>Última atualização: 27 de agosto de 2026.</p>

        <h2>1. Aceitação dos termos</h2>
        <p>
          Ao criar uma conta ou usar o TaskMonster (&ldquo;Serviço&rdquo;), você concorda
          com estes Termos de Uso. Se você está criando uma conta em nome de
          uma empresa, você declara ter autoridade para vinculá-la a estes
          termos.
        </p>

        <h2>2. Descrição do serviço</h2>
        <p>
          O TaskMonster é uma ferramenta de gestão de demandas e tarefas para
          equipes. Cada empresa cliente (&ldquo;workspace&rdquo;) tem seus próprios
          usuários, dados e configurações, isolados dos demais workspaces.
        </p>

        <h2>3. Contas e responsabilidades</h2>
        <ul>
          <li>
            O administrador do workspace é responsável por gerenciar os
            colaboradores da própria empresa, incluindo criação, remoção e
            nível de acesso.
          </li>
          <li>
            Você é responsável por manter a confidencialidade da sua senha e
            por toda atividade realizada na sua conta.
          </li>
          <li>
            Informações fornecidas no cadastro (nome, e-mail, nome da empresa)
            devem ser verdadeiras.
          </li>
        </ul>

        <h2>4. Assinatura e pagamento</h2>
        <p>
          O uso do TaskMonster é pago, no valor de R$ 19,90/mês por
          workspace, cobrado de forma recorrente através do Asaas
          (processador de pagamentos). A criação do workspace só acontece
          depois da confirmação do primeiro pagamento. Se um pagamento
          ficar em atraso por mais de 3 dias após o vencimento, o acesso ao
          workspace pode ser bloqueado até a regularização. Cancelamentos
          podem ser solicitados pelo contato ao final destes termos.
        </p>

        <h2>5. Uso aceitável</h2>
        <p>Você concorda em não:</p>
        <ul>
          <li>Usar o Serviço para fins ilegais ou não autorizados;</li>
          <li>Tentar acessar dados de outro workspace sem autorização;</li>
          <li>
            Sobrecarregar a infraestrutura do Serviço de forma intencional
            (ex.: automação abusiva, criação em massa de contas);
          </li>
          <li>Revender ou sublicenciar o acesso ao Serviço sem autorização.</li>
        </ul>

        <h2>6. Propriedade dos dados</h2>
        <p>
          Os dados inseridos pelo seu workspace (demandas, comentários,
          informações de colaboradores) pertencem a você. Usamos esses dados
          apenas para operar o Serviço, conforme descrito na{" "}
          <a href="/privacidade">Política de Privacidade</a>.
        </p>

        <h2>7. Disponibilidade do serviço</h2>
        <p>
          Fazemos esforços razoáveis para manter o Serviço disponível, mas não
          garantimos operação ininterrupta ou livre de erros. Manutenções,
          atualizações ou falhas de infraestrutura de terceiros podem causar
          indisponibilidade temporária.
        </p>

        <h2>8. Encerramento</h2>
        <p>
          Você pode encerrar o uso do Serviço a qualquer momento. Podemos
          suspender ou encerrar contas que violem estes termos, mediante
          aviso quando possível.
        </p>

        <h2>9. Limitação de responsabilidade</h2>
        <p>
          O Serviço é fornecido &ldquo;como está&rdquo;. Na máxima extensão permitida por
          lei, não nos responsabilizamos por danos indiretos, lucros cessantes
          ou perda de dados decorrentes do uso do Serviço.
        </p>

        <h2>10. Alterações destes termos</h2>
        <p>
          Podemos atualizar estes termos periodicamente. Mudanças relevantes
          serão comunicadas pelos canais disponíveis no Serviço.
        </p>

        <h2>11. Lei aplicável</h2>
        <p>
          Estes termos são regidos pelas leis da República Federativa do
          Brasil.
        </p>

        <h2>12. Contato</h2>
        <p>
          Dúvidas sobre estes termos: <a href="mailto:brajohn2901@gmail.com">brajohn2901@gmail.com</a>.
        </p>
      </article>
    </main>
  );
}
