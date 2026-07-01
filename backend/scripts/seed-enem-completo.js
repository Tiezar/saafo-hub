try {
  require('dotenv').config();
} catch (e) {
  // Ignore if dotenv is not available
}

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/saafo_db?schema=public';
const pool = new Pool({ connectionString });

const ENEM_COMPLETO_DATA = {
  banca: { name: 'INEP', description: 'Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira' },
  area: { name: 'ENEM — Completo', type: 'VESTIBULAR' },
  categories: [
    {
      parent: { name: 'Linguagens, Códigos e suas Tecnologias', color: '#6366f1' },
      children: [
        {
          name: 'Língua Portuguesa e Literatura',
          color: '#6366f1',
          topics: [
            'Gêneros e Tipologias Textuais',
            'Variação Linguística e Adequação Vocabular',
            'Funções da Linguagem (Apelativa, Poética, Metalinguística, etc.)',
            'Figuras de Linguagem (Metáfora, Metonímia, Antítese, Sintaxe)',
            'Quinhentismo e Barroco no Brasil',
            'Arcadismo e Romantismo',
            'Realismo, Naturalismo e Parnasianismo',
            'Pré-Modernismo e Semana de Arte Moderna de 1922',
            'Modernismo: Primeira, Segunda e Terceira Gerações',
            'Literatura Contemporânea Brasileira',
            'Sintaxe da Oração e do Período (Coordenação e Subordinação)',
            'Coesão Textual (Uso de Pronomes, Conectivos e Articuladores)',
            'Coerência Textual e Progressão Temática',
            'Regência Verbal, Nominal e o Uso da Crase',
            'Pontuação e Concordância Verbal/Nominal',
            'Semântica, Sinonímia, Antonímia, Conotação e Denotação'
          ]
        },
        {
          name: 'Artes e Expressão',
          color: '#6366f1',
          topics: [
            'Movimentos de Vanguarda Europeia (Futurismo, Cubismo, Dadaísmo, Surrealismo, Expressionismo)',
            'Arte Contemporânea e Novas Mídias',
            'Patrimônio Histórico e Cultural Brasileiro',
            'Manifestações Artísticas Populares',
            'Elementos das Artes Visuais e Plásticas',
            'História da Música e Gêneros Musicais',
            'Teatro e Dança no Contexto Social'
          ]
        },
        {
          name: 'Educação Física',
          color: '#6366f1',
          topics: [
            'Esporte e Lazer na Sociedade Contemporânea',
            'Corpo, Saúde e Padrões de Beleza Estéticos',
            'Jogos, Brincadeiras e Cultura Corporal',
            'Mídias e a Espetacularização do Esporte'
          ]
        },
        {
          name: 'Línguas Estrangeiras (Inglês / Espanhol)',
          color: '#6366f1',
          topics: [
            'Leitura e Interpretação de Textos Técnicos, Literários e Jornalísticos',
            'Identificação do Objetivo e Função Comunicativa do Texto',
            'Vocabulário Contextual e Falsos Cognatos',
            'Análise de Elementos Gramaticais na Coesão Textual'
          ]
        },
        {
          name: 'Tecnologias da Informação e Comunicação (TIC)',
          color: '#6366f1',
          topics: [
            'A Evolução Tecnológica e seu Impacto na Sociedade',
            'Sociedade da Informação, Redes Sociais e Privacidade',
            'Inclusão Digital e Democratização do Acesso'
          ]
        }
      ]
    },
    {
      parent: { name: 'Matemática e suas Tecnologias', color: '#ef4444' },
      children: [
        {
          name: 'Matemática Básica',
          color: '#ef4444',
          topics: [
            'Operações Fundamentais com Números Reais',
            'Mínimo Múltiplo Comum (MMC) e Máximo Divisor Comum (MDC)',
            'Razão, Proporção e Regra de Três Simples e Composta',
            'Porcentagem e Variações Percentuais',
            'Matemática Financeira (Juros Simples e Compostos)',
            'Sistemas de Medidas e Conversão de Unidades (Comprimento, Área, Volume, Massa)',
            'Escalas Numéricas e Gráficas'
          ]
        },
        {
          name: 'Álgebra e Funções',
          color: '#ef4444',
          topics: [
            'Expressões Algébricas e Equações de 1º e 2º Graus',
            'Função Afim (1º Grau): Conceito, Gráficos e Coeficientes',
            'Função Quadrática (2º Grau): Vértice, Raízes e Gráficos',
            'Função Exponencial: Crescimento e Decaimento',
            'Logaritmos: Propriedades, Equações e Aplicações',
            'Progressão Aritmética (PA) e Progressão Geométrica (PG)',
            'Sistemas de Equações Lineares'
          ]
        },
        {
          name: 'Geometria',
          color: '#ef4444',
          topics: [
            'Geometria Plana: Triângulos, Quadriláteros e Polígonos (Áreas e Perímetros)',
            'Geometria Plana: Círculo e Setores Circulares',
            'Geometria Espacial: Prismas, Cilindros e Pirâmides (Área e Volume)',
            'Geometria Espacial: Cones e Esferas (Área e Volume)',
            'Teorema de Pitágoras e Relações Métricas no Triângulo Retângulo',
            'Trigonometria Básica (Seno, Cosseno, Tangente e Ciclo Trigonométrico)',
            'Geometria Analítica: Distância entre Pontos e Equação da Reta',
            'Vistas Ortogonais e Projeções Geométricas 3D para 2D'
          ]
        },
        {
          name: 'Estatística e Probabilidade',
          color: '#ef4444',
          topics: [
            'Leitura, Interpretação e Análise de Gráficos e Tabelas',
            'Medidas de Tendência Central (Média Aritmética/Ponderada, Moda, Mediana)',
            'Medidas de Dispersão (Variância e Desvio Padrão)',
            'Análise Combinatória: Princípio Fundamental, Permutações, Arranjos e Combinações',
            'Probabilidade Clássica e Condicional',
            'Probabilidade de Eventos Simultâneos e Independentes'
          ]
        }
      ]
    },
    {
      parent: { name: 'Ciências da Natureza e suas Tecnologias', color: '#10b981' },
      children: [
        {
          name: 'Física',
          color: '#10b981',
          topics: [
            'Cinemática: Movimento Uniforme (MU) e Uniformemente Variado (MUV)',
            'Dinâmica: Leis de Newton e Forças Comuns (Peso, Normal, Atrito, Centrípeta)',
            'Estática e Hidrostática (Pressão, Empuxo/Arquimedes e Pascal)',
            'Leis de Conservação: Trabalho, Potência e Energia Mecânica',
            'Termologia: Escalas Termométricas e Calorimetria',
            'Termodinâmica: Leis e Máquinas Térmicas',
            'Ondulatória: Elementos, Equação Fundamental e Fenômenos Ondulatórios (Reflexão, Refração, Difração, Interferência, Polarização)',
            'Acústica: Qualidades Fisiológicas do Som e Efeito Doppler',
            'Óptica Geométrica: Reflexão, Refração, Lentes e Olho Humano',
            'Eletrodinâmica: Corrente, Tensão, Resistência, Leis de Ohm e Associação de Resistores',
            'Eletrodinâmica: Potência Elétrica, Consumo de Energia e Dispositivos de Proteção (Fusível/Disjuntor)',
            'Magnetismo: Ímãs, Força Magnética e Indução Eletromagnética (Lei de Faraday)'
          ]
        },
        {
          name: 'Química',
          color: '#10b981',
          topics: [
            'Estrutura Atômica, Tabela Periódica e Propriedades Periódicas',
            'Ligações Químicas (Iônica, Covalente, Metálica) e Forças Intermoleculares',
            'Química Inorgânica: Funções Químicas (Ácidos, Bases, Sais e Óxidos) e Reações',
            'Grandezas Químicas e Cálculo Estequiométrico (Rendimento, Pureza e Reagente Limitante)',
            'Soluções: Modos de Exprimir Concentração e Diluição',
            'Termoquímica: Entalpia, Reações Endotérmicas/Exotérmicas e Lei de Hess',
            'Cinética Química: Fatores que Alteram a Velocidade das Reações',
            'Equilíbrio Químico: Constante de Equilíbrio (Kc/Kp), Deslocamento e pH/pOH',
            'Eletroquímica: Pilhas, Potencial de Redução e Eletrólise',
            'Química Orgânica: Classificação de Cadeias, Hidrocarbonetos e Funções Oxigenadas/Nitrogenadas',
            'Isomeria Plana e Espacial (Geométrica e Óptica)',
            'Química Ambiental: Efeito Estufa, Chuva Ácida, Destruição da Camada de Ozônio e Tratamento de Água/Esgoto'
          ]
        },
        {
          name: 'Biologia',
          color: '#10b981',
          topics: [
            'Ecologia: Conceitos Básicos, Cadeias e Teias Alimentares e Fluxo de Energia',
            'Ciclos Biogeoquímicos (Água, Carbono, Nitrogênio e Oxigênio)',
            'Ecologia: Relações Ecológicas e Dinâmica de Populações',
            'Impactos Ambientais: Eutrofização, Biomagnificação, Introdução de Espécies Exóticas e Biomas Brasileiros',
            'Citologia: Estrutura Celular, Organelas Citoplasmáticas e Transporte pela Membrana',
            'Bioenergética: Fotossíntese, Respiração Celular e Fermentação',
            'Divisão Celular: Mitose e Meiose',
            'Genética Mendeliana, Grupos Sanguíneos (Sistema ABO e Rh) e Engenharia Genética/Biotecnologia (Clonagem, Transgênicos, DNA Recombinante)',
            'Evolução: Teorias Evolutivas (Lamarckismo, Darwinismo e Neodarwinismo)',
            'Fisiologia Humana: Sistemas Digestório, Respiratório, Circulatório, Excretor e Endócrino/Nervoso',
            'Programas de Saúde Pública: Viroses, Bacterioses, Protozooses, Verminoses e Diferença entre Vacina e Soro',
            'Histologia e Fisiologia Vegetal (Botânica Básica)'
          ]
        }
      ]
    },
    {
      parent: { name: 'Ciências Humanas e suas Tecnologias', color: '#f59e0b' },
      children: [
        {
          name: 'História',
          color: '#f59e0b',
          topics: [
            'Brasil Colônia: Administração, Ciclos Econômicos (Açúcar e Ouro) e Resistência Escrava',
            'Brasil Império: Primeiro e Segundo Reinado, Guerra do Paraguai e Abolição da Escravidão',
            'Brasil República: República Velha (Oligárquica) e Coronelismo',
            'Era Vargas (1930-1945) e seus Impactos Sociais, Políticos e Trabalhistas',
            'Ditadura Militar no Brasil (1964-1985) e Processo de Redemocratização',
            'História Geral: Antiguidade Clássica (Grécia e Roma — Democracia e Cidadania)',
            'Idade Média: Sistema Feudal, Igreja Católica e Cruzadas',
            'Idade Moderna: Renascimento, Reformas Religiosas, Absolutismo e Iluminismo',
            'Revolução Industrial (Inglaterra) e o Surgimento do Capitalismo Industrial',
            'Século XX: Primeira e Segunda Guerra Mundial, Revolução Russa e Crise de 1929',
            'Guerra Fria: Polarização Global, Descolonização da África/Ásia e Conflitos Regionais'
          ]
        },
        {
          name: 'Geografia',
          color: '#f59e0b',
          topics: [
            'Geografia Física: Estrutura da Terra, Relevo, Tipos de Solo e Processos Erosivos',
            'Geografia Física: Climatologia, Fatores Climáticos e Principais Climas Mundiais e do Brasil',
            'Geografia Ambiental: Domínios Morfoclimáticos e Biomas Brasileiros (Cerrado, Caatinga, Amazônia, Mata Atlântica)',
            'Questão Ambiental Global: Desmatamento, Poluição Atmosférica, Aquecimento Global e Desenvolvimento Sustentável',
            'Geografia Urbana: Urbanização Mundial e Brasileira, Metropolização, Favelização e Problemas Urbanos',
            'Geografia Agrária: Estrutura Fundiária do Brasil, Conflitos de Terra e Agronegócio vs. Agricultura Familiar',
            'Geopolítica e Globalização: Blocos Econômicos, Divisão Internacional do Trabalho e Nova Ordem Mundial',
            'Demografia: Teorias Demográficas, Crescimento da População, Transição Demográfica e Fluxos Migratórios',
            'Cartografia: Projeções Cartográficas, Escalas, Fusos Horários e Novas Tecnologias (Sensoriamento Remoto, GPS)'
          ]
        },
        {
          name: 'Filosofia e Sociologia',
          color: '#f59e0b',
          topics: [
            'Surgimento da Filosofia, Filósofos Pré-socráticos e Filosofia Clássica (Sócrates, Platão e Aristóteles)',
            'Filosofia Patrística e Escolástica (Santo Agostinho e São Tomás de Aquino)',
            'Filosofia Moderna: Racionalismo (Descartes) vs. Empirismo (Locke, Hume)',
            'Filosofia Política: Contratualistas (Hobbes, Locke, Rousseau) e a Teoria do Estado',
            'Ética e Filosofia Contemporânea (Nietzsche, Existencialismo, Escola de Frankfurt)',
            'Sociologia Clássica: Karl Marx (Luta de Classes, Alienação), Émile Durkheim (Fato Social, Anomia) e Max Weber (Ação Social, Ética Protestante)',
            'Cultura, Indústria Cultural, Ideologia e Consumo',
            'Cidadania, Direitos Humanos, Democracia e Movimentos Sociais Contemporâneos',
            'Trabalho e Sociedade: Taylorismo, Fordismo, Toyotismo e Precarização do Trabalho na Era Digital'
          ]
        }
      ]
    },
    {
      parent: { name: 'Redação', color: '#8b5cf6' },
      children: [
        {
          name: 'Competências de Avaliação',
          color: '#8b5cf6',
          topics: [
            'Competência 1: Domínio da Norma Padrão da Língua Escrita (Ortografia, Concordância, Regência, Pontuação)',
            'Competência 2: Compreensão do Tema, Aplicação de Diversas Áreas do Conhecimento (Repertório) e Gênero Dissertativo',
            'Competência 3: Seleção, Relação, Organização e Interpretação de Informações, Fatos e Opiniões para Defender um Ponto de Vista',
            'Competência 4: Demonstração de Conhecimento dos Mecanismos Linguísticos Necessários para a Construção da Argumentação (Coesão e Conectivos)',
            'Competência 5: Elaboração de Proposta de Intervenção para o Problema Abordado, Respeitando os Direitos Humanos (Agente, Ação, Meio/Modo, Efeito e Detalhamento)'
          ]
        },
        {
          name: 'Técnica e Estrutura Textual',
          color: '#8b5cf6',
          topics: [
            'Estrutura da Introdução: Contextualização do Tema e Apresentação da Tese',
            'Estrutura dos Parágrafos de Desenvolvimento: Tópico Frasal, Repertório Produtivo, Análise Crítica e Fechamento',
            'Estrutura da Conclusão: Retomada da Tese e Resolução com a Proposta dos 5 Elementos',
            'Tipos de Repertório Legítimo e sua Relação com o Tema (Filosofia, Sociologia, Literatura, História, Dados Estatísticos)',
            'Erros Graves que Levam à Nota Zero (Fuga ao Tema, Cópia dos Textos de Apoio, Partes Desconectadas, Assinatura)'
          ]
        }
      ]
    }
  ]
};

