import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando o seeding de matérias, tópicos e cards...');

  // 1. Garantir que o usuário teste existe e está verificado
  const email = 'teste@saafo.com';
  const name = 'Teste Completo';
  const passwordHash = await bcrypt.hash('123456', 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { emailVerified: true },
    create: {
      email,
      name,
      passwordHash,
      emailVerified: true,
      plan: 'PRO', // Vamos dar plano PRO para testar todas as funções
    },
  });

  console.log(`Usuário obtido/criado: ${user.name} (${user.id})`);

  // 2. Limpar dados anteriores do usuário para evitar duplicados ao rodar o seed novamente
  await prisma.card.deleteMany({ where: { userId: user.id } });
  await prisma.topic.deleteMany({
    where: {
      subject: { userId: user.id },
    },
  });
  await prisma.subject.deleteMany({ where: { userId: user.id } });

  console.log('Dados de teste antigos removidos.');

  // 3. Criar Matérias
  const subCalculo = await prisma.subject.create({
    data: {
      name: 'Cálculo I',
      color: '#3b82f6', // Azul
      userId: user.id,
    },
  });

  const subEstruturas = await prisma.subject.create({
    data: {
      name: 'Estruturas de Dados',
      color: '#ef4444', // Vermelho
      userId: user.id,
    },
  });

  const subBD = await prisma.subject.create({
    data: {
      name: 'Banco de Dados',
      color: '#10b981', // Verde
      userId: user.id,
    },
  });

  console.log('Matérias criadas com sucesso!');

  // 4. Criar Tópicos
  const topLimites = await prisma.topic.create({
    data: {
      name: 'Limites',
      subjectId: subCalculo.id,
    },
  });

  const topDerivadas = await prisma.topic.create({
    data: {
      name: 'Derivadas',
      subjectId: subCalculo.id,
    },
  });

  const topArvores = await prisma.topic.create({
    data: {
      name: 'Árvores Binárias',
      subjectId: subEstruturas.id,
    },
  });

  const topNormalizacao = await prisma.topic.create({
    data: {
      name: 'Normalização',
      subjectId: subBD.id,
    },
  });

  console.log('Tópicos criados com sucesso!');

  // 5. Criar Cards
  await prisma.card.createMany({
    data: [
      // Cálculo I - Limites
      {
        front: 'Qual é a definição intuitiva de limite?',
        back: 'O limite de f(x) quando x se aproxima de a é L se pudermos tornar f(x) tão próximo de L quanto quisermos, tornando x suficientemente próximo de a (mas não igual a a).',
        topicId: topLimites.id,
        userId: user.id,
      },
      {
        front: 'O que significa um limite lateral?',
        back: 'É o comportamento de f(x) à medida que x se aproxima de a por apenas um dos lados (pela direita/valores maiores, ou pela esquerda/valores menores).',
        topicId: topLimites.id,
        userId: user.id,
      },
      // Cálculo I - Derivadas
      {
        front: 'Qual é a derivada de x^n (Regra da Potência)?',
        back: 'd/dx (x^n) = n * x^(n-1)',
        topicId: topDerivadas.id,
        userId: user.id,
      },
      {
        front: 'Qual é a regra do produto para derivadas?',
        back: 'd/dx [f(x) * g(x)] = f\'(x)*g(x) + f(x)*g\'(x)',
        topicId: topDerivadas.id,
        userId: user.id,
      },
      // Estruturas de Dados - Árvores Binárias
      {
        front: 'O que é uma Árvore Binária de Busca (BST)?',
        back: 'É uma árvore binária onde para cada nó: todos os nós na subárvore esquerda possuem valores menores, e todos na subárvore direita possuem valores maiores.',
        topicId: topArvores.id,
        userId: user.id,
      },
      {
        front: 'Qual é o tempo de busca em uma BST balanceada?',
        back: 'O tempo médio de busca é O(log n).',
        topicId: topArvores.id,
        userId: user.id,
      },
      // Banco de Dados - Normalização
      {
        front: 'O que define a Primeira Forma Normal (1FN)?',
        back: 'Uma tabela está na 1FN se e somente se todos os seus atributos contiverem apenas valores atômicos (indivisíveis), ou seja, sem grupos repetitivos ou multivalorados.',
        topicId: topNormalizacao.id,
        userId: user.id,
      },
      {
        front: 'O que define a Segunda Forma Normal (2FN)?',
        back: 'A tabela deve estar na 1FN e todos os atributos não-chave devem depender totalmente da chave primária (sem dependência parcial de parte de uma chave composta).',
        topicId: topNormalizacao.id,
        userId: user.id,
      },
    ],
  });

  console.log('Cards de teste criados com sucesso!');
  console.log('Seeding de dados concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro ao executar o seed de dados:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
