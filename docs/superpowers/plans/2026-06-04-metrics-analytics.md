# Plano de Implementação: Métricas, Histórico & Análise de Desempenho (Subprojeto 3)

Este plano descreve o desenvolvimento passo a passo do **Subprojeto 3 (Métricas, Histórico & Análise de Desempenho)** do SAAFO HUB, mantendo o rigor arquitetural (Clean Architecture) e padrões de segurança de propriedade de recursos.

---

## Roadmap de Desenvolvimento

### Task 9: Entidades de Domínio e Contratos
- [x] **Step 1: Criar a entidade analítica e sub-valores** em `src/domain/entities/study-metrics.ts`.
- [x] **Step 2: Criar a interface do repositório** em `src/domain/repositories/metrics-repository.interface.ts`.

### Task 10: Casos de Uso (Application Layer)
- [x] **Step 1: Criar o caso de uso `GetStudyMetricsUseCase`** em `src/application/use-cases/get-study-metrics.use-case.ts`.
- [x] **Step 2: Criar testes unitários para o caso de uso** para validar lógica e mocks de retorno.

### Task 11: Repositório Prisma (Infrastructure Layer)
- [x] **Step 1: Criar o `PrismaMetricsRepository`** em `src/infrastructure/database/prisma-metrics.repository.ts`.
- [x] **Step 2: Registrar o repositório** no `DatabaseModule`.

### Task 12: Controlador HTTP e Rotas
- [x] **Step 1: Criar o `MetricsController`** em `src/infrastructure/http/controllers/metrics.controller.ts` expondo `GET /metrics`.
- [x] **Step 2: Proteger o endpoint** usando `JwtAuthGuard` e validar query parameters (limite de dias).
- [x] **Step 3: Adicionar o controlador** no `MaterialsMemoryModule` ou em módulo dedicado.

### Task 13: Testes E2E de Integração
- [x] **Step 1: Criar testes de integração E2E** em `test/metrics.e2e-spec.ts` ou estender `test/app.e2e-spec.ts` para testar o endpoint de métricas integrado ao banco PostgreSQL.
