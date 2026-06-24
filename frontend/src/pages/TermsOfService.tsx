import React from 'react';
import LegalLayout from '../components/layout/LegalLayout';

export default function TermsOfService() {
  return (
    <LegalLayout title="Termos de Uso" lastUpdated="23 de junho de 2026">

      <nav className="legal-toc" aria-label="Índice">
        <p className="legal-toc-title">Conteúdo</p>
        <ol>
          <li><a href="#aceitacao">1. Aceitação dos termos</a></li>
          <li><a href="#servico">2. Descrição do serviço</a></li>
          <li><a href="#conta">3. Sua conta</a></li>
          <li><a href="#planos">4. Planos e pagamentos</a></li>
          <li><a href="#uso-aceitavel">5. Uso aceitável</a></li>
          <li><a href="#conteudo">6. Conteúdo do usuário</a></li>
          <li><a href="#propriedade">7. Propriedade intelectual</a></li>
          <li><a href="#ia">8. Conteúdo gerado por IA</a></li>
          <li><a href="#disponibilidade">9. Disponibilidade e limitação de responsabilidade</a></li>
          <li><a href="#rescisao">10. Rescisão e exclusão de conta</a></li>
          <li><a href="#alteracoes">11. Alterações nos termos</a></li>
          <li><a href="#lei">12. Lei aplicável e foro</a></li>
          <li><a href="#contato">13. Contato</a></li>
        </ol>
      </nav>

      <div className="legal-highlight">
        <p>
          Estes Termos de Uso ("Termos") regem o acesso e o uso da plataforma{' '}
          <strong>SAAFO HUB</strong>. Ao criar uma conta ou utilizar qualquer
          funcionalidade, você declara ter lido, compreendido e concordado com
          todos os termos abaixo. Se não concordar, não utilize o serviço.
        </p>
      </div>

      {/* 1 */}
      <h2 id="aceitacao">1. Aceitação dos termos</h2>
      <p>
        Ao se cadastrar na plataforma — seja por e-mail/senha ou por Google OAuth —
        você celebra um contrato vinculante com o SAAFO HUB. Estes Termos, em
        conjunto com nossa{' '}
        <a href="/privacidade">Política de Privacidade</a>, formam o acordo completo
        entre você e a plataforma.
      </p>
      <p>
        Você declara ter capacidade legal para celebrar este contrato. Usuários
        com menos de 16 anos precisam do consentimento de um responsável legal.
      </p>

      {/* 2 */}
      <h2 id="servico">2. Descrição do serviço</h2>
      <p>
        O SAAFO HUB é uma plataforma de estudos <em>all-in-one</em> que oferece:
      </p>
      <ul>
        <li>Criação e revisão de flashcards com algoritmo de repetição espaçada (SM-2).</li>
        <li>Geração automática de flashcards e simulados por Inteligência Artificial (Google Gemini).</li>
        <li>Simulador de provas de múltipla escolha e dissertativas com feedback imediato.</li>
        <li>Calendário de estudos com lembretes via WhatsApp.</li>
        <li>Timer Pomodoro integrado.</li>
        <li>Insights automáticos de desempenho gerados por IA.</li>
      </ul>
      <p>
        Reservamo-nos o direito de adicionar, modificar ou descontinuar funcionalidades
        a qualquer momento, com aviso prévio razoável aos usuários ativos.
      </p>

      {/* 3 */}
      <h2 id="conta">3. Sua conta</h2>
      <p>
        Você é responsável por manter a confidencialidade das suas credenciais de
        acesso e por todas as atividades realizadas na sua conta. Em caso de acesso
        não autorizado, notifique-nos imediatamente pelo e-mail de contato indicado
        na seção <a href="#contato">13</a>.
      </p>
      <p>
        É proibido compartilhar credenciais de acesso entre múltiplas pessoas. Cada
        conta é estritamente pessoal e intransferível.
      </p>

      {/* 4 */}
      <h2 id="planos">4. Planos e pagamentos</h2>
      <h3>4.1 Plano Trial</h3>
      <p>
        Novos usuários têm acesso completo à plataforma por <strong>14 dias</strong>{' '}
        sem custo. Não é necessário cartão de crédito para iniciar o trial.
        Ao final do período, o acesso a funcionalidades de IA e insights é suspendido
        até a assinatura de um plano pago.
      </p>
      <h3>4.2 Plano Estudante</h3>
      <p>
        O Plano Estudante custa <strong>R$ 19,00 por mês</strong> e garante acesso
        completo e ilimitado a todas as funcionalidades da plataforma, incluindo
        geração por IA, simulados e lembretes via WhatsApp.
      </p>
      <h3>4.3 Pagamentos e renovação</h3>
      <p>
        Os pagamentos são processados pela <strong>Asaas</strong> (PIX, boleto
        bancário ou cartão de crédito). A assinatura é renovada automaticamente a
        cada mês na data de vencimento. Em caso de inadimplência, o acesso ao plano
        pago é suspenso até a regularização.
      </p>
      <h3>4.4 Cancelamento e reembolso</h3>
      <p>
        Você pode cancelar sua assinatura a qualquer momento pelas configurações da
        conta. O cancelamento interrompe a renovação automática; o acesso permanece
        ativo até o final do período já pago.
      </p>
      <p>
        Reembolsos são analisados caso a caso. Nos primeiros <strong>7 dias</strong>{' '}
        após o primeiro pagamento, garantimos reembolso integral mediante solicitação
        por e-mail, conforme o Código de Defesa do Consumidor (Art. 49, CDC).
      </p>

      {/* 5 */}
      <h2 id="uso-aceitavel">5. Uso aceitável</h2>
      <p>É estritamente proibido usar o SAAFO HUB para:</p>
      <ul>
        <li>Atividades ilegais ou que violem direitos de terceiros.</li>
        <li>Fazer upload de conteúdo com direitos autorais sem autorização do titular.</li>
        <li>Submeter material que contenha vírus, malware ou código malicioso.</li>
        <li>Tentar reverter, descompilar ou fazer engenharia reversa da plataforma.</li>
        <li>Automatizar requisições de forma abusiva (scraping, bots).</li>
        <li>Criar contas falsas ou usar dados de terceiros sem autorização.</li>
        <li>Compartilhar conteúdo discriminatório, ofensivo ou ilegal.</li>
        <li>Revender ou sublicenciar acesso à plataforma.</li>
      </ul>
      <p>
        Violações podem resultar em suspensão imediata da conta sem direito a
        reembolso proporcional.
      </p>

      {/* 6 */}
      <h2 id="conteudo">6. Conteúdo do usuário</h2>
      <p>
        Você retém a propriedade intelectual sobre os materiais que faz upload
        (resumos, PDFs, imagens). Ao utilizar a plataforma, você nos concede uma
        licença limitada, não exclusiva, para processar esse conteúdo com o único
        propósito de fornecer o serviço contratado (geração de flashcards, simulados
        e análises).
      </p>
      <p>
        Não utilizamos seu conteúdo para treinar modelos de IA proprietários nem
        o compartilhamos com terceiros além dos parceiros descritos na{' '}
        <a href="/privacidade">Política de Privacidade</a>.
      </p>

      {/* 7 */}
      <h2 id="propriedade">7. Propriedade intelectual</h2>
      <p>
        Todo o código-fonte, design, marca, logotipo e funcionalidades originais do
        SAAFO HUB são propriedade dos seus desenvolvedores e protegidos pelas leis
        de direito autoral e marcas registradas. É proibida a reprodução, cópia ou
        uso comercial sem autorização prévia e por escrito.
      </p>

      {/* 8 */}
      <h2 id="ia">8. Conteúdo gerado por IA</h2>
      <p>
        Os flashcards, questões e insights gerados pela IA (Google Gemini) são
        produzidos automaticamente com base no seu material de estudo. O SAAFO HUB
        não garante a precisão, completude ou atualidade do conteúdo gerado.
      </p>
      <p>
        <strong>Você é responsável por verificar</strong> as informações geradas pela
        IA antes de utilizá-las para fins acadêmicos ou profissionais. Não nos
        responsabilizamos por decisões tomadas com base exclusivamente em conteúdo
        gerado por IA.
      </p>

      {/* 9 */}
      <h2 id="disponibilidade">9. Disponibilidade e limitação de responsabilidade</h2>
      <p>
        Nos empenhamos em manter a plataforma disponível 24/7, mas não garantimos
        disponibilidade ininterrupta. Manutenções programadas serão comunicadas com
        antecedência sempre que possível.
      </p>
      <p>
        O SAAFO HUB não se responsabiliza por perdas indiretas, lucros cessantes ou
        danos decorrentes de: (a) indisponibilidade temporária do serviço; (b) perda
        de dados por falha do usuário; (c) imprecisões no conteúdo gerado por IA;
        (d) ações de terceiros sobre os quais não temos controle.
      </p>
      <p>
        Nossa responsabilidade total, em qualquer caso, não excede o valor pago
        nos últimos <strong>3 meses</strong> de assinatura.
      </p>

      {/* 10 */}
      <h2 id="rescisao">10. Rescisão e exclusão de conta</h2>
      <p>
        <strong>Por você:</strong> você pode excluir sua conta a qualquer momento
        nas configurações de perfil. Seus dados serão removidos conforme descrito
        na <a href="/privacidade">Política de Privacidade</a>.
      </p>
      <p>
        <strong>Por nós:</strong> podemos suspender ou encerrar sua conta sem aviso
        prévio em casos de violação destes Termos, fraude confirmada ou por ordem
        judicial. Em casos não urgentes, enviaremos aviso por e-mail com pelo menos
        5 dias de antecedência.
      </p>

      {/* 11 */}
      <h2 id="alteracoes">11. Alterações nos termos</h2>
      <p>
        Podemos atualizar estes Termos periodicamente. Mudanças relevantes serão
        comunicadas por e-mail ou por aviso na plataforma com{' '}
        <strong>15 dias de antecedência</strong>. O uso continuado após a vigência
        das alterações configura aceite dos novos Termos.
      </p>

      {/* 12 */}
      <h2 id="lei">12. Lei aplicável e foro</h2>
      <p>
        Estes Termos são regidos pelas leis da República Federativa do Brasil.
        Eventuais conflitos serão dirimidos no foro da comarca do domicílio do
        usuário, conforme o Código de Defesa do Consumidor.
      </p>

      {/* 13 */}
      <h2 id="contato">13. Contato</h2>
      <p>
        Para dúvidas, reclamações ou solicitações relacionadas a estes Termos:
      </p>
      <ul>
        <li><strong>E-mail:</strong> <a href="mailto:contato@saafohub.com.br">contato@saafohub.com.br</a></li>
        <li><strong>Prazo de resposta:</strong> até 5 dias úteis</li>
      </ul>

    </LegalLayout>
  );
}
