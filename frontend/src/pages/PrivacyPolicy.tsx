import React from 'react';
import LegalLayout from '../components/layout/LegalLayout';

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Política de Privacidade" lastUpdated="23 de junho de 2026">

      <nav className="legal-toc" aria-label="Índice">
        <p className="legal-toc-title">Conteúdo</p>
        <ol>
          <li><a href="#controlador">1. Quem somos (controlador)</a></li>
          <li><a href="#dados">2. Dados que coletamos</a></li>
          <li><a href="#finalidades">3. Como e por que usamos seus dados</a></li>
          <li><a href="#compartilhamento">4. Compartilhamento com terceiros</a></li>
          <li><a href="#retencao">5. Por quanto tempo guardamos seus dados</a></li>
          <li><a href="#direitos">6. Seus direitos como titular (LGPD)</a></li>
          <li><a href="#cookies">7. Cookies e tecnologias similares</a></li>
          <li><a href="#seguranca">8. Segurança</a></li>
          <li><a href="#menores">9. Menores de idade</a></li>
          <li><a href="#atualizacoes">10. Alterações nesta política</a></li>
          <li><a href="#contato">11. Contato e Encarregado (DPO)</a></li>
        </ol>
      </nav>

      <div className="legal-highlight">
        <p>
          Esta Política de Privacidade descreve como o <strong>SAAFO HUB</strong> coleta,
          usa e protege suas informações pessoais, em conformidade com a{' '}
          <strong>Lei Geral de Proteção de Dados — LGPD (Lei nº 13.709/2018)</strong> e
          demais normas aplicáveis. Ao criar uma conta ou utilizar nossa plataforma,
          você confirma que leu e compreendeu esta política.
        </p>
      </div>

      {/* 1 */}
      <h2 id="controlador">1. Quem somos (controlador de dados)</h2>
      <p>
        O SAAFO HUB é uma plataforma de estudos online operada por seus
        desenvolvedores. Para fins da LGPD, atuamos como <strong>controlador</strong> dos
        dados pessoais dos usuários cadastrados.
      </p>
      <p>
        Para exercer seus direitos ou entrar em contato sobre privacidade, utilize o
        endereço indicado na seção <a href="#contato">11. Contato</a>.
      </p>

      {/* 2 */}
      <h2 id="dados">2. Dados que coletamos</h2>

      <h3>2.1 Dados fornecidos diretamente por você</h3>
      <ul>
        <li><strong>Cadastro por e-mail:</strong> nome (opcional), endereço de e-mail e senha (armazenada com hash seguro).</li>
        <li><strong>Cadastro via Google OAuth:</strong> nome, e-mail e foto de perfil fornecidos pelo Google.</li>
        <li><strong>Número de WhatsApp:</strong> informado voluntariamente para receber lembretes de revisão.</li>
        <li><strong>Conteúdo de estudo:</strong> matérias, flashcards, arquivos enviados (PDF, imagens até 50 MB) e respostas em simulados.</li>
        <li><strong>Dados de pagamento:</strong> processados pela <strong>Asaas</strong> (PIX, boleto ou cartão). Não armazenamos dados de cartão em nossos servidores.</li>
      </ul>

      <h3>2.2 Dados coletados automaticamente</h3>
      <ul>
        <li>Endereço IP e informações de dispositivo e navegador (para segurança e diagnóstico).</li>
        <li>Logs de acesso (data, hora e páginas visitadas).</li>
        <li>Dados de uso da plataforma: sessões de estudo, cards revisados, resultados de simulados e sequência (streak) de estudos.</li>
        <li>Cookies de sessão e preferências de interface (tema claro/escuro).</li>
      </ul>

      {/* 3 */}
      <h2 id="finalidades">3. Como e por que usamos seus dados</h2>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Finalidade</th>
            <th>Base legal (LGPD Art. 7º)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Criar e manter sua conta; autenticação e segurança de acesso</td>
            <td>Execução de contrato (inciso V)</td>
          </tr>
          <tr>
            <td>Gerar flashcards e simulados via IA (Gemini 2.5 Flash)</td>
            <td>Execução de contrato (inciso V)</td>
          </tr>
          <tr>
            <td>Calcular revisões pelo algoritmo SM-2 e exibir insights de desempenho</td>
            <td>Execução de contrato (inciso V)</td>
          </tr>
          <tr>
            <td>Enviar lembretes via WhatsApp</td>
            <td>Consentimento (inciso I) — você pode revogar nas configurações</td>
          </tr>
          <tr>
            <td>Processar pagamentos e emitir cobranças</td>
            <td>Execução de contrato + obrigação legal (incisos V e II)</td>
          </tr>
          <tr>
            <td>Enviar e-mails transacionais (verificação de conta, redefinição de senha)</td>
            <td>Execução de contrato (inciso V)</td>
          </tr>
          <tr>
            <td>Análise agregada de uso para melhoria da plataforma (com seu consentimento via cookies analíticos)</td>
            <td>Consentimento (inciso I)</td>
          </tr>
          <tr>
            <td>Prevenir fraudes e garantir a segurança da plataforma</td>
            <td>Legítimo interesse (inciso IX)</td>
          </tr>
          <tr>
            <td>Cumprir obrigações legais e fiscais</td>
            <td>Obrigação legal (inciso II)</td>
          </tr>
        </tbody>
      </table>

      {/* 4 */}
      <h2 id="compartilhamento">4. Compartilhamento com terceiros</h2>
      <p>
        Não vendemos nem alugamos seus dados pessoais. Compartilhamos informações
        apenas com os parceiros necessários para operar a plataforma, sempre mediante
        acordos de confidencialidade ou termos de processamento compatíveis com a LGPD:
      </p>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Terceiro</th>
            <th>Finalidade</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Google (Gemini API / OAuth)</strong></td>
            <td>Geração de flashcards e simulados por IA; autenticação via Google</td>
          </tr>
          <tr>
            <td><strong>Asaas</strong></td>
            <td>Processamento de pagamentos (PIX, boleto, cartão)</td>
          </tr>
          <tr>
            <td><strong>Resend</strong></td>
            <td>Envio de e-mails transacionais</td>
          </tr>
          <tr>
            <td><strong>Evolution API</strong></td>
            <td>Envio de notificações via WhatsApp (somente se você habilitou)</td>
          </tr>
          <tr>
            <td><strong>Provedor de hospedagem (VPS)</strong></td>
            <td>Infraestrutura de servidores; dados armazenados no Brasil</td>
          </tr>
        </tbody>
      </table>
      <p>
        Podemos ainda divulgar dados quando exigido por lei, ordem judicial ou
        autoridade competente.
      </p>

      {/* 5 */}
      <h2 id="retencao">5. Por quanto tempo guardamos seus dados</h2>
      <ul>
        <li><strong>Conta ativa:</strong> seus dados são mantidos enquanto sua conta existir.</li>
        <li><strong>Solicitação de exclusão:</strong> removemos ou anonimizamos seus dados em até <strong>30 dias</strong> após o pedido, exceto os que devem ser mantidos por obrigação legal.</li>
        <li><strong>Registros financeiros:</strong> mantidos por <strong>5 anos</strong> conforme exigência fiscal (Lei nº 9.430/1996).</li>
        <li><strong>Logs de segurança:</strong> mantidos por até <strong>6 meses</strong>.</li>
        <li><strong>Dados de consentimento de cookies:</strong> mantidos por <strong>12 meses</strong>, data em que pediremos nova confirmação.</li>
      </ul>

      {/* 6 */}
      <h2 id="direitos">6. Seus direitos como titular (LGPD Art. 18)</h2>
      <p>Você tem direito a:</p>
      <ul>
        <li><strong>Confirmar</strong> se tratamos seus dados pessoais.</li>
        <li><strong>Acessar</strong> os dados que temos sobre você.</li>
        <li><strong>Corrigir</strong> dados incompletos, inexatos ou desatualizados.</li>
        <li><strong>Solicitar anonimização, bloqueio ou eliminação</strong> de dados desnecessários ou tratados em desacordo com a LGPD.</li>
        <li><strong>Portabilidade</strong> dos seus dados para outro serviço.</li>
        <li><strong>Revogar consentimento</strong> a qualquer momento (ex: notificações WhatsApp, cookies analíticos).</li>
        <li><strong>Solicitar a exclusão</strong> da sua conta e dados associados.</li>
        <li><strong>Informação</strong> sobre os terceiros com quem compartilhamos seus dados.</li>
        <li><strong>Opor-se</strong> a tratamento realizado com base em legítimo interesse.</li>
      </ul>
      <p>
        Para exercer qualquer desses direitos, entre em contato pelo e-mail indicado
        na seção <a href="#contato">11. Contato</a>. Responderemos em até{' '}
        <strong>15 dias úteis</strong>.
      </p>

      {/* 7 */}
      <h2 id="cookies">7. Cookies e tecnologias similares</h2>
      <p>Utilizamos cookies para as seguintes finalidades:</p>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Exemplos</th>
            <th>Pode recusar?</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Necessários</strong></td>
            <td>Token de sessão JWT, preferência de tema (claro/escuro), estado de login</td>
            <td>Não — essenciais para o funcionamento</td>
          </tr>
          <tr>
            <td><strong>Analíticos</strong></td>
            <td>Métricas de uso, páginas visitadas, tempo de sessão</td>
            <td>Sim — via painel de cookies</td>
          </tr>
          <tr>
            <td><strong>Marketing</strong></td>
            <td>Rastreamento de conversão, personalização de anúncios</td>
            <td>Sim — via painel de cookies</td>
          </tr>
        </tbody>
      </table>
      <p>
        Você pode gerenciar ou revogar suas preferências de cookies a qualquer momento
        clicando em <strong>"Gerenciar cookies"</strong> no rodapé da página ou limpando
        os dados do navegador. Cookies necessários não podem ser desativados sem
        comprometer o funcionamento da plataforma.
      </p>

      {/* 8 */}
      <h2 id="seguranca">8. Segurança</h2>
      <p>
        Adotamos medidas técnicas e organizacionais para proteger seus dados contra
        acesso não autorizado, perda ou divulgação indevida, incluindo:
      </p>
      <ul>
        <li>Senhas armazenadas com algoritmo de hash seguro (bcrypt).</li>
        <li>Comunicação criptografada via HTTPS/TLS em todas as requisições.</li>
        <li>Tokens JWT com expiração de 1 hora e renovação controlada.</li>
        <li>Acesso restrito ao banco de dados por rede privada.</li>
        <li>Backups regulares com acesso limitado.</li>
      </ul>
      <p>
        Em caso de incidente de segurança que afete seus dados, notificaremos você e
        a ANPD nos prazos previstos pela LGPD.
      </p>

      {/* 9 */}
      <h2 id="menores">9. Menores de idade</h2>
      <p>
        O SAAFO HUB é destinado a pessoas com <strong>16 anos ou mais</strong>. Não
        coletamos intencionalmente dados de menores de 16 anos sem o consentimento de
        um responsável legal. Se identificarmos que um menor se cadastrou sem
        autorização, removeremos a conta e os dados associados.
      </p>

      {/* 10 */}
      <h2 id="atualizacoes">10. Alterações nesta política</h2>
      <p>
        Podemos atualizar esta Política de Privacidade periodicamente. Quando houver
        mudanças relevantes, notificaremos você por e-mail ou por aviso destacado na
        plataforma com pelo menos <strong>10 dias de antecedência</strong>. A data da
        última atualização está sempre indicada no topo desta página.
      </p>
      <p>
        O uso continuado da plataforma após a entrada em vigor das alterações implica
        aceitação da nova versão.
      </p>

      {/* 11 */}
      <h2 id="contato">11. Contato e Encarregado (DPO)</h2>
      <p>
        Para exercer seus direitos, tirar dúvidas ou registrar reclamações sobre o
        tratamento dos seus dados pessoais, entre em contato:
      </p>
      <ul>
        <li><strong>E-mail:</strong> <a href="mailto:privacidade@saafohub.com.br">privacidade@saafohub.com.br</a></li>
        <li><strong>Prazo de resposta:</strong> até 15 dias úteis</li>
      </ul>
      <p>
        Você também pode apresentar reclamação à{' '}
        <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong> pelo
        site <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer">gov.br/anpd</a>.
      </p>

    </LegalLayout>
  );
}
