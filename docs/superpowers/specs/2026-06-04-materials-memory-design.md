# Especificação de Design: Materiais de Estudo & IA Construtora de Memória (Subprojeto 2)

**Data:** 2026-06-04  
**Autor:** Antigravity (Google DeepMind Team)  
**Status:** Em Revisão  
**Projeto:** SAAFO HUB (SaaS de Estudos)  

---

## 1. Visão Geral
Este documento especifica o design técnico do **Subprojeto 2: Materiais de Estudo & IA Construtora de Memória** para o SAAFO HUB. O objetivo deste módulo é permitir que os usuários organizem seus estudos em categorias estruturadas (Matérias e Tópicos) e retenham o conhecimento de forma altamente eficiente por meio de Flashcards gerados manualmente ou por Inteligência Artificial (Gemini API) com agendamento inteligente baseado no algoritmo de repetição espaçada **SM-2**.

---

## 2. Requisitos & Escopo

### Requisitos Funcionais (RF)
*   **Gestão de Matérias (Subjects):** Criação, edição, listagem e exclusão de matérias de estudo (ex: "Direito Constitucional", "Anatomia").
*   **Gestão de Tópicos (Topics):** Criação, edição, listagem e exclusão de tópicos pertencentes a uma matéria (ex: "Direitos Fundamentais").
*   **Gestão de Flashcards (Cards):** Criação manual, edição, listagem e exclusão de cards (Frente/Verso) vinculados a tópicos.
*   **Sessão de Estudos (Study Sessions):**
    *   Iniciar uma sessão de revisão para um conjunto de cards vencidos.
    *   Classificar cada card revisado com uma nota de 0 a 5 baseada no nível de recordação (Active Recall).
    *   Calcular a próxima data de revisão utilizando o algoritmo **SM-2**.
*   **IA Construtora de Memória (AI Memory Constructor):**
    *   Enviar um bloco de notas/texto de estudos ou resumo para a API do Gemini.
    *   Retornar uma lista de flashcards estruturados (perguntas e respostas) gerados com base no texto enviado para criação direta no banco de dados.

### Requisitos Não Funcionais (RNF)
*   **Arquitetura:** Clean Architecture, SOLID, DRY, Clean Code. Regras de negócio de repetição espaçada isoladas no domínio.
*   **Segurança:**
    *   Validação rigorosa de propriedade dos dados (um usuário só pode visualizar/alterar/rever suas próprias matérias, tópicos e cards).
    *   Rate limiting específico para chamadas de IA.
    *   Armazenamento seguro de chaves de API por variáveis de ambiente.
*   **Desempenho:** Baixo tempo de resposta nos endpoints de cálculo e geração estruturada de JSON pela IA.

---

## 3. Arquitetura do Banco de Dados (Prisma Schema)

O banco de dados relacional PostgreSQL será expandido com as seguintes tabelas e relacionamentos:

```prisma
// Prisma schema updates

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  name          String
  nickname      String?
  googleId      String?        @unique
  passwordHash  String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  subjects      Subject[]
  cards         Card[]
  studySessions StudySession[]

  @@map("users")
}

model Subject {
  id        String   @id @default(uuid())
  name      String
  color     String?  // Código hexadecimal da cor do tema
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  topics    Topic[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("subjects")
}

model Topic {
  id        String   @id @default(uuid())
  name      String
  subjectId String
  subject   Subject  @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  cards     Card[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("topics")
}

model Card {
  id          String       @id @default(uuid())
  front       String       // Pergunta / Conceito na frente
  back        String       // Resposta / Explicação no verso
  topicId     String
  topic       Topic        @relation(fields: [topicId], references: [id], onDelete: Cascade)
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Algoritmo SM-2
  repetitions Int          @default(0)    // Número de revisões consecutivas bem sucedidas (nota >= 3)
  interval    Int          @default(0)    // Intervalo em dias até a próxima revisão
  easeFactor  Float        @default(2.5)  // Fator de facilidade (Ease Factor)
  nextReview  DateTime     @default(now()) // Data/Hora programada para a próxima revisão
  
  reviews     CardReview[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@map("cards")
}

model StudySession {
  id        String       @id @default(uuid())
  userId    String
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  startedAt DateTime     @default(now())
  endedAt   DateTime?
  reviews   CardReview[]
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@map("study_sessions")
}

model CardReview {
  id         String       @id @default(uuid())
  cardId     String
  card       Card         @relation(fields: [cardId], references: [id], onDelete: Cascade)
  sessionId  String
  session    StudySession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  rating     Int          // Nota dada pelo usuário (0 a 5)
  reviewedAt DateTime     @default(now())

  @@map("card_reviews")
}
```

---

## 4. Design do Algoritmo SM-2 (Spaced Repetition)

