import 'dotenv/config';
import { GeminiService } from '../src/infrastructure/ai/gemini.service';

async function run() {
  console.log('--- Iniciando Playground da API do Gemini ---');
  const service = new GeminiService();

  const sampleText = `
    O artigo 5º da Constituição Federal de 1988 estabelece que todos são iguais perante a lei, 
    sem distinção de qualquer natureza, garantindo-se aos brasileiros e aos estrangeiros residentes no País 
    a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade. 
    Ademais, determina que homens e mulheres são iguais em direitos e obrigações, nos termos desta Constituição, 
    e que ninguém será submetido a tortura nem a tratamento desumano ou degradante.
  `;

  console.log('Texto de estudo enviado:\n', sampleText.trim());
  console.log(
    '\nEnviando requisição para o Gemini (modelo gemini-2.5-flash)...',
  );

  try {
    const startTime = Date.now();
    const cards = await service.generateFlashcards(sampleText);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\nSucesso! Resposta recebida em ${duration} segundos.`);
    console.log(`Flashcards gerados (${cards.length}):`);
    console.log(JSON.stringify(cards, null, 2));
  } catch (error) {
    console.error('\nErro na geração de flashcards:', error);
  }
}

run();
