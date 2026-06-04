import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { GeminiService } from '../src/infrastructure/ai/gemini.service';

describe('SAAFO HUB API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let tokenUser1: string;
  let tokenUser2: string;
  let userId1: string;

  let subjectId: string;
  let topicId: string;
  let cardId: string;
  let sessionId: string;

  const mockGeminiService = {
    generateFlashcards: jest.fn().mockResolvedValue([
      { front: 'Conceito IA 1', back: 'Explicação IA 1' },
      { front: 'Conceito IA 2', back: 'Explicação IA 2' },
    ]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GeminiService)
      .useValue(mockGeminiService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Clean up database before E2E tests run
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE users CASCADE;`);

    // Create 2 test users
    const user1 = await prisma.user.create({
      data: {
        email: 'user1@example.com',
        name: 'User One',
        nickname: 'user1',
      },
    });
    userId1 = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: 'user2@example.com',
        name: 'User Two',
        nickname: 'user2',
      },
    });
    userId2 = user2.id;

    // Generate JWT tokens
    tokenUser1 = jwtService.sign({ email: user1.email, sub: user1.id });
    tokenUser2 = jwtService.sign({ email: user2.email, sub: user2.id });
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE users CASCADE;`);
    await app.close();
  });

  describe('Autenticação e Proteção de Rotas', () => {
    it('deve rejeitar requisição sem JWT no endpoint de matérias (401)', async () => {
      await request(app.getHttpServer()).get('/subjects').expect(401);
    });
  });

  describe('Atualização de Perfil (Profile)', () => {
    it('deve permitir atualizar o nome, nickname e instituição do usuário com sucesso (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/profile')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          name: 'Novo Nome do User One',
          nickname: 'novonick1',
          institution: 'Universidade de São Paulo',
        })
        .expect(200);

      expect(res.body.name).toBe('Novo Nome do User One');
      expect(res.body.nickname).toBe('novonick1');
      expect(res.body.institution).toBe('Universidade de São Paulo');

      // Verificar persistência no banco
      const userInDb = await prisma.user.findUnique({ where: { id: userId1 } });
      expect(userInDb?.institution).toBe('Universidade de São Paulo');
    });
  });

  describe('CRUD de Matérias (Subjects)', () => {
    it('deve criar uma matéria com sucesso para o User 1 (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ name: 'Direito Constitucional', color: '#ff0000' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Direito Constitucional');
      expect(res.body.color).toBe('#ff0000');
      subjectId = res.body.id;
    });

    it('deve listar matérias do User 1 (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/subjects')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(subjectId);
    });

    it('deve retornar lista vazia para o User 2 que não possui matérias (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/subjects')
        .set('Authorization', `Bearer ${tokenUser2}`)
        .expect(200);

      expect(res.body).toHaveLength(0);
    });
  });

  describe('CRUD de Tópicos (Topics)', () => {
    it('deve impedir User 2 de criar tópicos na matéria do User 1 (403)', async () => {
      await request(app.getHttpServer())
        .post('/topics')
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ name: 'Direitos Fundamentais', subjectId })
        .expect(403);
    });

    it('deve permitir User 1 criar um tópico na sua própria matéria (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/topics')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ name: 'Direitos Fundamentais', subjectId })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Direitos Fundamentais');
      expect(res.body.subjectId).toBe(subjectId);
      topicId = res.body.id;
    });

    it('deve listar tópicos de uma matéria para o User 1 (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/topics?subjectId=${subjectId}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(topicId);
    });

    it('deve impedir User 2 de listar tópicos da matéria do User 1 (403)', async () => {
      await request(app.getHttpServer())
        .get(`/topics?subjectId=${subjectId}`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .expect(403);
    });
  });

  describe('CRUD de Flashcards (Cards)', () => {
    it('deve impedir User 2 de criar cards no tópico do User 1 (403)', async () => {
      await request(app.getHttpServer())
        .post('/cards')
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({
          front: 'Artigo 5º',
          back: 'Todos são iguais perante a lei',
          topicId,
        })
        .expect(403);
    });

    it('deve permitir User 1 criar um card no seu tópico (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/cards')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          front: 'Artigo 5º',
          back: 'Todos são iguais perante a lei',
          topicId,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.front).toBe('Artigo 5º');
      expect(res.body.back).toBe('Todos são iguais perante a lei');
      expect(res.body.topicId).toBe(topicId);
      cardId = res.body.id;
    });

    it('deve listar cards de um tópico para o User 1 (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/cards?topicId=${topicId}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(cardId);
    });

    it('deve impedir User 2 de listar cards do tópico do User 1 (403)', async () => {
      await request(app.getHttpServer())
        .get(`/cards?topicId=${topicId}`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .expect(403);
    });
  });

  describe('Sessões de Estudo & Algoritmo SM-2', () => {
    it('deve iniciar uma sessão de estudos com sucesso (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/study-sessions')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send()
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.userId).toBe(userId1);
      sessionId = res.body.id;
    });

    it('deve listar cards pendentes de revisão (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/study-sessions/due')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(cardId);
    });

    it('deve registrar uma revisão de card e atualizar o SM-2 (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/study-sessions/review')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cardId,
          sessionId,
          rating: 4,
        })
        .expect(201);

      expect(res.body.id).toBe(cardId);
      expect(res.body.repetitions).toBe(1);
      expect(res.body.interval).toBe(1);
      expect(new Date(res.body.nextReview).getTime()).toBeGreaterThan(
        Date.now(),
      );
    });

    it('deve impedir User 2 de revisar card do User 1 (403)', async () => {
      await request(app.getHttpServer())
        .post('/study-sessions/review')
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({
          cardId,
          sessionId, // Sessão do User 1
          rating: 5,
        })
        .expect(403);
    });
  });

  describe('Geração de Flashcards via IA (Gemini API)', () => {
    it('deve gerar e salvar flashcards via IA para o tópico do usuário (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/ai/generate')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          text: 'Texto sobre direitos individuais no artigo quinto.',
          topicId,
        })
        .expect(201);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0].front).toBe('Conceito IA 1');
      expect(res.body[1].front).toBe('Conceito IA 2');

      // Verificar no banco de dados se os cards foram criados sob o tópico
      const cardsInDb = await prisma.card.findMany({
        where: { topicId },
      });
      // 1 criado manualmente + 2 criados por IA = 3 cards totais
      expect(cardsInDb).toHaveLength(3);
    });

    it('deve impedir User 2 de gerar cards por IA no tópico do User 1 (403)', async () => {
      await request(app.getHttpServer())
        .post('/ai/generate')
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({
          text: 'Texto sobre direitos individuais no artigo quinto.',
          topicId,
        })
        .expect(403);
    });
  });

  describe('Métricas e Desempenho (Analytics)', () => {
    it('deve retornar as métricas analíticas consolidadas para o User 1 (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/metrics')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(200);

      expect(res.body).toHaveProperty('userId', userId1);
      expect(res.body.totalCards).toBe(3); // 1 manual + 2 gerados por IA
      expect(res.body.matureCardsCount).toBe(0);
      expect(res.body.learningCardsCount).toBe(1); // O card revisado com nota 4
      expect(res.body.newCardsCount).toBe(2); // Os 2 cards criados via IA que não foram revisados
      expect(res.body.retentionRate).toBe(100); // 1 revisão com nota 4 >= 3
      expect(res.body.averageRating).toBe(4.0);

      // Verificar as estruturas de atividade e projeção
      expect(Array.isArray(res.body.dailyActivity)).toBe(true);
      expect(res.body.dailyActivity).toHaveLength(30); // Limite padrão
      expect(Array.isArray(res.body.forecast)).toBe(true);
      expect(res.body.forecast).toHaveLength(7);

      // Verificar o detalhamento por matéria
      expect(Array.isArray(res.body.subjectsPerformance)).toBe(true);
      expect(res.body.subjectsPerformance).toHaveLength(1);
      expect(res.body.subjectsPerformance[0].subjectId).toBe(subjectId);
      expect(res.body.subjectsPerformance[0].totalCards).toBe(3);
      expect(res.body.subjectsPerformance[0].retentionRate).toBe(100);
    });

    it('deve permitir consultar métricas filtrando por outro limite de dias (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/metrics?days=7')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(200);

      expect(res.body.dailyActivity).toHaveLength(7);
    });
  });

  describe('Busca de Instituições de Ensino', () => {
    it('deve retornar lista padrão de instituições sem filtro (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/institutions')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(30);
      expect(res.body[0]).toHaveProperty('name');
    });

    it('deve filtrar instituições por termo de busca correto (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/institutions?search=USP')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].name).toBe('Universidade de São Paulo');
    });
  });

  describe('Remoção em Cadeia de Matérias (Cascade Delete)', () => {
    it('deve deletar a matéria do User 1 e apagar recursivamente tópicos e cards vinculados (200)', async () => {
      await request(app.getHttpServer())
        .delete(`/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(200);

      // Tópicos devem ter sido apagados em cascata
      const topics = await prisma.topic.findMany({ where: { subjectId } });
      expect(topics).toHaveLength(0);

      // Cards devem ter sido apagados em cascata
      const cards = await prisma.card.findMany({ where: { topicId } });
      expect(cards).toHaveLength(0);
    });
  });
});
