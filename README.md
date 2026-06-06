# SAAFO HUB - Sistema de Suporte aos Estudos

O SAAFO HUB é uma plataforma integrada de suporte acadêmico desenvolvida para otimizar o aprendizado e a produtividade de estudantes de tecnologia e outras áreas. A solução reúne ferramentas de gerenciamento de tempo, agendamento de tarefas e consolidação de conhecimento através do método de memorização ativa e repetição espaçada.

---

## 1. Estrutura do Projeto

O sistema é estruturado como um monorepo dividido em duas partes principais:

*   **`/backend`**: API REST desenvolvida em Node.js com o framework **NestJS**, utilizando TypeScript, Prisma ORM para persistência no banco de dados PostgreSQL, integração com a API do Google Gemini para recursos de inteligência artificial, e serviços de notificação por WhatsApp/E-mail.
*   **`/frontend`**: Aplicação Single Page Application (SPA) desenvolvida em **React** com Vite, TypeScript e estilização customizada focada em desempenho e acessibilidade.

---

## 2. Tecnologias Utilizadas

### Backend
*   **Framework:** NestJS
*   **Linguagem:** TypeScript
*   **ORM:** Prisma ORM
*   **Banco de Dados:** PostgreSQL 16
*   **Autenticação:** JSON Web Token (JWT) e Google OAuth 2.0
*   **Processamento de IA:** Google Gemini API (modelo Gemini Pro)
*   **Integrações Externas:** Asaas API (Gateway de pagamentos) e notificações automatizadas

### Frontend
*   **Biblioteca:** React
*   **Ferramenta de Build:** Vite
*   **Linguagem:** TypeScript
*   **Gerenciamento de Rotas:** React Router DOM
*   **Estilização:** Vanilla CSS estruturado com tokens de design customizados

---

## 3. Instalação e Execução Local

### Pré-requisitos
*   Node.js (versão 18 ou superior)
*   Docker e Docker Compose (opcional, para execução do banco de dados)
*   Instância local ou remota de banco de dados PostgreSQL

### Configuração do Banco de Dados
Caso opte por rodar o PostgreSQL via Docker:
```bash
docker-compose up -d
```

### Inicialização do Backend
1. Navegue até o diretório do backend:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` baseado no `.env.example` e configure as variáveis de ambiente:
   ```env
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/saafo-hub"
   JWT_SECRET="sua_chave_secreta_jwt"
   GEMINI_API_KEY="sua_chave_api_gemini"
   PORT=3000
   ```
4. Execute as migrations do Prisma:
   ```bash
   npx prisma migrate dev
   ```
5. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run start:dev
   ```

### Inicialização do Frontend
1. Navegue até o diretório do frontend:
   ```bash
   cd ../frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` e defina a URL da API do backend:
   ```env
   VITE_API_URL="http://localhost:3000"
   ```
4. Inicie o servidor de desenvolvimento do Vite:
   ```bash
   npm run dev
   ```
5. Acesse a aplicação no navegador em `http://localhost:5173`.

---

## 4. Testes e Validação

Para executar a suíte de testes no backend:
```bash
cd backend
npm run test          # Testes unitários
npm run test:e2e      # Testes end-to-end (E2E)
npm run test:cov      # Cobertura de código
```

---

## 5. Arquitetura de Produção e Deploy

O sistema é implantado em ambiente de produção utilizando contêineres Docker orquestrados pela plataforma **Coolify** em uma VPS dedicada.

