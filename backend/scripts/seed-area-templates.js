const { Pool } = require('pg');

const pool = new Pool({ connectionString: 'postgresql://postgres@localhost:5432/saafo_db?schema=public' });

const ENEM_DATA = {
  banca: { name: 'INEP', description: 'Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira' },
  area: { name: 'ENEM — Ensino Médio', type: 'VESTIBULAR' },
  subjects: [
    {
      name: 'Linguagens, Códigos e suas Tecnologias',
      color: '#6366f1',
      topics: [
        'Interpretação e Produção de Textos',
        'Literatura Brasileira',
        'Língua Portuguesa — Gramática',
        'Língua Estrangeira (Inglês)',
        'Artes e Linguagem Artística',
        'Educação Física e Corporeidade',
        'Tecnologias da Informação e Comunicação',
      ],
    },
    {
      name: 'Ciências Humanas e suas Tecnologias',
      color: '#f59e0b',
      topics: [
        'História do Brasil',
        'História Geral',
        'Geografia do Brasil',
        'Geografia Geral',
        'Filosofia',
        'Sociologia',
        'Atualidades e Geopolítica',
      ],
    },
    {
      name: 'Ciências da Natureza e suas Tecnologias',
      color: '#10b981',
      topics: [
        'Física — Mecânica',
        'Física — Eletromagnetismo',
        'Física — Termologia e Óptica',
        'Química Geral e Inorgânica',
        'Química Orgânica',
        'Biologia — Citologia e Genética',
        'Biologia — Ecologia e Evolução',
        'Biologia — Fisiologia Humana',
      ],
    },
    {
      name: 'Matemática e suas Tecnologias',
      color: '#ef4444',
      topics: [
        'Funções e Equações',
        'Geometria Plana e Espacial',
        'Estatística e Probabilidade',
        'Progressões (PA e PG)',
        'Trigonometria',
        'Análise Combinatória',
        'Matrizes e Determinantes',
        'Matemática Financeira',
      ],
    },
    {
      name: 'Redação',
      color: '#8b5cf6',
      topics: [
        'Estrutura da Redação Dissertativo-Argumentativa',
        'Competências da Redação ENEM',
        'Argumentação e Repertório Cultural',
        'Proposta de Intervenção',
        'Coesão e Coerência Textual',
      ],
    },
  ],
};

const OAB_DATA = {
  banca: { name: 'FGV — OAB', description: 'Fundação Getulio Vargas — Exame Nacional da OAB' },
  area: { name: 'OAB — Exame de Ordem', type: 'CONCURSO' },
  subjects: [
    { name: 'Direito Civil', color: '#6366f1', topics: ['Parte Geral', 'Obrigações', 'Contratos', 'Responsabilidade Civil', 'Direito de Família', 'Direito das Sucessões'] },
    { name: 'Direito Penal', color: '#ef4444', topics: ['Teoria do Crime', 'Punibilidade e Extinção', 'Crimes em Espécie', 'Lei de Drogas', 'Estatuto da Criança e Adolescente'] },
    { name: 'Direito Constitucional', color: '#f59e0b', topics: ['Princípios Fundamentais', 'Direitos e Garantias Fundamentais', 'Organização do Estado', 'Controle de Constitucionalidade'] },
    { name: 'Direito do Trabalho', color: '#10b981', topics: ['Contrato de Trabalho', 'Jornada e Remuneração', 'Rescisão Contratual', 'Processo do Trabalho'] },
    { name: 'Direito Processual Civil', color: '#8b5cf6', topics: ['Princípios e Competência', 'Processo de Conhecimento', 'Recursos', 'Execução e Tutelas Provisórias'] },
    { name: 'Direito Processual Penal', color: '#ec4899', topics: ['Inquérito Policial', 'Ação Penal', 'Prova', 'Recursos em Espécie'] },
    { name: 'Direito Empresarial', color: '#14b8a6', topics: ['Teoria da Empresa', 'Sociedades Empresárias', 'Falência e Recuperação', 'Títulos de Crédito'] },
    { name: 'Ética e Estatuto da OAB', color: '#f97316', topics: ['Estatuto da Advocacia', 'Código de Ética e Disciplina', 'Incompatibilidades e Impedimentos'] },
  ],
};

