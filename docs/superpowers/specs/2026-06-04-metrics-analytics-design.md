# Especificação de Design: Métricas, Histórico & Análise de Desempenho (Subprojeto 3)

**Data:** 2026-06-04  
**Autor:** Antigravity (Google DeepMind Team)  
**Status:** Em Revisão  
**Projeto:** SAAFO HUB (SaaS de Estudos)  

---

## 1. Visão Geral
Este documento especifica o design técnico do **Subprojeto 3: Métricas, Histórico & Análise de Desempenho** para o SAAFO HUB. O objetivo deste módulo é compilar e apresentar dados analíticos detalhados sobre o desempenho de estudos do usuário. Ele fornecerá estatísticas de retenção, divisão do inventário de flashcards por maturidade (novos, aprendizado, maduros), histórico de revisões diárias e projeções futuras, viabilizando dashboards ricos no frontend.

---

## 2. Requisitos & Escopo

### Requisitos Funcionais (RF)
*   **Resumo Estatístico Geral (General Analytics):**
    *   Total de flashcards criados pelo usuário.
    *   Taxa de Retenção global: porcentagem de revisões qualificadas com nota $\ge 3$.
    *   Média de nota (rating) dada em revisões.
*   **Divisão de Maturidade do Deck (Maturity Breakdown):**
    *   cards classificados em três estágios:
        *   **Novos (New):** Repetições = 0.
        *   **Em Aprendizado (Learning):** Repetições entre 1 e 3.
        *   **Maduros (Mature):** Repetições $\ge 4$.
*   **Histórico de Estudo Diário (Activity Feed):**
    *   Quantidade de revisões efetuadas por dia nos últimos 7, 30 ou 90 dias (gerando dados estruturados para gráficos de barras ou de calor).
*   **Projeção de Revisões Futuras (Forecast):**
    *   Quantidade de cards agendados para revisão (`nextReview`) em cada um dos próximos 7 dias.
*   **Análise por Matéria (Subject Breakdown):**
    *   Desempenho comparativo entre as diferentes matérias do usuário (quantidade de cards, taxa de retenção por matéria).

### Requisitos Não Funcionais (RNF)
*   **Arquitetura:** Clean Architecture, SOLID, DRY. Agregadores e lógicas de cálculo no domínio, sem acoplamento a queries SQL puras proprietárias do Prisma se possível (ou mapeamento limpo na infraestrutura).
*   **Segurança:**
    *   Políticas rigorosas de data ownership (o usuário só pode ver dados consolidados e histórico de revisões de si mesmo).
*   **Desempenho:** Baixa latência e cache amigável (se aplicável), evitando queries excessivamente pesadas que degradam a performance do banco PostgreSQL.

---

## 3. Design da Camada de Domínio (Entidades e Agregadores)

Como os dados das métricas são calculados sob demanda a partir das entidades `Card`, `CardReview` e `StudySession`, não criaremos novas tabelas no banco de dados. Em vez disso, definiremos entidades analíticas de leitura no domínio para formatar os resultados de forma limpa.

### Entidades do Domínio

#### `StudyMetrics` (Value Object em `src/domain/entities/study-metrics.ts`)
```typescript
export class DailyActivity {
  constructor(
    public readonly date: string, // Formato "YYYY-MM-DD"
    public readonly count: number
  ) {}
}

export class ForecastDay {
  constructor(
    public readonly date: string, // Formato "YYYY-MM-DD"
    public readonly count: number
  ) {}
}

export class SubjectPerformance {
  constructor(
    public readonly subjectId: string,
    public readonly subjectName: string,
    public readonly subjectColor: string,
    public readonly totalCards: number,
    public readonly retentionRate: number
  ) {}
}

export class StudyMetrics {
  constructor(
    public readonly userId: string,
    public readonly totalCards: number,
    public readonly retentionRate: number, // 0 a 100
    public readonly averageRating: number, // 0 a 5
    public readonly matureCardsCount: number,
    public readonly learningCardsCount: number,
    public readonly newCardsCount: number,
    public readonly dailyActivity: DailyActivity[],
    public readonly forecast: ForecastDay[],
    public readonly subjectsPerformance: SubjectPerformance[]
  ) {}
}
```

---

## 4. Contratos de Repositório

Adicionaremos métodos específicos de agregação e listagem à interface `ICardRepository` ou criaremos uma interface dedicada de análise:

#### Interface `IMetricsRepository` (`src/domain/repositories/metrics-repository.interface.ts`)
```typescript
import { StudyMetrics } from '../entities/study-metrics';

export interface IMetricsRepository {
  getMetricsForUser(userId: string, daysLimit: number): Promise<StudyMetrics>;
}
```

---

## 5. Casos de Uso (Application Layer)

### `GetStudyMetricsUseCase` (`src/application/use-cases/get-study-metrics.use-case.ts`)
*   **Input:** `userId`, `daysLimit` (padrão: 30 dias).
*   **Fluxo:**
    1. Invoca `metricsRepository.getMetricsForUser(userId, daysLimit)`.
    2. Retorna a entidade `StudyMetrics`.

---

## 6. Implementação de Infraestrutura (Prisma Core Querying)

Na camada de infraestrutura (`src/infrastructure/database/prisma-metrics.repository.ts`), utilizaremos queries eficientes do Prisma para agrupar e calcular os dados necessários de forma atômica:

### Estratégia de Consulta
1.  **Maturidade dos Cards:**
    `prisma.card.groupBy({ by: ['repetitions'], _count: true, where: { userId } })`
2.  **Métricas de Revisões (Retenção e Média):**
    `prisma.cardReview.findMany({ where: { card: { userId } } })`
3.  **Projeção (Forecast):**
    `prisma.card.findMany({ where: { userId, nextReview: { gte: now } } })`

---

## 7. Próximos Passos
Se a especificação for aprovada:
1. Criar os arquivos de valor e entidades analíticas do Domínio.
2. Definir a interface `IMetricsRepository`.
3. Escrever o caso de uso `GetStudyMetricsUseCase`.
4. Implementar o repositório Prisma correspondente na camada de dados.
5. Criar o controlador `MetricsController` expondo o endpoint `GET /metrics`.
6. Escrever testes unitários e de integração E2E para o novo endpoint.