async function main() {
  console.log('\n🌱 Iniciando carga do template ENEM completo...\n');

  // 1. Banca INEP
  const bancaRes = await pool.query(`
    INSERT INTO bancas (id, name, description, "createdAt")
    VALUES (gen_random_uuid(), $1, $2, NOW())
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id
  `, [ENEM_COMPLETO_DATA.banca.name, ENEM_COMPLETO_DATA.banca.description]);
  const bancaId = bancaRes.rows[0].id;
  console.log(`Banca: ${ENEM_COMPLETO_DATA.banca.name} (${bancaId})`);

  // 2. Limpar qualquer ENEM anterior para evitar duplicados
  const deleteRes = await pool.query(`
    DELETE FROM areas 
    WHERE name IN ('ENEM — Completo', 'ENEM — Ensino Médio') AND "isTemplate" = true
  `);
  console.log(`Limpados ${deleteRes.rowCount} templates antigos do ENEM.`);

  // 3. Criar a nova área do ENEM Completo
  const areaRes = await pool.query(`
    INSERT INTO areas (id, name, type, "bancaId", "isTemplate", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW())
    RETURNING id
  `, [ENEM_COMPLETO_DATA.area.name, ENEM_COMPLETO_DATA.area.type, bancaId]);
  const areaId = areaRes.rows[0].id;
  console.log(`Área cadastrada: ${ENEM_COMPLETO_DATA.area.name} (${areaId})`);

  // 4. Inserir hierarquia de disciplinas
  let countSubjects = 0;
  let countTopics = 0;

  for (const cat of ENEM_COMPLETO_DATA.categories) {
    // A. Criar disciplina pai (Tecnologia/Área de Conhecimento)
    const parentRes = await pool.query(`
      INSERT INTO area_subjects (id, "areaId", name, color, "createdAt")
      VALUES (gen_random_uuid(), $1, $2, $3, NOW())
      RETURNING id
    `, [areaId, cat.parent.name, cat.parent.color]);
    const parentId = parentRes.rows[0].id;
    countSubjects++;

    // B. Criar disciplinas filhas (Matérias específicas)
    for (const child of cat.children) {
      const childRes = await pool.query(`
        INSERT INTO area_subjects (id, "areaId", name, color, "parentId", "createdAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
        RETURNING id
      `, [areaId, child.name, child.color, parentId]);
      const childId = childRes.rows[0].id;
      countSubjects++;

      // C. Criar tópicos na disciplina filha
      for (const topicName of child.topics) {
        await pool.query(`
          INSERT INTO area_topics (id, "areaSubjectId", name, priority, "createdAt")
          VALUES (gen_random_uuid(), $1, $2, 3, NOW())
        `, [childId, topicName]);
        countTopics++;
      }
    }
  }

  console.log(`\n✅ Sucesso! Semeado: ${countSubjects} matérias/grandes áreas, ${countTopics} tópicos do ENEM.`);
  await pool.end();
}

main().catch(e => {
  console.error('Erro no seed do ENEM:', e);
  process.exit(1);
});
