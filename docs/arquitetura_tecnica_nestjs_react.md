# Arquitetura Técnica — SAAFO HUB
## NestJS (Backend) + React (Frontend): Como tudo foi implementado e por quê

**Equipe Front-Enzos | ADS 3º Período | IFRO 2026**

---

## Sumário

1. [Por que NestJS e React?](#1-por-que-nestjs-e-react)
2. [Visão Geral da Arquitetura](#2-visão-geral-da-arquitetura)
3. [Backend — NestJS](#3-backend--nestjs)
   - 3.1 [Ponto de entrada: main.ts](#31-ponto-de-entrada-maints)
   - 3.2 [Módulos](#32-módulos)
   - 3.3 [Camada de Domínio — Entidades](#33-camada-de-domínio--entidades)
   - 3.4 [Camada de Domínio — Interfaces de Repositório](#34-camada-de-domínio--interfaces-de-repositório)
   - 3.5 [Camada de Aplicação — Use Cases](#35-camada-de-aplicação--use-cases)
   - 3.6 [Infraestrutura — Banco de dados com Prisma](#36-infraestrutura--banco-de-dados-com-prisma)
   - 3.7 [Infraestrutura — Controllers e DTOs](#37-infraestrutura--controllers-e-dtos)
   - 3.8 [Infraestrutura — Guards (Segurança)](#38-infraestrutura--guards-segurança)
   - 3.9 [Infraestrutura — Autenticação JWT e Google OAuth](#39-infraestrutura--autenticação-jwt-e-google-oauth)
   - 3.10 [Infraestrutura — Serviço de IA (Gemini)](#310-infraestrutura--serviço-de-ia-gemini)
   - 3.11 [Infraestrutura — Tarefas Agendadas (Cron)](#311-infraestrutura--tarefas-agendadas-cron)
   - 3.12 [O Algoritmo SM-2](#312-o-algoritmo-sm-2)
4. [Frontend — React](#4-frontend--react)
   - 4.1 [Ponto de entrada: main.tsx](#41-ponto-de-entrada-maintsx)
   - 4.2 [App.tsx — Roteamento e Providers](#42-apptsx--roteamento-e-providers)
   - 4.3 [AppContext — Estado Global](#43-appcontext--estado-global)
   - 4.4 [Páginas](#44-páginas)
   - 4.5 [Componentes Reutilizáveis](#45-componentes-reutilizáveis)
   - 4.6 [Custom Hooks](#46-custom-hooks)
   - 4.7 [Design System — CSS Tokens](#47-design-system--css-tokens)
   - 4.8 [Como o Frontend se comunica com o Backend](#48-como-o-frontend-se-comunica-com-o-backend)
5. [Fluxos Completos Ponta a Ponta](#5-fluxos-completos-ponta-a-ponta)
6. [Integrações Externas](#6-integrações-externas)
7. [Segurança — Camadas de Defesa](#7-segurança--camadas-de-defesa)
   - 7.1 [HTTP Headers (Helmet)](#71-http-headers-helmet)
   - 7.2 [CORS](#72-cors)
   - 7.3 [Rate Limiting (Throttler)](#73-rate-limiting-throttler)
   - 7.4 [Autenticação JWT + Refresh Token Rotation](#74-autenticação-jwt--refresh-token-rotation)
   - 7.5 [Guards de Autorização](#75-guards-de-autorização)
   - 7.6 [Validação de Payload (ValidationPipe)](#76-validação-de-payload-validationpipe)
   - 7.7 [Segurança de Pagamentos (Asaas)](#77-segurança-de-pagamentos-asaas)
   - 7.8 [Sanitização de Logs](#78-sanitização-de-logs)
   - 7.9 [Verificação de Variáveis de Ambiente](#79-verificação-de-variáveis-de-ambiente)
   - 7.10 [Segurança no Banco de Dados](#710-segurança-no-banco-de-dados)
   - 7.11 [Resumo — Matriz de Defesa](#711-resumo--matriz-de-defesa)

---

## 1. Por que NestJS e React?

### NestJS (Backend)

NestJS é um framework Node.js escrito em TypeScript que resolve o maior problema do Node puro: **a ausência de estrutura**. Um servidor Express simples não te diz onde colocar cada coisa — NestJS diz.

**O que ele resolve no SAAFO HUB:**
- **Injeção de dependência nativa** — o próprio framework cria as instâncias e as passa para quem precisa. Não precisamos instanciar classes manualmente.
- **Decoradores** — anotações como `@Controller`, `@Get`, `@Injectable` tornam o código autodescritivo.
- **Módulos** — cada funcionalidade (auth, materiais, calendário) vive isolada no seu módulo.
- **Pipes de validação** — o `ValidationPipe` rejeita automaticamente requisições com dados inválidos.
- **Guards** — middleware de autorização declarativo (`@UseGuards(JwtAuthGuard)`).
- **Scheduler** — tarefas cron com `@Cron` sem configuração adicional.

### React (Frontend)

React é uma biblioteca de UI que constrói interfaces como uma árvore de componentes. Cada componente é uma função que recebe dados (props/estado) e retorna o que deve aparecer na tela.

**O que ele resolve no SAAFO HUB:**
- **Estado reativo** — quando um card é revisado, o contador de "cards devidos" na sidebar atualiza automaticamente.
- **SPA (Single Page Application)** — a navegação acontece sem recarregar a página, usando React Router.
- **Composição** — a página de Materiais é composta de vários componentes menores (lista de matérias, formulário de tópico, etc.).
- **Context API** — compartilha dados globais (usuário logado, cards, tema) entre todos os componentes sem prop drilling.

---

## 2. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
│  main.tsx → App.tsx → AppProvider → Páginas/Componentes     │
│  Comunicação com o backend via fetch() + JWT Bearer Token   │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP REST (JSON)
                      │ CORS autorizado apenas para FRONTEND_URL
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (NestJS)                        │
│                                                             │
│  main.ts (bootstrap)                                        │
│     └── AppModule                                           │
│          ├── AuthModule      → AuthController               │
│          ├── MaterialsModule → SubjectController            │
│          │                    TopicController               │
│          │                    CardController                │
│          │                    StudySessionController        │
│          ├── CalendarModule  → CalendarController           │
│          ├── InsightsModule  → InsightsController           │
│          ├── BillingModule   → BillingController            │
│          ├── ProfileModule   → ProfileController            │
│          └── PomodoroModule  → PomodoroController           │
│                                                             │
│  Camadas (Clean Architecture):                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ domain/entities/    — Regras de negócio puras       │   │
│  │ domain/repositories/ — Interfaces (contratos)       │   │
│  │ domain/services/    — Algoritmo SM-2                │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ application/use-cases/ — Orquestração               │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ infrastructure/database/ — Prisma (PostgreSQL)      │   │
│  │ infrastructure/ai/       — Gemini 2.5 Flash         │   │
│  │ infrastructure/payments/ — Asaas                    │   │
│  │ infrastructure/notifications/ — WhatsApp / Email    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           PostgreSQL 16 (via Docker)                        │
│  Tabelas: User, Subject, Topic, Card, StudySession,         │
│           CalendarEvent, EventReminder, RefreshToken, ...   │
└─────────────────────────────────────────────────────────────┘
```

O backend adota **Clean Architecture**: o domínio (regras de negócio) não conhece o banco de dados, nem a IA, nem o NestJS. Só conhece as interfaces. Isso permite, por exemplo, trocar o PostgreSQL por outro banco sem mudar uma linha de lógica de negócio.

---

## 3. Backend — NestJS

### 3.1 Ponto de entrada: main.ts

```typescript
// backend/src/main.ts
async function bootstrap() {
  validateEnv();                          // Garante variáveis de ambiente obrigatórias
  const app = await NestFactory.create(AppModule, { logger });

  app.use(helmet({                        // Headers HTTP de segurança (ver seção 7.1)
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
  }));
  app.use(cookieParser());                // Lê cookies (refresh token)

  app.enableCors({                        // Aceita requisições apenas do frontend (ver seção 7.2)
    origin: process.env.FRONTEND_URL!.split(',').map(o => o.trim()),
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // Remove campos não declarados no DTO
    forbidNonWhitelisted: true,// Rejeita requisições com campos extras
    transform: true,           // Converte tipos automaticamente (string → Date, etc.)
  }));

  await app.listen(process.env.PORT || 3000);
}
```

**O que cada linha faz:**
- `NestFactory.create(AppModule)` — cria a aplicação a partir do módulo raiz.
- `helmet()` — adiciona ~15 headers HTTP que previnem ataques comuns (XSS, Clickjacking, etc.).
- `enableCors` — sem isso, o browser bloquearia todas as requisições do frontend para o backend.
- `ValidationPipe` — valida automaticamente o corpo de todas as requisições com base nos DTOs.

---

### 3.2 Módulos

No NestJS, um **módulo** agrupa controllers, services e providers relacionados. O `AppModule` é o módulo raiz que importa todos os outros.

```typescript
// backend/src/app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),  // Variáveis .env disponíveis em todo lugar
    ScheduleModule.forRoot(),                   // Habilita o @Cron
    ThrottlerModule.forRoot([{
      ttl: 60000,   // Janela de 60 segundos
      limit: 150,   // Máximo 150 requisições por janela por IP
    }]),
    DatabaseModule,    // Prisma + repositórios
    AuthModule,        // Login, registro, JWT, Google OAuth
    MaterialsMemoryModule, // Matérias, tópicos, cards, sessões de estudo
    CalendarModule,    // Eventos do calendário e lembretes
    BillingModule,     // Planos, checkout Asaas, webhooks
    InsightsModule,    // Insights de IA do dashboard
    AdminModule,       // Painel administrativo
    PomodoroModule,    // Dados de sessões Pomodoro
    LoggerModule,      // Logger estruturado com Pino
  ],
  providers: [
    { provide: APP_GUARD,       useClass: ThrottlerGuard },     // Rate limiting global
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }, // Log de todas as requisições
  ],
})
export class AppModule {}
```

**Por que separar em módulos?**

Cada módulo é um "namespace" independente. O `AuthModule` não sabe que o `CalendarModule` existe. Isso evita dependências circulares e facilita encontrar o código de cada funcionalidade.

**Exemplo: AuthModule**

```typescript
// backend/src/infrastructure/http/modules/auth.module.ts
@Module({
  imports: [
    DatabaseModule,   // Precisa do IUserRepository para criar/buscar usuários
    PassportModule,   // Estratégias de autenticação
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },  // Access token expira em 15 minutos
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, ResendService, CleanupService],
})
export class AuthModule {}
```

---

### 3.3 Camada de Domínio — Entidades

As **entidades de domínio** são classes TypeScript puras — sem decoradores do NestJS, sem Prisma, sem nada de infraestrutura. Elas representam o modelo de negócio.

**Entidade Card (flashcard)**

```typescript
// backend/src/domain/entities/card.ts
export class Card {
  constructor(
    public readonly id: string,
    public front: string,       // Frente do card (pergunta)
    public back: string,        // Verso do card (resposta)
    public topicId: string,     // Tópico ao qual pertence
    public userId: string,      // Dono do card
    public repetitions: number, // Quantas vezes foi revisado com sucesso (SM-2)
    public interval: number,    // Intervalo atual em dias (SM-2)
    public easeFactor: number,  // Fator de facilidade (SM-2, começa em 2.5)
    public nextReview: Date,    // Próxima data de revisão calculada pelo SM-2
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}
```

**Por que não usar diretamente o modelo do Prisma?**

O modelo do Prisma é o espelho do banco de dados. Ele pode ter colunas técnicas que não fazem sentido para a lógica de negócio, ou pode faltar métodos que a lógica precisaria. Separamos o modelo de domínio do modelo de persistência para que o negócio não dependa do banco.

**Entidade User**

```typescript
// backend/src/domain/entities/user.ts
export class User {
  constructor(
    public readonly id: string,
    public email: string,
    public name: string,
    public nickname?: string | null,
    public googleId?: string | null,
    public passwordHash?: string | null,
    public plan?: string,           // 'FREE_TRIAL' | 'STUDENT' | 'EXPIRED'
    public trialEndsAt?: Date | null,
    public asaasCustomerId?: string | null,
    public asaasSubscriptionId?: string | null,
    // ... outros campos
  ) {}

  // Getter calculado — encapsulamento: ninguém de fora precisa conhecer a lógica
  get isActivePlan(): boolean {
    if (this.plan === 'STUDENT') return true;
    if (this.plan === 'FREE_TRIAL' && this.trialEndsAt && new Date() <= this.trialEndsAt)
      return true;
    return false;
  }

  // Quantos dias faltam para o trial acabar
  get trialDaysLeft(): number {
    if (this.plan !== 'FREE_TRIAL' || !this.trialEndsAt) return 0;
    return Math.max(0, Math.ceil((this.trialEndsAt.getTime() - Date.now()) / 86_400_000));
  }
}
```

O `isActivePlan` e `trialDaysLeft` são **getters encapsulados**: a regra "um usuário com plano STUDENT sempre tem acesso" vive dentro da entidade, não espalhada por vários controllers.

---

### 3.4 Camada de Domínio — Interfaces de Repositório

Repositórios são a "porta de saída" do domínio para o banco de dados. O domínio define **o que** precisa (a interface), e a infraestrutura define **como** fazer (a implementação com Prisma).

```typescript
// backend/src/domain/repositories/card-repository.interface.ts
export interface ICardRepository {
  findById(id: string): Promise<Card | null>;
  findByTopicId(topicId: string): Promise<Card[]>;
  findByUserId(userId: string): Promise<Card[]>;
  findDueCards(userId: string, date: Date): Promise<Card[]>; // Cards com nextReview <= hoje
  countGeneratedToday(userId: string): Promise<number>;
  create(card: Partial<Card>): Promise<Card>;
  update(id: string, card: Partial<Card>): Promise<Card>;
  delete(id: string): Promise<void>;
}
```

**Por que usar uma interface?**

Se amanhã quisermos trocar PostgreSQL por MongoDB, basta criar um `MongoCardRepository` que implementa `ICardRepository`. Os use cases não precisam mudar — eles só conhecem a interface, nunca a implementação concreta.

---

### 3.5 Camada de Aplicação — Use Cases

Use cases orquestram o que acontece quando o usuário executa uma ação. Eles recebem as interfaces de repositório (não as implementações) e executam a lógica de negócio.

**CreateCardUseCase — criar um flashcard**

```typescript
// backend/src/application/use-cases/create-card.use-case.ts
export class CreateCardUseCase {
  constructor(
    private cardRepository: ICardRepository,
    private topicRepository: ITopicRepository,
    private subjectRepository: ISubjectRepository,
  ) {}

  async execute(input: CreateCardInput): Promise<Card> {
    // 1. Validação de dados
    if (!input.front.trim() || !input.back.trim()) {
      throw new Error('Card front and back content cannot be empty');
    }

    // 2. Verificar se o tópico existe
    const topic = await this.topicRepository.findById(input.topicId);
    if (!topic) throw new Error('Topic not found');

    // 3. Verificar se o usuário tem acesso ao tópico (autorização)
    const subject = await this.subjectRepository.findById(topic.subjectId);
    if (!subject || subject.userId !== input.userId)
      throw new Error('Unauthorized access to topic');

    // 4. Criar o card com valores iniciais do SM-2
    return this.cardRepository.create({
      front: input.front,
      back: input.back,
      topicId: input.topicId,
      userId: input.userId,
      repetitions: 0,    // Nunca foi revisado
      interval: 0,       // Intervalo inicial
      easeFactor: 2.5,   // Fator padrão do SM-2
      nextReview: new Date(), // Disponível para revisão imediatamente
    });
  }
}
```

**ReviewCardUseCase — revisar um card com SM-2**

```typescript
// backend/src/application/use-cases/review-card.use-case.ts
export class ReviewCardUseCase {
  constructor(
    private cardRepository: ICardRepository,
    private studySessionRepository: IStudySessionRepository,
  ) {}

  async execute(input: ReviewCardInput): Promise<Card> {
    // 1. Buscar o card e verificar dono
    const card = await this.cardRepository.findById(input.cardId);
    if (!card) throw new Error('Card not found');
    if (card.userId !== input.userId) throw new Error('Unauthorized access to card');

    // 2. Verificar se a sessão de estudo está ativa
    const session = await this.studySessionRepository.findById(input.sessionId);
    if (!session || session.userId !== input.userId) throw new Error('Unauthorized');
    if (session.endedAt !== null) throw new Error('Study session is already closed');

    // 3. Calcular novo intervalo com SM-2
    const calculation = SpacedRepetitionService.calculate(
      input.rating,         // Nota 0-5 do usuário
      card.repetitions,     // Histórico de repetições
      card.interval,        // Intervalo atual
      card.easeFactor,      // Fator de facilidade atual
    );

    // 4. Persistir os novos valores no banco
    const updatedCard = await this.cardRepository.update(input.cardId, {
      repetitions: calculation.repetitions,
      interval:    calculation.interval,
      easeFactor:  calculation.easeFactor,
      nextReview:  calculation.nextReview,
    });

    // 5. Registrar no log da sessão (para métricas e heatmap)
    await this.studySessionRepository.createReview({
      cardId:     input.cardId,
      sessionId:  input.sessionId,
      rating:     input.rating,
      reviewedAt: new Date(),
    });

    return updatedCard;
  }
}
```

---

### 3.6 Infraestrutura — Banco de dados com Prisma

O Prisma é o ORM que traduz objetos TypeScript em queries SQL. Ele tem três partes:

1. **`schema.prisma`** — define a estrutura do banco (tabelas, colunas, relações).
2. **`PrismaService`** — wrapper do cliente Prisma como serviço NestJS.
3. **Repositórios Prisma** — implementam as interfaces de domínio usando o Prisma.

**Como o PrismaCardRepository funciona:**

```typescript
// backend/src/infrastructure/database/prisma-card.repository.ts
@Injectable()
export class PrismaCardRepository implements ICardRepository {
  constructor(private prisma: PrismaService) {}

  // Traduz o modelo do Prisma (do banco) para a entidade de domínio
  private toDomain(prismaCard: PrismaCard): Card {
    return new Card(
      prismaCard.id,
      prismaCard.front,
      prismaCard.back,
      prismaCard.topicId,
      prismaCard.userId,
      prismaCard.repetitions,
      prismaCard.interval,
      prismaCard.easeFactor,
      prismaCard.nextReview,
      prismaCard.createdAt,
      prismaCard.updatedAt,
    );
  }

  async findDueCards(userId: string, date: Date): Promise<Card[]> {
    const cards = await this.prisma.card.findMany({
      where: {
        userId,
        nextReview: { lte: date }, // lte = "less than or equal" (menor ou igual)
      },
      orderBy: { nextReview: 'asc' }, // Mais antigos primeiro
    });
    return cards.map(this.toDomain); // Cada card do Prisma vira uma entidade de domínio
  }

  async create(card: Partial<Card>): Promise<Card> {
    const created = await this.prisma.card.create({
      data: {
        front: card.front!,
        back:  card.back!,
        topicId:     card.topicId!,
        userId:      card.userId!,
        repetitions: card.repetitions ?? 0,
        interval:    card.interval    ?? 0,
        easeFactor:  card.easeFactor  ?? 2.5,
        nextReview:  card.nextReview  ?? new Date(),
      },
    });
    return this.toDomain(created);
  }
}
```

**Como o DatabaseModule injeta os repositórios:**

```typescript
// backend/src/infrastructure/database/database.module.ts
@Module({
  providers: [
    PrismaService,
    // O token 'ICardRepository' é a "chave" usada pelo @Inject em outros módulos
    { provide: 'ICardRepository', useClass: PrismaCardRepository },
    { provide: 'IUserRepository', useClass: PrismaUserRepository },
    // ... todos os outros repositórios
  ],
  exports: ['ICardRepository', 'IUserRepository', /* ... */],
})
export class DatabaseModule {}
```

Quando um controller ou use case usa `@Inject('ICardRepository')`, o NestJS vai para o módulo, encontra o token e injeta o `PrismaCardRepository`. Se amanhã trocarmos para `MongoCardRepository`, só mudamos o `useClass` aqui.

---

### 3.7 Infraestrutura — Controllers e DTOs

Controllers recebem as requisições HTTP, validam os dados com DTOs, chamam os use cases e devolvem a resposta.

**DTOs (Data Transfer Objects)** são classes que definem a forma dos dados que chegam nas requisições. O `ValidationPipe` global usa as anotações do `class-validator` para rejeitar dados inválidos.

**Exemplo: AuthController (registro e login)**

```typescript
// backend/src/infrastructure/http/controllers/auth.controller.ts

// DTO de registro — define exatamente o que o corpo da requisição deve ter
class RegisterDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsEmail({}, { message: 'E-mail inválido' })
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, { message: 'E-mail inválido' })
  email: string;

  @IsString() @IsNotEmpty()
  name: string;

  @IsString() @MinLength(6)
  password: string;
}

@Controller('auth')           // Prefixo de todas as rotas deste controller
export class AuthController {
  constructor(
    @Inject('IUserRepository') private userRepository: IUserRepository,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private resendService: ResendService,
  ) {}

  @Post('register')           // POST /auth/register
  async register(@Body() body: RegisterDto) {
    // @Body() extrai e valida o corpo da requisição contra RegisterDto
    const existing = await this.userRepository.findByEmail(body.email);
    if (existing) throw new BadRequestException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(body.password, 12); // 12 rounds de bcrypt
    const user = await this.userRepository.create({
      email: body.email,
      name: body.name,
      passwordHash,
      emailVerified: false,
    });

    // Envia e-mail de verificação via Resend
    const verifyToken = this.signEmailVerifyToken(user.id);
    await this.resendService.sendVerificationEmail(user.email, user.name, verifyUrl);

    return { message: `Email de verificação enviado para ${user.email}.` };
  }

  @Post('login')              // POST /auth/login
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.userRepository.findByEmail(body.email);
    if (!user || !user.passwordHash)
      throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    if (!user.emailVerified)
      throw new ForbiddenException('E-mail não verificado.');

    // Emite refresh token em cookie HttpOnly (não acessível via JavaScript)
    await this.issueRefreshToken(user.id, crypto.randomUUID(), res);

    return {
      access_token: this.signAccessToken(user.id, user.email),
      user: { id: user.id, email: user.email, name: user.name },
    };
  }
}
```

**Por que cookies HttpOnly para o refresh token?**

O access token JWT (15min) é armazenado em memória no frontend (no `useState`). O refresh token (7 dias) fica em um cookie `HttpOnly`, que o JavaScript **não consegue ler**. Isso evita ataques XSS: mesmo que um script malicioso rode na página, ele não consegue roubar o refresh token.

---

### 3.8 Infraestrutura — Guards (Segurança)

Guards são middleware que decidem se uma requisição pode prosseguir. No SAAFO HUB existem três:

**JwtAuthGuard — verifica se o usuário está autenticado**

```typescript
// backend/src/infrastructure/http/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
// Herda toda a lógica do Passport.js + estratégia JWT definida em jwt.strategy.ts
```

**JwtStrategy — como o JWT é validado**

```typescript
// backend/src/infrastructure/http/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Extrai o token do header: Authorization: Bearer <token>
      ignoreExpiration: false,    // Tokens expirados são rejeitados
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: { sub: string; email: string }) {
    // O que retorna aqui fica disponível como req.user nos controllers
    return { id: payload.sub, email: payload.email };
  }
}
```

**PlanGuard — verifica se o plano do usuário está ativo**

```typescript
// backend/src/infrastructure/http/guards/plan.guard.ts
@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.id; // Vem do JwtAuthGuard
    if (!userId) throw new UnauthorizedException();

    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException();

    // Usa o getter encapsulado da entidade User
    if (user.isActivePlan) return true;

    // Erro 402 Payment Required — o frontend identifica e abre o modal de upgrade
    throw new HttpException({
      message: 'Seu período gratuito expirou.',
      code: 'PLAN_EXPIRED',
      trialEndsAt: user.trialEndsAt,
    }, 402);
  }
}
```

Os guards são aplicados nos controllers assim:

```typescript
@UseGuards(JwtAuthGuard, PlanGuard)   // Ambos os guards em sequência
@Post('generate')
async generateFlashcards(...) { ... }
```

---

### 3.9 Infraestrutura — Autenticação JWT e Google OAuth

O fluxo de autenticação tem dois caminhos:

**Caminho 1 — E-mail e senha:**
```
1. POST /auth/register → hash bcrypt da senha → envia e-mail de verificação
2. Usuário clica no link → GET /auth/verify-email?token=... → marca emailVerified=true
3. POST /auth/login → verifica senha + emailVerified → emite access_token (15min) + refresh_token (7 dias, cookie HttpOnly)
4. POST /auth/refresh → válida refresh token → rotaciona (invalida o antigo, emite novo) → novo access_token
```

**Caminho 2 — Google OAuth:**
```
1. Frontend usa @react-oauth/google → obtém id_token do Google
2. POST /auth/google { token: id_token } → backend valida com OAuth2Client
3. Backend cria/atualiza usuário com googleId → emite access_token + refresh_token
```

**Rotação de refresh token (segurança):**

Cada refresh gera um novo refresh token e invalida o anterior. Se alguém usar um token já consumido (ataque de reutilização), todo o "family" de tokens do usuário é revogado imediatamente.

---

### 3.10 Infraestrutura — Serviço de IA (Gemini)

O `GeminiService` chama a API do Google Gemini 2.5 Flash diretamente via `fetch()`. Há quatro funcionalidades:

**1. Geração de flashcards**

```typescript
// backend/src/infrastructure/ai/gemini.service.ts

const SYSTEM_PROMPT = `Você é um especialista em educação ativa e memorização espaçada.
// ... instruções de como gerar cards de qualidade
`;

async generateFlashcards(options: GeminiGenerateOptions): Promise<GeneratedCard[]> {
  const payload = {
    contents: [{ parts: [...arquivoParts, { text: instrucaoUsuario }] }],
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          cards: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                front: { type: 'STRING' },
                back:  { type: 'STRING' },
              },
              required: ['front', 'back'],
            },
          },
        },
      },
    },
  };

  const res = await fetch(`${this.baseUrl}/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  const rawText = data.candidates[0].content.parts[0].text;
  return JSON.parse(rawText).cards;
}
```

**Por que `responseSchema`?**

Sem o schema, o Gemini poderia retornar texto livre no formato que quisesse. Com o `responseSchema`, o Gemini é **forçado a retornar JSON no formato exato** que esperamos, eliminando a necessidade de parsing frágil.

**2. Arquivos grandes (> 5 MB):**

Para PDFs e imagens grandes, o arquivo é enviado primeiro à Files API do Google, que retorna uma URI. Essa URI é usada na requisição de geração, evitando o limite de payload.

```typescript
private async buildParts(options: GeminiGenerateOptions): Promise<object[]> {
  if (!options.fileBuffer || !options.mimeType) return [];

  if (options.fileBuffer.length <= 5 * 1024 * 1024) {
    // Arquivo pequeno: envia inline em base64
    return [{ inlineData: { mimeType: options.mimeType, data: options.fileBuffer.toString('base64') } }];
  }

  // Arquivo grande: faz upload para Files API e usa a URI
  const fileUri = await this.uploadToFilesApi(options.fileBuffer, options.mimeType);
  return [{ fileData: { mimeType: options.mimeType, fileUri } }];
}
```

**3. Geração de Exames (3 perfis):**

O `generateExam` aceita um `profileId` que seleciona o prompt do sistema adequado:
- `'quick'` — questões diretas de revisão (reconhecimento)
- `'applied'` — questões situacionais (aplicação)
- `'contextual'` — estilo ENEM com texto-base longo (análise)

**4. Avaliação de respostas dissertativas:**

Envia a questão, o gabarito esperado e a resposta do aluno. O Gemini retorna nota (0–10), feedback, pontos acertados e pontos faltantes.

---

### 3.11 Infraestrutura — Tarefas Agendadas (Cron)

O `@nestjs/schedule` permite definir tarefas que rodam em intervalos com o decorador `@Cron`.

```typescript
// backend/src/infrastructure/notifications/reminder-scheduler.service.ts
@Injectable()
export class ReminderSchedulerService {
  constructor(
    @Inject('IEventReminderRepository') private reminderRepo: IEventReminderRepository,
    private evoApiService: EvoApiService,   // WhatsApp
    private resendService: ResendService,   // E-mail
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)  // Executa a cada 1 minuto
  async processDueReminders(): Promise<void> {
    // 1. Busca todos os lembretes com scheduledAt <= agora e que não foram enviados
    const due = await this.reminderRepo.findDueAndUnsent();

    for (const reminder of due) {
      await this.sendReminder(reminder);       // Envia via WhatsApp ou e-mail
      await this.reminderRepo.markSent(reminder.id); // Marca como enviado

      // Se é um evento recorrente, cria o próximo lembrete
      if (reminder.event.recurrenceDays.length > 0) {
        const nextDate = this.nextRecurringDate(
          reminder.event.startAt,
          reminder.event.recurrenceDays,
          reminder.event.recurrenceEndsAt,
        );
        if (nextDate) await this.reminderRepo.createNext(...);
      }
    }
  }

  private async sendReminder(reminder: DueReminder): Promise<void> {
    const message =
      `🎯 *SAAFO HUB — Lembrete*\n\n` +
      `${label}: *${event.title}*\n` +
      `🕐 ${timeStr}\n` +
      `⏱ Começa em ${when}`;

    if (reminder.method === 'WHATSAPP' && event.user.phone) {
      await this.evoApiService.sendWhatsApp(event.user.phone, message);
    } else if (reminder.method === 'EMAIL') {
      await this.resendService.sendReminderEmail(...);
    }
  }
}
```

---

### 3.12 O Algoritmo SM-2

O SuperMemo-2 é um algoritmo de repetição espaçada que calcula quando você deve rever um card com base em quão fácil ele foi para você.

```typescript
// backend/src/domain/services/spaced-repetition.service.ts
export class SpacedRepetitionService {
  public static calculate(
    rating: number,              // Nota 0-5 dada pelo usuário
    previousRepetitions: number, // Quantas revisões bem-sucedidas consecutivas
    previousInterval: number,    // Intervalo atual em dias
    previousEaseFactor: number,  // Fator de facilidade (EF, começa em 2.5)
    now: Date = new Date(),
  ) {
    const q = Math.max(0, Math.min(5, Math.round(rating))); // Garante entre 0 e 5

    let repetitions = previousRepetitions;
    let interval = previousInterval;
    let easeFactor = previousEaseFactor;

    if (q < 3) {
      // Esqueceu: reseta para o início
      repetitions = 0;
      interval = 1; // Revisar amanhã
    } else {
      // Acertou: calcula novo intervalo
      if (repetitions === 0)      interval = 1;   // 1ª revisão: amanhã
      else if (repetitions === 1) interval = 6;   // 2ª revisão: em 6 dias
      else interval = Math.round(previousInterval * previousEaseFactor); // Cresce com EF

      // Fórmula SM-2 para o fator de facilidade:
      // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
      const efChange = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
      easeFactor = previousEaseFactor + efChange;

      repetitions += 1;
    }

    // EF nunca cai abaixo de 1.3 (regra do SM-2)
    if (easeFactor < 1.3) easeFactor = 1.3;

    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + interval);

    return { repetitions, interval, easeFactor, nextReview };
  }
}
```

**Exemplo prático:**

| Situação | Rating | Intervalo resultado | Próxima revisão |
|---|---|---|---|
| Card novo, acertei fácil (5) | 5 | 1 dia | Amanhã |
| 2ª revisão, fácil | 5 | 6 dias | Em 6 dias |
| 3ª revisão (EF=2.5), fácil | 5 | 6 × 2.5 = 15 dias | Em 15 dias |
| Esqueci (rating 1) | 1 | 1 dia | Amanhã (reseta) |

O `SpacedRepetitionService` é uma classe do **domínio** (não tem `@Injectable()`), pois é lógica pura de negócio. O `ReviewCardUseCase` é quem a chama.

---

## 4. Frontend — React

### 4.1 Ponto de entrada: main.tsx

```typescript
// frontend/src/main.tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
);
```

`StrictMode` renderiza componentes duas vezes em desenvolvimento para detectar efeitos colaterais não intencionais. `GoogleOAuthProvider` disponibiliza o contexto do Google OAuth para toda a aplicação.

---

### 4.2 App.tsx — Roteamento e Providers

```typescript
// frontend/src/App.tsx
export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppProvider>      {/* Contexto global — ver seção 4.3 */}
        <AppShell />
      </AppProvider>
    </GoogleOAuthProvider>
  );
}

function AppShell() {
  const { token, checkoutOpen, planSelectionOpen, ... } = useApp();
  const updateAvailable = useVersionCheck();

  // Se não tem token, mostra a tela de autenticação
  if (!token) return <Auth />;

  // Com token, mostra o app completo
  return (
    <BrowserRouter>
      <Routes>
        {/* AppLayout é o "shell" com Sidebar. Outlet renderiza a página atual */}
        <Route element={<AppLayout />}>
          <Route index         element={<Dashboard />}    />
          <Route path="materiais"  element={<Materials />}   />
          <Route path="cards"      element={<MyCards />}     />
          <Route path="ia"         element={<AIGenerator />} />
          <Route path="calendario" element={<CalendarPage />}/>
          <Route path="pomodoro"   element={<Pomodoro />}    />
          <Route path="provas"     element={<ExamSession />} />
          <Route path="perfil"     element={<Profile />}     />
          <Route path="admin"      element={<Admin />}       />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      {/* Modais globais renderizados fora do Outlet */}
      <UpdateBanner visible={updateAvailable} />
      <UpgradeModal />
      <CheckoutModal open={checkoutOpen} onClose={...} />
      <PlanSelectionModal ... />
    </BrowserRouter>
  );
}
```

**Por que `<Route element={<AppLayout />}>`?**

`AppLayout` é um layout aninhado. Ele renderiza a Sidebar + o header e deixa um `<Outlet />` onde a página atual é renderizada. Todas as rotas filhas compartilham automaticamente a sidebar e o header, sem repetir código.

```typescript
// frontend/src/components/layout/AppLayout.tsx
// (simplificado)
export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />   {/* A página atual vai aqui */}
      </main>
      <ToastContainer />
      <StudySessionOverlay />
    </div>
  );
}
```

---

### 4.3 AppContext — Estado Global

O `AppContext` é o coração do frontend. Ele centraliza todo o estado compartilhado entre páginas: dados do usuário, matérias, cards, calendário, sessão de estudo e modais.

**Por que usar Context em vez de passar props?**

Se a Sidebar precisasse do contador de cards devidos e a página de Materiais também, sem Context teríamos que passar o dado por vários componentes intermediários que não precisam dele (prop drilling). O Context resolve isso: qualquer componente chama `useApp()` e acessa o estado diretamente.

**Estrutura do AppProvider:**

```typescript
// frontend/src/contexts/AppContext.tsx (simplificado)
export function AppProvider({ children }: { children: React.ReactNode }) {
  // ── Auth
  const [token,       setToken]       = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const tokenRef = useRef<string | null>(null);
  const refreshingRef = useRef<Promise<string | null> | null>(null);

  // ── Tema (dark/light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  // Aplica a classe no <html> quando o tema muda
  useEffect(() => {
    document.documentElement.classList.toggle('dark-theme', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ── Dados da aplicação
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics,   setTopics]   = useState<Topic[]>([]);
  const [cards,    setCards]    = useState<Card[]>([]);
  const [metrics,  setMetrics]  = useState<Metrics | null>(null);
  // ... e muitos outros

  // ── Sessão de estudo
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionCards,    setSessionCards]    = useState<Card[]>([]);
  const [currentSessionCardIndex, ...] = useState(0);

  // ── API call com renovação automática de token
  const apiCall = useCallback(async (endpoint: string, options?: RequestInit) => {
    // Tenta com o access token atual
    // Se receber 401, tenta renovar com POST /auth/refresh
    // Se renovar com sucesso, repete a requisição original
    // Se falhar, faz logout
  }, [token]);

  // Computed: matérias visíveis no espaço de estudo ativo
  const visibleSubjects = useMemo(() =>
    activeSpaceId
      ? subjects.filter(s => s.studySpaceId === activeSpaceId)
      : subjects,
    [subjects, activeSpaceId]
  );

  return (
    <AppContext.Provider value={{ token, currentUser, theme, /* ... todos os estados e funções */ }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook para consumir o contexto
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
```

**Padrões importantes:**

- **`tokenRef`** — `useRef` que espelha o `token` state. Usado dentro de `useCallback` para evitar closures desatualizadas (stale closure problem).
- **`refreshingRef`** — serializa tentativas concorrentes de refresh. Se 3 requisições falharem simultaneamente com 401, apenas uma faz o POST `/auth/refresh`.
- **`useMemo` para `visibleSubjects`** — recalcula apenas quando `subjects` ou `activeSpaceId` mudam, evitando recálculos desnecessários.
- **`useCallback` para funções** — estabiliza a referência das funções para não recriar componentes filhos desnecessariamente.

---

### 4.4 Páginas

Cada página é um componente React que usa o `useApp()` para acessar dados e funções.

**Dashboard.tsx** — exibe métricas, heatmap de atividade e insights de IA.

**Materials.tsx** — gerencia matérias, tópicos e cards. Chama `handleCreateSubject`, `handleCreateTopic`, `handleCreateCard` do contexto.

**AIGenerator.tsx** — permite upload de texto, PDF ou imagem e chama `POST /ai/generate` para criar flashcards com Gemini.

**ExamSession.tsx** — permite gerar simulados em 3 perfis (rápido, aplicado, contextual) e avalia respostas dissertativas.

**CalendarPage.tsx** — exibe eventos do mês, permite criar eventos com lembretes por WhatsApp ou e-mail.

**Pomodoro.tsx** — timer com ciclos de foco/pausa e áudio ambiente via YouTube IFrame API.

**Profile.tsx** — edita dados do usuário, telefone para WhatsApp e controla o plano.

---

### 4.5 Componentes Reutilizáveis

**StudySessionOverlay.tsx**

Overlay em tela cheia para a sessão de revisão de flashcards. Escuta eventos de teclado globais:

```typescript
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !isCardFlipped) {
      e.preventDefault();
      setIsCardFlipped(true);
    } else if (isCardFlipped && e.key >= '1' && e.key <= '5') {
      handleReviewCard(parseInt(e.key));   // Nota via teclado
    } else if (e.key === 'Escape') {
      closeSession();
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [isCardFlipped, handleReviewCard, closeSession, setIsCardFlipped]);
```

**ToastContainer.tsx**

Notificações de sucesso e erro que aparecem no canto da tela e desaparecem em 4.5 segundos.

**UpgradeModal.tsx**

Modal que aparece quando o usuário tenta usar IA com o trial expirado (quando a API retorna erro 402).

**Sidebar.tsx**

Navegação lateral com React Router `<NavLink>` (adiciona `className="active"` automaticamente na rota atual), badge de cards devidos e lista de Áreas de Estudo colapsáveis.

---

### 4.6 Custom Hooks

**useVersionCheck.ts** — verifica periodicamente se há uma nova versão do app disponível e exibe o banner de atualização.

**useIsMobile.ts** — detecta se a tela é menor que um breakpoint para adaptar o layout.

```typescript
// frontend/src/hooks/useIsMobile.ts
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);

  return isMobile;
}
```

---

### 4.7 Design System — CSS Tokens

Em vez de espalhar cores hardcoded pelo código, o SAAFO HUB usa um sistema de tokens CSS definidos em `tokens.css`.

```css
/* frontend/src/styles/tokens.css */
:root {
  /* Tipografia */
  --font-display: 'Literata', serif;
  --font-body:    'Hanken Grotesk', sans-serif;
  --font-label:   'JetBrains Mono', monospace;

  /* Espaçamento (base 4px) */
  --sp-1: 4px;   --sp-2: 8px;   --sp-4: 16px;
  --sp-6: 24px;  --sp-8: 32px;  --sp-12: 48px;

  /* TEMA CLARO — Marginália (papel acadêmico) */
  --bg-base:    #fff8f3;
  --bg-card:    #fef2e4;
  --text-primary:   #201b12;
  --color-primary:  #a33b3a;   /* Oxblood — cor de destaque */
  --border-color:   #cdc5bc;
}

/* TEMA ESCURO — Charcoal */
.dark-theme {
  --bg-base:    #1a1714;
  --bg-card:    #2c2824;
  --text-primary:   #f5ede3;
  --color-primary:  #fe807b;   /* Coral suave no dark */
  --border-color:   #443f39;
}
```

**Como usar nos componentes:**

```css
/* Em vez de: */
background-color: #1a1714;
color: #f5ede3;

/* Usamos: */
background-color: var(--bg-base);
color: var(--text-primary);
```

Quando o usuário troca para o tema claro, o `AppProvider` adiciona/remove a classe `.dark-theme` no `<html>`. Todos os tokens mudam automaticamente — sem nenhuma mudança no código dos componentes.

---

### 4.8 Como o Frontend se comunica com o Backend

O `apiCall` no `AppContext` é a função centralizada para todas as chamadas HTTP:

```typescript
// Exemplo de uso (simplificado do AppContext)
const apiCall = useCallback(async (endpoint: string, options?: RequestInit) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}),
    ...options?.headers,
  };

  let res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  // Se o access token expirou (401) e temos refresh token no cookie:
  if (res.status === 401) {
    // Serializa múltiplos refreshes concorrentes
    if (!refreshingRef.current) {
      refreshingRef.current = fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Envia o cookie HttpOnly
      })
        .then(r => r.json())
        .then(data => {
          if (data.access_token) {
            setToken(data.access_token);
            tokenRef.current = data.access_token;
            return data.access_token;
          }
          return null;
        })
        .finally(() => { refreshingRef.current = null; });
    }

    const newToken = await refreshingRef.current;
    if (newToken) {
      // Repete a requisição original com o novo token
      res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    } else {
      handleLogout(); // Não conseguiu renovar → logout
      return;
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // Erro 402 → plano expirado → abre modal de upgrade
    if (res.status === 402) { setUpgradeModalOpen(true); return; }
    throw new Error(err.message || 'Erro desconhecido');
  }

  return res.json();
}, [token]);
```

**Como uma página usa o apiCall:**

```typescript
// Exemplo: criar uma matéria
const handleCreateSubject = useCallback(async (name: string, color: string) => {
  const newSubject = await apiCall('/subjects', {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  }) as Subject;

  // Atualiza o estado local imediatamente (sem recarregar do servidor)
  setSubjects(prev => [...prev, newSubject]);
  showSuccess('Matéria criada com sucesso!');
}, [apiCall]);
```

---

## 5. Fluxos Completos Ponta a Ponta

### Fluxo 1 — Gerar flashcards por IA a partir de PDF

```
FRONTEND
1. Usuário seleciona um tópico e faz upload de um PDF na página AIGenerator
2. `apiCall('/ai/generate', { method: 'POST', body: FormData })` é chamado
   (FormData em vez de JSON porque tem um arquivo binário)
   Headers: Authorization: Bearer <access_token>

BACKEND
3. AIController recebe a requisição
4. JwtAuthGuard valida o token → popula req.user
5. PlanGuard verifica user.isActivePlan → se expirado, 402
6. AIController extrai o arquivo (Buffer) e chama GeminiService.generateFlashcards()
7. GeminiService faz upload do PDF para Files API do Google (se > 5MB)
8. Chama Gemini 2.5 Flash com SYSTEM_PROMPT + arquivo + instruções de quantidade
9. Gemini retorna JSON com array de { front, back }
10. CreateCardUseCase cria cada card no banco com easeFactor=2.5, nextReview=hoje
11. Retorna array de cards criados

FRONTEND
12. apiCall resolve com os cards
13. setCards(prev => [...prev, ...newCards]) — atualiza o estado global
14. showSuccess('10 flashcards gerados!')
15. React re-renderiza os componentes que usam cards
```

### Fluxo 2 — Sessão de revisão SM-2

```
FRONTEND
1. Usuário clica em "Revisão Diária" na sidebar
2. startStudySession() é chamado no AppContext
3. apiCall('/study-sessions/start') cria sessão ativa → retorna sessionId
4. apiCall('/cards/due') retorna todos os cards com nextReview <= hoje
5. setSessionCards(dueCards) → StudySessionOverlay abre em tela cheia

6. Usuário vê a frente do card
7. Pressiona Espaço → setIsCardFlipped(true) → verso aparece
8. Pressiona '4' → handleReviewCard(4) é chamado

BACKEND
9. POST /study-sessions/review { cardId, sessionId, rating: 4 }
10. ReviewCardUseCase:
    a. Verifica que card e sessão pertencem ao usuário
    b. SpacedRepetitionService.calculate(4, repetitions, interval, easeFactor)
       - rating=4 ≥ 3 → acertou
       - easeFactor: 2.5 + (0.1 - (5-4)*(0.08 + (5-4)*0.02)) = 2.5 + 0 = 2.5
       - novo intervalo = 1 dia (se repetitions=0) ou 6 dias (se=1) ou interval*EF
    c. Atualiza card no banco (nextReview = hoje + intervalo)
    d. Cria registro CardReview para métricas

FRONTEND
11. setCards(prev => prev.map(c => c.id === cardId ? updatedCard : c))
12. Próximo card é mostrado
13. Ao terminar: apiCall('/study-sessions/end') fecha a sessão
14. Tela de resumo: total revisados, média de rating, cards difíceis
```

---

## 7. Segurança — Camadas de Defesa

Esta seção documenta todos os mecanismos de segurança ativos no SAAFO HUB, organizados por camada.

---

### 7.1 HTTP Headers (Helmet)

Configurado em `backend/src/main.ts` via `helmet()` com customizações explícitas.

| Header | Valor | Proteção |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Força HTTPS por 1 ano em todos os subdomínios; elegível para HSTS preload list do Chrome |
| `X-Content-Type-Options` | `nosniff` | Impede o browser de adivinhar MIME type e executar scripts disfarçados |
| `X-Frame-Options` | `SAMEORIGIN` | Bloqueia clickjacking via iframe em domínio externo |
| `X-XSS-Protection` | `0` | Desativa o XSS Auditor antigo (correto — ele próprio criava vulnerabilidades em browsers modernos) |
| `Referrer-Policy` | `no-referrer` | Não vaza a URL do backend em requests para domínios externos |
| `X-DNS-Prefetch-Control` | `off` | Desativa prefetch de DNS pelo browser |
| `X-Permitted-Cross-Domain-Policies` | `none` | Bloqueia Flash/PDF cross-domain (legacy, mantido por boa prática) |
| `X-Download-Options` | `noopen` | Impede IE/Edge de abrir downloads diretamente |

**O que não está configurado:**
- `Content-Security-Policy` — o Helmet omite CSP por padrão; como o backend serve apenas JSON (sem HTML), o impacto é mínimo. Seria necessário caso uma rota HTML (ex: Swagger) seja habilitada em produção.

---

### 7.2 CORS

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL.split(',').map(o => o.trim()),
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
```

- **`origin`**: lista allowlist lida de `FRONTEND_URL` (suporta múltiplas origens separadas por vírgula, ex: prod + dev). Requisições de outras origens são rejeitadas pelo browser antes de chegar à lógica de negócio.
- **`allowedHeaders`**: restrito a `Content-Type` e `Authorization`. Headers arbitrários do cliente são negados.
- **`credentials: true`**: necessário para que o browser envie o cookie `HttpOnly` do refresh token.

---

### 7.3 Rate Limiting (Throttler)

Configurado globalmente em `AppModule` via `ThrottlerModule` e aplicado com `APP_GUARD`:

```
Global: 150 requisições / 60 segundos por IP
```

Limites específicos por endpoint (sobrescrevem o global com `@Throttle`):

| Endpoint | Limite | Janela | Motivo |
|---|---|---|---|
| `POST /ai/generate` | 5 req | 15 min | Custo de tokens Gemini |
| `POST /ai/generate-file` | 5 req | 15 min | Upload + custo Gemini |
| `POST /ai/quiz` | 20 req | 7 dias | Custo Gemini + limite semanal de exames |
| `POST /ai/evaluate-essay` | 100 req | 24h | Custo Gemini por avaliação |
| `POST /auth/resend-verification` | 3 req | 1h | Previne spam de e-mail |

Além dos throttles, o `AiController` aplica um limite diário de cards em banco: `MAX_CARDS_PER_DAY` (padrão: 100) verificado no `countGeneratedToday` antes de cada geração.

---

### 7.4 Autenticação JWT + Refresh Token Rotation

**Access Token:**
- Tipo: JWT assinado com `JWT_SECRET` (HS256)
- Expiração: 15 minutos
- Transporte: header `Authorization: Bearer <token>` (memória no frontend, nunca em localStorage)

**Refresh Token:**
- Gerado com `crypto.randomBytes(48).toString('hex')` — 384 bits de entropia
- **Armazenado no banco como SHA-256 hash** — o token raw nunca persiste em banco
- Transporte: cookie `HttpOnly; Secure; SameSite=Strict` (7 dias)
- Não acessível via JavaScript (proteção contra XSS)

**Rotação e detecção de reutilização:**
- Cada `POST /auth/refresh` invalida o token atual e emite um novo
- Se um token já consumido for apresentado novamente (ataque de reutilização), **todo o "family" de tokens do usuário é revogado imediatamente**
- Implementado em `auth.controller.ts` via tabela `RefreshToken` com campo `family` e índice `@@index([userId, family])`

---

### 7.5 Guards de Autorização

Aplicados em sequência com `@UseGuards(JwtAuthGuard, PlanGuard)` ou `@UseGuards(JwtAuthGuard, AdminGuard)`.

**JwtAuthGuard** (`guards/jwt-auth.guard.ts`)
- Valida o Bearer token em todas as rotas protegidas
- Popula `req.user = { id, email }` para uso nos controllers
- Retorna 401 em token ausente, malformado ou expirado

**PlanGuard** (`guards/plan.guard.ts`)
- Busca o usuário no banco e chama `user.isActivePlan` (getter da entidade de domínio)
- Retorna HTTP 402 com `{ code: 'PLAN_EXPIRED' }` se trial expirado ou plano inativo
- O frontend intercepta o 402 no `apiCall` e abre o modal de upgrade

**AdminGuard** (`guards/admin.guard.ts`)
- Compara `req.user.email` com a lista `ADMIN_EMAILS` (env var, separada por vírgula)
- Retorna 403 se o e-mail não estiver na lista
- Aplicado em todas as rotas de `AdminController`

---

### 7.6 Validação de Payload (ValidationPipe)

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,            // Remove silenciosamente campos não declarados no DTO
  forbidNonWhitelisted: true, // Retorna 400 se vier qualquer campo extra
  transform: true,            // Converte tipos automaticamente (string → number, etc.)
}));
```

Todos os DTOs usam `class-validator` com regras estritas:

- Strings: `@MaxLength()` em todos os campos de texto livre (ex: `@MaxLength(100_000)` no campo `text` do gerador de IA)
- Números: `@Min()` / `@Max()` (ex: `count` entre 3 e 30)
- Arrays: `@ArrayMinSize()` / `@ArrayMaxSize()` (ex: `topicIds` entre 1 e 10)
- Formatos: `@IsEmail()`, `@Matches(/regex/)` para CPF, CEP, telefone, número de cartão, CVV
- Nested objects: `@ValidateNested()` + `@Type()` para DTOs aninhados (ex: `CardDataDto` dentro de `CardCheckoutDto`)

---

### 7.7 Segurança de Pagamentos (Asaas)

**Webhook authentication:**

```typescript
const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
if (!webhookToken || token !== webhookToken)
  throw new UnauthorizedException('Webhook token inválido.');
```

A lógica usa `!webhookToken || ...` — se `ASAAS_WEBHOOK_TOKEN` não estiver definida em produção, **todos os webhooks são rejeitados** (fail-closed). Configurar a variável é obrigatório para o billing funcionar.

**Dados de cartão:**
- O número do cartão e CVV trafegam do frontend → backend → Asaas via HTTPS, mas **nunca são persistidos**
- O backend recebe os dados apenas para repassar à API de tokenização do Asaas
- O Asaas retorna um `creditCardToken` que é armazenado em vez dos dados reais
- O logger sanitiza `number`, `ccv`, `cpfCnpj` e `postalCode` antes de escrever nos logs

---

### 7.8 Sanitização de Logs

O `LoggingInterceptor` (aplicado globalmente via `APP_INTERCEPTOR`) registra todas as requisições, mas com sanitização:

**Campos mascarados (`→ '***'`):**
- `password` — senhas em texto plano
- `token` — tokens em body (ex: Google OAuth id_token)
- `number` — número do cartão de crédito
- `ccv` — código de segurança do cartão
- `cpfCnpj` — CPF/CNPJ do titular
- `postalCode` — CEP do titular
- `card.number` e `card.ccv` — quando aninhados no objeto `card`

**Truncamento de payloads grandes:**
- Campo `text` (corpo das requisições de IA): truncado em 200 caracteres com indicação do tamanho original (`…[98432]`)
- Evita logs com 100KB por requisição ao usar o gerador de flashcards

---

### 7.9 Verificação de Variáveis de Ambiente

Na inicialização, `validateEnv()` checa as variáveis obrigatórias e mata o processo se alguma estiver ausente:

```
JWT_SECRET, GOOGLE_CLIENT_ID, FRONTEND_URL, RESEND_API_KEY, RESEND_FROM_EMAIL
```

O servidor não sobe em estado inseguro sem as configurações mínimas.

---

### 7.10 Segurança no Banco de Dados

**Índices que protegem contra consultas lentas (DoS por query):**

| Tabela | Índice | Query protegida |
|---|---|---|
| `cards` | `(userId, nextReview)` | `findDueCards` — query mais frequente |
| `cards` | `(userId, createdAt)` | `countGeneratedToday` + admin |
| `cards` | `(topicId)` | `findByTopicId` no gerador de IA |
| `card_reviews` | `(cardId, reviewedAt)` | Métricas por matéria |
| `card_reviews` | `(sessionId)` | Contagem de reviews por sessão |
| `subjects` | `(userId)` | Listagem e métricas |
| `topics` | `(subjectId)` | Listagem por matéria |
| `study_sessions` | `(userId)` | Painel admin + sessões |
| `exam_records` | `(userId)` | Contagem semanal |
| `calendar_events` | `(userId, startAt)` | Queries de range do calendário |
| `event_reminders` | `(scheduledAt, sent)` | Cron de lembretes (já existia) |
| `refresh_tokens` | `(userId, family)` | Revogação de family (já existia) |

**Isolamento de dados:**
- Toda query filtra por `userId` extraído do JWT (nunca do body do request)
- Antes de qualquer operação em card/tópico, o controller verifica `subject.userId === req.user.id`
- A deleção de conta (`DELETE /profile`) usa `where: { id: req.user.id }` — nunca recebe ID externo

---

### 7.11 Resumo — Matriz de Defesa

```
Camada               Mecanismo                         Protege contra
──────────────────────────────────────────────────────────────────────────
Transporte           HSTS (preload, 1 ano)             Downgrade para HTTP
Transporte           CORS (allowlist + headers)        Requisições cross-origin
Aplicação            Helmet (8 headers)                XSS, Clickjacking, MIME sniff
Aplicação            ThrottlerGuard (global + por rota) Brute-force, abuso de IA, spam
Autenticação         JWT (15min) + Refresh rotation    Roubo de sessão, replay attack
Autenticação         Cookie HttpOnly + SameSite=Strict XSS, CSRF
Autorização          JwtAuthGuard                      Acesso não autenticado
Autorização          PlanGuard                         Uso de features pagas sem pagar
Autorização          AdminGuard (email allowlist)      Acesso ao painel de admin
Dados de entrada     ValidationPipe (whitelist + DTOs) Campos extras, tipos errados, payloads grandes
Pagamentos           Webhook token (fail-closed)       Upgrade fraudulento de planos
Pagamentos           Card data nunca persiste          Vazamento de PAN/CVV
Logs                 Sanitização de campos sensíveis   Exposição de credenciais em logs
Inicialização        validateEnv()                     Deploy sem config mínima
```

---

## 6. Integrações Externas

| Integração | Onde | Para que |
|---|---|---|
| **Google Gemini 2.5 Flash** | `infrastructure/ai/gemini.service.ts` | Gerar flashcards, insights, exames, avaliar dissertativas |
| **Asaas** | `infrastructure/payments/asaas.service.ts` | Criar customer, assinar plano, processar webhook de pagamento |
| **Evolution API v3** | `infrastructure/notifications/evo-api.service.ts` | Enviar mensagens WhatsApp formatadas |
| **Resend** | `infrastructure/email/resend.service.ts` | E-mail de verificação de conta e lembretes de eventos |
| **Google OAuth 2.0** | `auth.controller.ts` + `@react-oauth/google` | Login social sem senha |
| **PostgreSQL** | `infrastructure/database/` via Prisma | Persistência de todos os dados |

**Fluxo de billing (Asaas):**

```
1. Usuário clica "Assinar" → CheckoutModal abre
2. apiCall('/billing/checkout') → AsaasService cria Customer + Subscription
3. Asaas processa o pagamento e envia webhook para POST /billing/webhook
4. BillingController verifica o header asaas-access-token (segurança)
5. Se pagamento confirmado → userRepository.update({ plan: 'STUDENT' })
6. Frontend chama fetchPlanStatus() periodicamente e atualiza o UI
```

---

*Documento gerado para uso interno da equipe Front-Enzos | Hackathon IFRO ADS 2026*
*Cobre o estado do código na branch `dev` em 21/06/2026*

---

### 9. Otimizações de Responsividade Mobile (Atualização Junho/2026)

Para garantir uma experiência de excelência em dispositivos móveis (especialmente em telas de tamanho ~414px de largura):

1. **Unificação do Fundo Visual:**
   - Padronização do fundo da aplicação com a cor de papel acadêmico `#fef2e4`, eliminando contrastes desnecessários com fundos brancos residuais.

2. **Responsividade no Calendário (`CalendarPage.tsx`):**
   - Implementação de um layout dinâmico para a barra de ferramentas utilizando `useIsMobile()`. Os controles de visualização (Mês/Agenda) e botões secundários agora empilham verticalmente de forma limpa em telas pequenas, eliminando vazamento e rolagem horizontal.

3. **Sub-menus na Página de Perfil (`Profile.tsx`):**
   - A página de perfil foi fragmentada em abas de navegação usando o hook `activeSubTab` para mitigar o excesso de informações em uma única tela.
   - **Adaptação Mobile:** Em telas desktop, as abas exibem ícones e textos (`CONTA`, `ASSINATURA`, `ROTINA`). Em telas mobile, o texto é ocultado automaticamente, exibindo apenas os ícones correspondentes (`User`, `CreditCard`, `Calendar`) em formato de barra de navegação com área de toque ampliada, otimizando o espaço útil do viewport.

4. **Responsividade na Página de Cards (`MyCards.tsx`):**
   - Correção do grid de 2 colunas nos formulários de criação ("Novo Flashcard") e edição de cards, além da visualização Frente/Verso. Agora, em dispositivos mobile (`isMobile`), esses elementos passam a se comportar em grid de 1 coluna (pilha vertical), evitando o esmagamento horizontal e vazamentos na tela.
   - **Melhorias de Visual e Organização:** Os blocos de flashcard agora utilizam a cor sólida de fundo `var(--bg-card)` com sombra sutil `var(--shadow-sm)` e borda definida. Para manter a simetria visual, a Frente e o Verso são separados de maneira uniforme por uma linha divisória horizontal no mobile (`borderTop` sutil) e uma linha divisória vertical no desktop (`borderLeft` sutil).
   - **Aproveitamento Total de Largura:** O cabeçalho do card (badges e botões de ação) foi isolado em uma linha horizontal superior separada. Com isso, o bloco de texto de conteúdo (Frente/Verso) expande-se por 100% da largura interna do card, eliminando o espaço vazio que sobrava à direita abaixo dos botões e garantindo margens perfeitamente uniformes. O espaçamento vertical entre os cards foi elevado de `10px` para `16px`.

5. **Hierarquia Visual (Z-Index) do Player de Música (`AppLayout.tsx`):**
   - Redução do `zIndex` do player flutuante de música (`floating-player-pill` e `yt-hidden-player`) de `10000`/`9999` para `300`. Isso garante que, ao abrir o menu lateral (gaveta móvel de z-index `600`) ou modais (`z-index: 1000`), o player de música seja renderizado corretamente por baixo do menu/overlay e não sobreposto, melhorando a consistência visual no mobile.

