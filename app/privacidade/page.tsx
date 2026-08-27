export const metadata = {
  title: "Política de Privacidade · TaskMonster",
};

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        <strong>Rascunho.</strong> Este documento foi gerado como ponto de
        partida (com base na LGPD) e ainda não passou por revisão jurídica.
        Não use como política definitiva antes que um advogado revise o
        conteúdo.
      </div>

      <article className="prose prose-sm dark:prose-invert max-w-none">
        <h1>Política de Privacidade do TaskMonster</h1>
        <p>Última atualização: 27 de agosto de 2026.</p>

        <h2>1. Quem somos</h2>
        <p>
          O TaskMonster (&ldquo;nós&rdquo;) é o controlador dos dados pessoais tratados
          por meio deste Serviço, nos termos da Lei Geral de Proteção de
          Dados (Lei nº 13.709/2018, &ldquo;LGPD&rdquo;). Contato:{" "}
          <a href="mailto:brajohn2901@gmail.com">brajohn2901@gmail.com</a>.
        </p>

        <h2>2. Quais dados coletamos</h2>
        <ul>
          <li>
            <strong>Dados de cadastro:</strong> nome, e-mail, cargo, senha
            (armazenada de forma criptografada, nunca em texto puro), nome da
            empresa/workspace.
          </li>
          <li>
            <strong>Dados de pagamento:</strong> processados diretamente
            pelo Asaas (nome, CPF/CNPJ, dados do cartão/Pix/boleto) — nós
            não armazenamos número de cartão nem dado bancário, só o
            identificador da assinatura e o histórico de cobranças (valor,
            vencimento, status).
          </li>
          <li>
            <strong>Conteúdo que você insere:</strong> demandas, descrições,
            comentários e imagem de perfil (avatar), quando fornecida.
          </li>
          <li>
            <strong>Dados de uso e segurança:</strong> data/hora do último
            acesso, ações realizadas no Serviço (ex.: criação de demanda,
            login) para fins de suporte e melhoria do produto, e endereço IP
            associado a tentativas de login/cadastro, usado para prevenir
            abuso (limite de tentativas).
          </li>
        </ul>

        <h2>3. Para que usamos esses dados</h2>
        <ul>
          <li>Viabilizar o funcionamento do Serviço (execução de contrato);</li>
          <li>
            Autenticação e segurança da conta, incluindo prevenção de abuso e
            acessos indevidos (legítimo interesse);
          </li>
          <li>
            Entender como o produto é usado para priorizar melhorias
            (legítimo interesse);
          </li>
          <li>Comunicações operacionais sobre sua conta (execução de contrato).</li>
        </ul>

        <h2>4. Com quem compartilhamos</h2>
        <p>
          Não vendemos seus dados. Compartilhamos dados apenas com prestadores
          de infraestrutura necessários para operar o Serviço:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> — banco de dados e autenticação;
          </li>
          <li>
            <strong>Vercel</strong> — hospedagem da aplicação;
          </li>
          <li>
            <strong>Asaas</strong> — processamento de pagamentos e emissão
            de cobranças (Pix, boleto, cartão).
          </li>
        </ul>

        <h2>5. Isolamento entre empresas</h2>
        <p>
          Cada workspace só tem acesso aos próprios dados. A equipe do
          TaskMonster tem acesso operacional limitado — vê informações da
          empresa (nome, status, administrador responsável, indicadores de
          uso agregados) para fins de suporte e gestão da plataforma, mas não
          acessa o conteúdo das suas demandas ou comentários.
        </p>

        <h2>6. Retenção e exclusão</h2>
        <p>
          Mantemos seus dados enquanto sua conta estiver ativa. Ao excluir um
          workspace, os dados associados (colaboradores, demandas,
          comentários) são apagados permanentemente. Você pode solicitar a
          exclusão da sua conta a qualquer momento pelo contato acima.
        </p>

        <h2>7. Seus direitos (LGPD, art. 18)</h2>
        <p>Você pode solicitar, a qualquer momento:</p>
        <ul>
          <li>Confirmação de que tratamos seus dados e acesso a eles;</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>
            Anonimização, bloqueio ou eliminação de dados desnecessários ou
            tratados em desconformidade com a lei;
          </li>
          <li>Portabilidade dos dados a outro fornecedor;</li>
          <li>Eliminação dos dados pessoais tratados com seu consentimento;</li>
          <li>Informação sobre com quem compartilhamos seus dados;</li>
          <li>Revogação do consentimento, quando aplicável.</li>
        </ul>
        <p>
          Para exercer qualquer desses direitos, escreva para{" "}
          <a href="mailto:brajohn2901@gmail.com">brajohn2901@gmail.com</a>.
        </p>

        <h2>8. Cookies</h2>
        <p>
          Usamos apenas cookies essenciais para manter sua sessão autenticada.
          Não usamos cookies de rastreamento publicitário.
        </p>

        <h2>9. Menores de idade</h2>
        <p>O Serviço é destinado a uso profissional e não é direcionado a menores de 18 anos.</p>

        <h2>10. Alterações desta política</h2>
        <p>
          Podemos atualizar esta política periodicamente. Mudanças relevantes
          serão comunicadas pelos canais disponíveis no Serviço.
        </p>
      </article>
    </main>
  );
}