O cálculo do próximo agendamento deve ser encapsulado em uma entidade pura ou classe utilitária do domínio (`src/domain/services/spaced-repetition.service.ts` ou diretamente na entidade `Card`), isolado de banco ou framework:

### Parâmetros de Entrada
- `rating`: Nota de recordação fornecida pelo usuário ($q \in [0, 5]$).
- `previousRepetitions`: Quantidade de revisões bem sucedidas consecutivas ($n$).
- `previousInterval`: Intervalo anterior em dias ($I$).
- `previousEaseFactor`: Fator de facilidade anterior ($EF$).

### Regras de Transição
1. **Se a nota de recordação for menor que 3 ($q < 3$):**
   * O usuário errou o card.
   * Reseta o número de repetições: `repetitions = 0`
   * Define o próximo intervalo de revisão para 1 dia: `interval = 1`
   * O fator de facilidade ($EF$) é mantido idêntico ou levemente decrementado (opcionalmente decrementa em 0.15, respeitando limite mínimo de 1.3).
2. **Se a nota de recordação for satisfatória ($q \geq 3$):**
   * O usuário acertou o card.
   * Se for a primeira revisão com acerto ($repetitions == 0$): `interval = 1` dia.
   * Se for a segunda revisão com acerto ($repetitions == 1$): `interval = 6` dias.
   * Se for maior ($repetitions > 1$): `interval = round(previousInterval * previousEaseFactor)`
   * Incrementa repetições: `repetitions = repetitions + 1`
3. **Ajuste do Fator de Facilidade ($EF$):**
   * $EF' = EF + (0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02))$
   * Se $EF' < 1.3$, define $EF' = 1.3$ (limite mínimo de flexibilidade).

### Retorno
Retorna o novo `repetitions`, `interval`, `easeFactor` e a data exata da próxima revisão (`nextReview = now + interval days`).

---

## 5. Fluxo de IA (Gemini API Integration)

Para permitir a geração automatizada de flashcards a partir de anotações ou resumos:

```
+----------+             +----------+             +------------+
| Frontend |             | API Nest |             | Gemini API |
+----------+             +----------+             +------------+
     |                        |                          |
     |-- POST /ai/generate -->|                          | (Texto de estudos no body)
     |   { text, topicId }    |                          |
     |                        |-- Solicitar JSON -------->| (Prompt System/Schema estruturado)
     |                        |   estruturado de cards   |
     |                        |<-- Retorna Array JSON ---|
     |                        |    [{front, back}]       |
     |                        |                          |
     |                        |-- Salvar cards no BD ----|
     |<-- Retorna criados ----|                          |
```

### Prompt de Sistema (System Instruction)
```
Você é um especialista em educação ativa e flashcards. Sua tarefa é analisar o texto de estudos fornecido pelo usuário e extrair os pontos conceituais mais importantes, transformando-os em uma lista de flashcards concisos contendo "frente" (pergunta direta ou conceito lacunado) e "verso" (resposta direta, objetiva e explicativa).
```

### JSON Schema de Resposta (Structured Output)
Exigiremos o retorno estruturado utilizando as diretivas de JSON Schema para garantir que o Gemini retorne exatamente:
```json
{
  "type": "object",
  "properties": {
    "cards": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "front": { "type": "string" },
          "back": { "type": "string" }
        },
        "required": ["front", "back"]
      }
    }
  },
  "required": ["cards"]
}
```

---

## 6. Middlewares, Segurança e Políticas de Acesso

1. **Políticas de Posse de Dados (Data Ownership Guard/Interceptor):**
   - Antes de qualquer mutação ou consulta de `Subject`, `Topic`, `Card` ou `StudySession`, a infraestrutura deve verificar se o `userId` autenticado no JWT coincide com o dono do recurso consultado.
   - Tentativas de acessar recursos de outros usuários retornarão imediatamente `403 Forbidden` ou `404 Not Found`.

2. **Rate Limit para IA:**
   - Como chamadas à API do Gemini possuem custo e cotas estritas, criaremos um rate limit restrito no Throttler para o endpoint `/ai/generate`:
     - Máximo de 5 requisições por IP a cada 15 minutos.

---

## 7. Próximos Passos
Se a especificação for aprovada, o plano de implementação abordará:
1. Atualização do Prisma Schema e migrations do Banco de Dados.
2. Criação das entidades e interfaces do repositório no Domínio.
3. Criação de serviços isolados do algoritmo SM-2 e testes unitários do algoritmo.
4. Casos de uso de CRUD de Matérias/Tópicos/Cards e sessões de estudo.
5. Integração com a API do Gemini no módulo de IA.
6. Controladores HTTP com Guards de propriedade e rate limits.
7. Testes unitários com 100% de cobertura nos casos de uso do módulo.
