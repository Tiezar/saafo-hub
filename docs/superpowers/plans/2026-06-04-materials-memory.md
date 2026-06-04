# Plano de Implementação: Materiais de Estudo & IA Construtora de Memória (Subprojeto 2)

> **Para agentes autônomos:** REQUISITO: Use superpowers:subagent-driven-development ou superpowers:executing-plans para implementar este plano passo a passo. Utilize a sintaxe de caixas de seleção (`- [ ]`) para controle de progresso.

**Objetivo:** Implementar o gerenciamento de Matérias, Tópicos e Flashcards no SAAFO HUB, integrando o algoritmo SM-2 para repetição espaçada e a API do Gemini para geração automatizada de flashcards a partir de notas textuais.

---

## Mapeamento de Arquivos
- **prisma/schema.prisma**: Atualização do modelo de dados relacional.
- **src/domain/entities/**:
  - `subject.ts`, `topic.ts`, `card.ts`, `study-session.ts`, `card-review.ts`
- **src/domain/repositories/**:
  - `subject-repository.interface.ts`, `topic-repository.interface.ts`, `card-repository.interface.ts`, `study-session-repository.interface.ts`
- **src/domain/services/spaced-repetition.service.ts**: Algoritmo puro de repetição espaçada SM-2.
- **src/application/use-cases/**:
  - Casos de uso de CRUD e execução de sessões.
  - `generate-flashcards.use-case.ts` (integração Gemini).
- **src/infrastructure/database/**:
  - Implementação concreta dos repositórios com Prisma.
- **src/infrastructure/ai/gemini.service.ts**: Serviço de integração direta via fetch com a API do Gemini.
- **src/infrastructure/http/guards/resource-ownership.guard.ts**: Guard genérico para garantir que o usuário logado só interaja com seus próprios dados.

---

### Task 1: Banco de Dados (Schema & Migrations)

**Files:**
- Modify: `prisma/schema.prisma`

- [x] **Step 1: Adicionar os novos modelos ao schema.prisma**
  
  Abra `prisma/schema.prisma` e adicione as relações do `User` e os modelos `Subject`, `Topic`, `Card`, `StudySession` e `CardReview` conforme a Especificação de Design.
  
- [x] **Step 2: Executar as migrations do Prisma**
  
  Run: `npx prisma migrate dev --name add_materials_and_memory`
  Expected: Banco atualizado e Prisma Client gerado localmente.

---

### Task 2: Camada de Domínio (Entidades e Repositórios)

**Files:**
- Create: `src/domain/entities/subject.ts`
- Create: `src/domain/entities/topic.ts`
- Create: `src/domain/entities/card.ts`
- Create: `src/domain/entities/study-session.ts`
- Create: `src/domain/entities/card-review.ts`
- Create: interfaces correspondentes em `src/domain/repositories/`

- [x] **Step 1: Criar as entidades de domínio puras**
  
  Implemente classes em TypeScript puro para modelar os dados de cada entidade.

- [x] **Step 2: Criar as interfaces de repositório**
  
  Defina os métodos de persistência necessários para CRUD, busca por id, busca de cards vencidos (onde `nextReview <= now`).

---

### Task 3: Algoritmo SM-2 (Domain Service)

**Files:**
- Create: `src/domain/services/spaced-repetition.service.ts`
- Create: `src/domain/services/spaced-repetition.service.spec.ts`

- [x] **Step 1: Implementar o algoritmo SM-2 puro**
  
  Escreva o serviço `SpacedRepetitionService` no domínio de acordo com a formulação matemática do SM-2 descrita na especificação de design.

- [x] **Step 2: Escrever testes unitários rigorosos para o algoritmo**
  
  Escreva testes em Jest cobrindo:
  - Comportamento de erro/esquecimento ($q < 3$).
  - Primeira revisão bem sucedida ($repetitions = 0 \to 1$).
  - Segunda revisão bem sucedida ($repetitions = 1 \to 2$).
  - N revisões consecutivas e atualização dinâmica do Ease Factor.
  - Limite mínimo do Ease Factor (nunca menor que 1.3).

---

### Task 4: Casos de Uso (Matérias, Tópicos & Cards)

**Files:**
- Create: Casos de uso sob `src/application/use-cases/`

- [x] **Step 1: Implementar Use Cases de CRUD para Matérias (Subject)**
  - `CreateSubjectUseCase`
  - `ListSubjectsUseCase` (filtra por userId)
  - `DeleteSubjectUseCase`

- [x] **Step 2: Implementar Use Cases de CRUD para Tópicos (Topic)**
  - `CreateTopicUseCase`
  - `ListTopicsUseCase` (filtra por subjectId)
  - `DeleteTopicUseCase`

- [x] **Step 3: Implementar Use Cases de CRUD para Cards (Card)**
  - `CreateCardUseCase`
  - `ListCardsUseCase` (filtra por topicId)
  - `DeleteCardUseCase`

---

### Task 5: Sessões de Estudo & Revisões (Usecases)

**Files:**
- Create: `src/application/use-cases/start-study-session.use-case.ts`
- Create: `src/application/use-cases/review-card.use-case.ts`

- [x] **Step 1: Caso de uso StartStudySession**
  - Inicia uma sessão registrando `startedAt` e vinculando ao `userId`.

- [x] **Step 2: Caso de uso ReviewCard**
  - Recebe `cardId`, `sessionId` e `rating`.
  - Busca o card e a sessão.
  - Valida se ambos pertencem ao usuário logado.
  - Invoca o `SpacedRepetitionService` para calcular a nova data de revisão.
  - Atualiza o card no banco de dados.
  - Registra a revisão (`CardReview`).

---

### Task 6: Implementação dos Repositórios no Infra (Prisma Repositories)

**Files:**
- Create: Repositórios concretos sob `src/infrastructure/database/`
- Modify: `src/infrastructure/database/database.module.ts`

- [x] **Step 1: Escrever os repositórios concretos do Prisma**
  
  Crie implementações em infraestrutura conectando com `PrismaService` e injetando nos respectivos tokens das interfaces do domínio.

- [x] **Step 2: Declarar as dependências no DatabaseModule**
  
  Exporte as novas classes para que fiquem disponíveis para injeção global nos Casos de Uso.

---

### Task 7: Integração com a API do Gemini (AI Memory Constructor)

**Files:**
- Create: `src/infrastructure/ai/gemini.service.ts`
- Create: `src/application/use-cases/generate-flashcards.use-case.ts`
- Modify: `src/app.module.ts` para carregar a chave `GEMINI_API_KEY` do `.env`

- [x] **Step 1: Criar o GeminiService**
  
  Escreva o serviço que chama a API do Gemini utilizando o endpoint HTTP de geração de conteúdos com o cabeçalho correto e o JSON Schema para garantir o formato de retorno estruturado (perguntas e respostas).

- [x] **Step 2: Criar o caso de uso GenerateFlashcardsUseCase**
  
  Recebe o texto do usuário e o `topicId`. Envia o texto ao `GeminiService` e cria os cards resultantes no banco de dados vinculando-os ao tópico e ao usuário logado.

---

### Task 8: Controladores HTTP, Segurança & Rate Limits

**Files:**
- Create: Controladores HTTP correspondentes em `src/infrastructure/http/controllers/`
- Modify: Módulos do NestJS para declarar as novas rotas.

- [x] **Step 1: Criar o ResourceOwnershipGuard (Implementado no nível de Caso de Uso para Clean Architecture)**
  
  Garantimos a segurança de dados e propriedade do recurso diretamente na camada de Casos de Uso do domínio, consultando o banco e validando a propriedade (`userId`) a cada operação, garantindo independência de framework.

- [x] **Step 2: Criar os controladores e expor rotas protegidas**
  - `/subjects` (CRUD)
  - `/topics` (CRUD)
  - `/cards` (CRUD)
  - `/study-sessions` (iniciar, listar, revisar, due cards)
  - `/ai/generate` (geração de flashcards por texto com Throttler dedicado de 5req/15min)

- [x] **Step 3: Escrever testes unitários e de integração para validar a segurança e fluxo de dados**
  
  Todos os Casos de Uso possuem cobertura de teste robusta com mocks do banco e verificação de propriedade. A compilação e build do projeto estão totalmente estáveis.