const POLICIA_CIVIL_DATA = {
  banca: null,
  area: { name: 'Polícia Civil — Agente / Escrivão', type: 'CONCURSO' },
  subjects: [
    { name: 'Língua Portuguesa', color: '#6366f1', topics: ['Interpretação Textual', 'Ortografia e Acentuação', 'Morfologia', 'Sintaxe', 'Semântica', 'Redação Oficial'] },
    { name: 'Noções de Direito Penal', color: '#ef4444', topics: ['Teoria do Crime', 'Crimes Contra a Pessoa', 'Crimes Contra o Patrimônio', 'Crimes Hediondos'] },
    { name: 'Noções de Direito Processual Penal', color: '#f59e0b', topics: ['Inquérito Policial', 'Prisão em Flagrante', 'Medidas Cautelares', 'Ação Penal'] },
    { name: 'Noções de Direito Constitucional', color: '#10b981', topics: ['Direitos Fundamentais', 'Segurança Pública', 'Organização do Estado'] },
    { name: 'Noções de Criminologia', color: '#8b5cf6', topics: ['Conceito e Escolas', 'Teoria da Anomia', 'Vitimologia', 'Política Criminal'] },
    { name: 'Raciocínio Lógico e Matemática', color: '#14b8a6', topics: ['Lógica Proposicional', 'Raciocínio Quantitativo', 'Probabilidade e Estatística Básica'] },
    { name: 'Atualidades e Conhecimentos Gerais', color: '#f97316', topics: ['Política Nacional', 'Segurança Pública e Legislação', 'Direitos Humanos'] },
  ],
};

const MEDICINA_DATA = {
  banca: { name: 'INEP — Revalida', description: 'Exame Nacional de Revalidação de Diplomas Médicos' },
  area: { name: 'Revalida / Residência Médica', type: 'VESTIBULAR' },
  subjects: [
    { name: 'Clínica Médica', color: '#ef4444', topics: ['Cardiologia', 'Pneumologia', 'Endocrinologia', 'Gastroenterologia', 'Nefrologia', 'Hematologia', 'Infectologia', 'Reumatologia'] },
    { name: 'Cirurgia', color: '#6366f1', topics: ['Trauma e Emergência Cirúrgica', 'Abdome Agudo', 'Cirurgia do Aparelho Digestivo', 'Técnica Cirúrgica'] },
    { name: 'Pediatria', color: '#10b981', topics: ['Crescimento e Desenvolvimento', 'Imunizações', 'Doenças Exantemáticas', 'Neonatologia', 'Urgências Pediátricas'] },
    { name: 'Ginecologia e Obstetrícia', color: '#f59e0b', topics: ['Pré-natal e Parto', 'Complicações Obstétricas', 'Patologias Ginecológicas', 'Planejamento Familiar'] },
    { name: 'Medicina Preventiva e Social', color: '#8b5cf6', topics: ['Epidemiologia', 'Vigilância em Saúde', 'SUS e Políticas de Saúde', 'Bioética'] },
    { name: 'Saúde Mental', color: '#ec4899', topics: ['Transtornos do Humor', 'Psicoses', 'Transtornos Ansiosos', 'Dependência Química'] },
  ],
};

async function seedArea(data) {
  let bancaId = null;

  if (data.banca) {
    const bancaRes = await pool.query(`
      INSERT INTO bancas (id, name, description, "createdAt")
      VALUES (gen_random_uuid(), $1, $2, NOW())
      ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
      RETURNING id
    `, [data.banca.name, data.banca.description]);
    bancaId = bancaRes.rows[0].id;
  }

  // Create Area
  const areaRes = await pool.query(`
    INSERT INTO areas (id, name, type, "bancaId", "isTemplate", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW())
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [data.area.name, data.area.type, bancaId]);

  if (areaRes.rows.length === 0) {
    // Area already exists - find it
    const existing = await pool.query(`SELECT id FROM areas WHERE name = $1 AND "isTemplate" = true`, [data.area.name]);
    if (existing.rows.length > 0) {
      console.log(`  Área "${data.area.name}" já existe, pulando...`);
      return;
    }
  }

  const areaId = areaRes.rows[0]?.id;
  if (!areaId) return;

  // Create AreaSubjects and AreaTopics
  for (const subj of data.subjects) {
    const subjRes = await pool.query(`
      INSERT INTO area_subjects (id, "areaId", name, color, "createdAt")
      VALUES (gen_random_uuid(), $1, $2, $3, NOW())
      RETURNING id
    `, [areaId, subj.name, subj.color]);
    const subjId = subjRes.rows[0].id;

    for (const topicName of subj.topics) {
      await pool.query(`
        INSERT INTO area_topics (id, "areaSubjectId", name, priority, "createdAt")
        VALUES (gen_random_uuid(), $1, $2, 3, NOW())
      `, [subjId, topicName]);
    }
  }

  console.log(`  ✅ "${data.area.name}" — ${data.subjects.length} disciplinas, ${data.subjects.reduce((a,s) => a + s.topics.length, 0)} tópicos`);
}

async function main() {
  console.log('\n🌱 Semeando templates de áreas de estudo...\n');

  await seedArea(ENEM_DATA);
  await seedArea(OAB_DATA);
  await seedArea(POLICIA_CIVIL_DATA);
  await seedArea(MEDICINA_DATA);

  console.log('\n✅ Templates prontos! O onboarding agora tem opções pré-definidas.\n');
  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