*   **Frontend Produção:** [https://saafo.tiezar.pro](https://saafo.tiezar.pro)
*   **Backend API Produção:** [https://saafo-api.tiezar.pro](https://saafo-api.tiezar.pro)
*   **Banco de Dados Produção:** PostgreSQL 16 hospedado em nuvem de forma persistente.

---

## 6. Arquitetura MTC (Exigência Acadêmica)

Esta seção atende aos requisitos do edital e diretrizes da disciplina de Programação II para a modelagem arquitetural da solução.

### A. Visão Geral e Problema Resolvido
O SAAFO HUB resolve o problema da retenção ineficiente de conhecimento acadêmico, desorganização no cronograma de estudos e sobrecarga mental enfrentados por estudantes de graduação durante períodos de exames. A solução consolida rotinas de aprendizado por meio do agendamento automatizado de revisões utilizando repetição espaçada, monitoramento de progresso e simulações assistidas por inteligência artificial.

### B. Mapeamento do Padrão MTC (Model-Template-Controller)
Embora o SAAFO HUB adote uma arquitetura de microsserviços desacoplada (REST API + SPA), seus componentes se alinham logicamente ao padrão MTC:
*   **Model (Dados e Regras de Negócio):** Compreende as entidades persistidas no banco de dados e suas lógicas associadas.
    *   `User`: Representa os dados cadastrais, preferências, controle de trial e assinatura do estudante.
    *   `Subject` e `Topic`: Estruturam a árvore de conteúdos acadêmicos cadastrados pelo usuário.
    *   `Card` (Flashcard): Contém as informações de pergunta (frente), resposta (verso) e os dados de repetição baseados no algoritmo SM-2.
    *   `StudySession` / `CardReview`: Monitora a duração das sessões e armazena os logs individuais de avaliação de resposta.
    *   `CalendarEvent`: Contém os dados de eventos agendados pelo estudante, incluindo integrações para disparos de lembretes.
*   **Template (Interface Visual / View):** Telas desenvolvidas em React consumidas pelo navegador do usuário:
    *   `Dashboard`: Tela inicial que exibe relatórios gráficos, mapa de calor de engajamento e insights automatizados.
    *   `Materials`: Ambiente para criação, edição e visualização de matérias e tópicos.
    *   `AIGenerator`: Tela para submissão de materiais didáticos (PDF ou texto) e visualização de flashcards gerados por IA.
    *   `StudySessionOverlay`: Interface em tela cheia que opera o reprodutor interativo de flashcards.
    *   `CalendarPage`: Grade mensal e agenda semanal de compromissos acadêmicos.
    *   `Pomodoro`: Timer interativo para aplicação de blocos de foco.
    *   `ExamSession`: Interface para simulação e avaliação de testes teóricos objetivos e discursivos.
*   **Controller (Manipuladores de Rotas):** Endpoints responsáveis por receber as chamadas HTTP do frontend, interagir com o Model correspondente, executar a lógica de validação e formatar o retorno. Equivalem às rotas mapeadas na API, tais como:
    *   `POST /auth/register` e `POST /auth/login`
    *   `POST /subjects` e `GET /subjects`
    *   `POST /cards` e `GET /cards`
    *   `POST /study-sessions/review` (Processamento do algoritmo SM-2)
    *   `POST /ai/generate` (Processamento de materiais via Gemini)

### C. Estrutura e Modelagem Orientada a Objetos (Model)
A arquitetura do Model adota conceitos rigorosos de orientação a objetos:
1.  **Classe Abstrata Base (`BaseEntity`):** Para evitar duplicação de atributos (princípio DRY), implementou-se uma classe base abstrata que define os campos `id` (UUID), `createdAt` e `updatedAt`. As classes de negócio (`User`, `Subject`, `Card`, `CalendarEvent`) herdam diretamente de `BaseEntity`.
2.  **Polimorfismo e Herança em Cartões:** O modelo de `Card` serve como classe base para extensões do sistema. Subclasses como `ClozeCard` (questões de lacunas) e `ImageCard` (questões com diagramas) herdam a estrutura matemática de agendamento de revisão, alterando apenas a lógica de renderização e validação das respostas por meio do polimorfismo.
3.  **Encapsulamento e Regras de Negócio Internas:** Atributos críticos como o Fator de Facilidade (`efactor`) e a data da próxima revisão (`nextReview`) são modificados exclusivamente por métodos encapsulados da classe, protegendo o estado interno contra inconsistências.

### D. Plano Mínimo de Implementação da Solução (MVP)

| Funcionalidade | Rota do Endpoint | Método HTTP | Classe(s) do Model | Template | O que o Controller faz |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Autenticação e Registro** | `/auth/register` | `POST` | `User` | `Auth` | Recebe nome, e-mail e senha. Aplica criptografia hash na senha, persiste a nova instância de `User` com plano inicial de teste e envia o link de ativação da conta. |
| **Cadastro de Matérias** | `/subjects` | `POST` | `Subject`, `User` | `Materials` | Recebe o nome da disciplina, cor identificadora e ID do usuário. Cria o registro de `Subject` no banco de dados se os dados forem válidos. |
| **Cadastro de Flashcards** | `/cards` | `POST` | `Card`, `Topic` | `Materials` | Recebe a pergunta (frente), resposta (verso) e o identificador do tópico de estudo. Inicializa os metadados do SM-2 e salva a entidade no banco de dados. |
| **Revisão com Algoritmo SM-2** | `/study-sessions/review` | `POST` | `Card`, `CardReview`, `StudySession` | `StudySessionOverlay` | Recebe o ID do cartão e a nota de avaliação de 0 a 5. Executa os cálculos do algoritmo SuperMemo-2, agenda a nova data de revisão e insere o log de atividade. |
| **Geração de Flashcards por IA** | `/ai/generate` | `POST` | `Card`, `Topic` | `AIGenerator` | Recebe o texto de apoio ou conteúdo de arquivo e o tópico de destino. Envia a carga de dados para a API do Gemini Pro, extrai a lista estruturada de perguntas e respostas e as persiste. |
| **Agendamento no Calendário** | `/calendar/events` | `POST` | `CalendarEvent`, `Subject` | `CalendarPage` | Recebe dados do compromisso (título, horários, tipo, lembretes). Persiste a entidade `CalendarEvent` e inicializa a fila de disparos de lembrete por WhatsApp/E-mail. |
