# SAAFO HUB - Documentação da API Backend

Esta documentação descreve todos os endpoints REST disponíveis no backend do **SAAFO HUB**, incluindo contratos de entrada/saída, requisitos de autenticação e políticas de controle de taxa (Rate Limiting).

---

## 📌 Configurações Gerais

### 🔒 Autenticação
A maior parte dos endpoints requer autenticação via **JSON Web Token (JWT)**.
* Os tokens JWT expiram em **1 hora**.
* Para autenticar as requisições, envie o cabeçalho HTTP:
  ```http
  Authorization: Bearer <seu_token_jwt>
  ```

### 🛑 Rate Limiting e Cabeçalhos de Segurança
* **Rate Limiter Geral:** Máximo de 100 requisições a cada 15 minutos por IP (gerido por `ThrottlerGuard`).
* **Segurança:** Cabeçalhos `Helmet` aplicados por padrão, políticas estritas de CORS e Content Security Policy (CSP).

---

## 🔑 1. Autenticação (Auth)

### `POST /auth/google`
Realiza o login ou cadastro de usuários através da integração com o Google OAuth 2.0.

* **Requer Autenticação:** Não
* **Payload (Body):**
  ```json
  {
    "token": "string (Google ID token obtido no frontend)"
  }
  ```
* **Resposta de Sucesso (201 Created):**
  ```json
  {
    "access_token": "string (JWT Token)",
    "user": {
      "id": "string (UUID)",
      "email": "string",
      "name": "string",
      "nickname": "string | null"
    }
  }
  ```
* **Erros Comuns:**
  * `400 Bad Request`: Token inválido ou ausência de dados básicos no payload do Google.

---

## 👤 2. Perfil de Usuário (Profile)

### `PATCH /profile`
Atualiza os dados cadastrais do perfil do usuário autenticado.

* **Requer Autenticação:** Sim
* **Payload (Body - Todos os campos são opcionais):**
  ```json
  {
    "name": "string",
    "nickname": "string",
    "password": "string (mínimo de 6 caracteres)",
    "institutionId": "string (UUID de uma instituição pré-registrada)"
  }
  ```
* **Resposta de Sucesso (200 OK):**
  ```json
  {
    "id": "string (UUID)",
    "email": "string",
    "name": "string",
    "nickname": "string | null",
    "institutionId": "string (UUID) | null"
  }
  ```
* **Erros Comuns:**
  * `401 Unauthorized`: Token ausente ou inválido.
  * `404 Not Found`: Usuário não encontrado.

---

## 🏛️ 3. Busca de Instituições de Ensino (Institutions)

### `GET /institutions`
Busca e autocomplete de instituições de ensino brasileiras pré-registradas na base de dados.

* **Requer Autenticação:** Não
* **Parâmetros de Consulta (Query):**
  * `search` (opcional): Filtro textual de busca (filtra por nome oficial ou sigla).
* **Resposta de Sucesso (200 OK):**
  * *Sem busca (retorna as primeiras 30 ordenadas alfabeticamente):*
  * *Com busca:*
  ```json
  [
    {
      "id": "string (UUID)",
      "name": "Universidade de São Paulo",
      "sigla": "USP",
      "uf": "São Paulo",
      "domains": ["usp.br"],
      "createdAt": "string (ISO Date)",
      "updatedAt": "string (ISO Date)"
    }
  ]
  ```

---

## 📚 4. Matérias (Subjects)

### `POST /subjects`
Cria uma nova matéria de estudos.

* **Requer Autenticação:** Sim
* **Payload (Body):**
  ```json
  {
    "name": "string (Nome da matéria)",
    "color": "string (opcional - cor hexadecimal, ex: '#ff0000')"
  }
  ```
* **Resposta de Sucesso (201 Created):**
  ```json
  {
    "id": "string (UUID)",
    "name": "string",
    "color": "string | null",
    "userId": "string (UUID)",
    "createdAt": "string (ISO Date)",
    "updatedAt": "string (ISO Date)"
  }
  ```

### `GET /subjects`
Lista todas as matérias associadas ao usuário autenticado.

* **Requer Autenticação:** Sim
* **Resposta de Sucesso (200 OK):**
  ```json
  [
    {
      "id": "string (UUID)",
      "name": "string",
      "color": "string | null",
      "userId": "string (UUID)",
      "createdAt": "string (ISO Date)",
      "updatedAt": "string (ISO Date)"
    }
  ]
  ```

### `DELETE /subjects/:id`
Deleta uma matéria do usuário autenticado. 
> [!WARNING]
> A remoção da matéria aciona uma **deleção em cascata (Cascade Delete)** no banco, apagando automaticamente todos os tópicos, flashcards e registros de revisão vinculados a ela.

* **Requer Autenticação:** Sim
* **Resposta de Sucesso (200 OK):**
  ```json
  {
    "success": true
  }
  ```
* **Erros Comuns:**
  * `403 Forbidden`: Tentativa de deletar uma matéria de outro usuário.
  * `404 Not Found`: Matéria não encontrada.

---

## 📂 5. Tópicos (Topics)

### `POST /topics`
Cria um novo tópico dentro de uma matéria existente.

* **Requer Autenticação:** Sim
* **Payload (Body):**
  ```json
  {
    "name": "string (Nome do tópico)",
    "subjectId": "string (UUID da matéria correspondente)"
  }
  ```
* **Resposta de Sucesso (201 Created):**
  ```json
  {
    "id": "string (UUID)",
    "name": "string",
    "subjectId": "string (UUID)",
    "createdAt": "string (ISO Date)",
    "updatedAt": "string (ISO Date)"
  }
  ```

### `GET /topics`
Lista todos os tópicos de uma matéria específica.

* **Requer Autenticação:** Sim
* **Parâmetros de Consulta (Query - Obrigatório):**
  * `subjectId`: UUID da matéria.
* **Resposta de Sucesso (200 OK):**
  ```json
  [
    {
      "id": "string (UUID)",
      "name": "string",
      "subjectId": "string (UUID)",
      "createdAt": "string (ISO Date)",
      "updatedAt": "string (ISO Date)"
    }
  ]
  ```

### `DELETE /topics/:id`
Deleta um tópico específico.
> [!WARNING]
> Deleta em cascata todos os flashcards e métricas associados ao tópico.

* **Requer Autenticação:** Sim
* **Resposta de Sucesso (200 OK):**
  ```json
  {
    "success": true
  }
  ```

---

## 🎴 6. Flashcards (Cards)

### `POST /cards`
Cria manualmente um novo flashcard dentro de um tópico.

* **Requer Autenticação:** Sim
* **Payload (Body):**
  ```json
  {
    "front": "string (Pergunta/Frente)",
    "back": "string (Resposta/Verso)",
    "topicId": "string (UUID do tópico correspondente)"
  }
  ```
* **Resposta de Sucesso (201 Created):**
  ```json
  {
    "id": "string (UUID)",
    "front": "string",
    "back": "string",
    "topicId": "string (UUID)",
    "userId": "string (UUID)",
    "interval": 1,
    "repetition": 0,
    "efactor": 2.5,
    "nextReview": "string (ISO Date)",
    "createdAt": "string (ISO Date)",
    "updatedAt": "string (ISO Date)"
  }
  ```

### `GET /cards`
Lista todos os flashcards de um tópico específico.

* **Requer Autenticação:** Sim
* **Parâmetros de Consulta (Query - Obrigatório):**
  * `topicId`: UUID do tópico.
* **Resposta de Sucesso (200 OK):**
  ```json
  [
    {
      "id": "string (UUID)",
      "front": "string",
      "back": "string",
      "topicId": "string (UUID)",
      "userId": "string (UUID)",
      "interval": "number",
      "repetition": "number",
      "efactor": "number",
      "nextReview": "string (ISO Date)",
      "createdAt": "string (ISO Date)",
      "updatedAt": "string (ISO Date)"
    }
  ]
  ```

### `DELETE /cards/:id`
Deleta um flashcard do usuário autenticado.

* **Requer Autenticação:** Sim
* **Resposta de Sucesso (200 OK):**
  ```json
  {
    "success": true
  }
  ```

---

## 🤖 7. Geração de Flashcards por Inteligência Artificial (AI)

### `POST /ai/generate`
Gera flashcards automaticamente a partir de um bloco de texto/resumo fornecido pelo usuário, utilizando a API do Gemini Pro.

* **Requer Autenticação:** Sim
* **Rate Limiting:** **Máximo de 5 chamadas a cada 15 minutos** por usuário autenticado.
* **Payload (Body):**
  ```json
  {
    "text": "string (Conteúdo do PDF, anotação ou resumo para ler)",
    "topicId": "string (UUID do tópico onde os flashcards gerados serão salvos)"
  }
  ```
* **Resposta de Sucesso (201 Created):**
  ```json
  [
    {
      "id": "string (UUID)",
      "front": "string (Pergunta gerada pela IA)",
      "back": "string (Resposta correspondente gerada)",
      "topicId": "string (UUID)",
      "userId": "string (UUID)",
      "interval": 1,
      "repetition": 0,
      "efactor": 2.5,
      "nextReview": "string (ISO Date)"
    }
  ]
  ```

---

## ⏱️ 8. Sessões de Estudo e Repetição Espaçada (SM-2)

### `POST /study-sessions`
Inicia uma nova sessão de estudos global para registrar revisões.

* **Requer Autenticação:** Sim
* **Resposta de Sucesso (201 Created):**
  ```json
  {
    "id": "string (UUID)",
    "userId": "string (UUID)",
    "startTime": "string (ISO Date)",
    "endTime": "string | null",
    "createdAt": "string (ISO Date)"
  }
  ```

### `GET /study-sessions`
Lista o histórico de sessões de estudo realizadas pelo usuário.

* **Requer Autenticação:** Sim
* **Resposta de Sucesso (200 OK):**
  ```json
  [
    {
      "id": "string (UUID)",
      "userId": "string (UUID)",
      "startTime": "string (ISO Date)",
      "endTime": "string (ISO Date) | null",
      "createdAt": "string (ISO Date)"
    }
  ]
  ```

### `GET /study-sessions/due`
Lista todos os flashcards do usuário que estão **pendentes de revisão** (data de `nextReview` menor ou igual ao momento atual).

* **Requer Autenticação:** Sim
* **Resposta de Sucesso (200 OK):**
  ```json
  [
    {
      "id": "string (UUID)",
      "front": "string",
      "back": "string",
      "topicId": "string (UUID)",
      "userId": "string (UUID)",
      "interval": "number",
      "repetition": "number",
      "efactor": "number",
      "nextReview": "string (ISO Date)"
    }
  ]
  ```

### `POST /study-sessions/review`
Registra a avaliação do usuário sobre um flashcard revisado e atualiza seus metadados de repetição espaçada usando o algoritmo **SM-2 (SuperMemo-2)**.

* **Requer Autenticação:** Sim
* **Payload (Body):**
  ```json
  {
    "cardId": "string (UUID do flashcard)",
    "sessionId": "string (UUID da sessão de estudos activa)",
    "rating": "number (Qualidade da resposta, de 0 a 5)"
  }
  ```
  * **Ratings SM-2:**
    * `5`: Resposta perfeita, sem hesitação.
    * `4`: Resposta correta após hesitação.
    * `3`: Resposta correta com dificuldade.
    * `2`: Resposta incorreta, mas de fácil recordação.
    * `1`: Resposta incorreta, recordou vagamente.
    * `0`: Esquecimento total do card.
* **Resposta de Sucesso (201 Created):**
  ```json
  {
    "id": "string (UUID do log de revisão)",
    "cardId": "string (UUID)",
    "studySessionId": "string (UUID)",
    "rating": 5,
    "reviewedAt": "string (ISO Date)",
    "card": {
      "id": "string (UUID)",
      "interval": 6,
      "repetition": 2,
      "efactor": 2.6,
      "nextReview": "string (ISO Date)"
    }
  }
  ```

---

## 📊 9. Métricas e Desempenho (Metrics & Analytics)

### `GET /metrics`
Recupera dados analíticos consolidados de desempenho e engajamento do usuário.

* **Requer Autenticação:** Sim
* **Parâmetros de Consulta (Query):**
  * `days` (opcional): Período limite de dias retroativos para análise (Padrão: `30`).
* **Resposta de Sucesso (200 OK):**
  ```json
  {
    "totalReviewed": 42,
    "averageRating": 4.2,
    "retentionRate": 85.5,
    "dailyActivity": [
      {
        "date": "2026-06-04",
        "count": 12
      }
    ],
    "subjectsPerformance": [
      {
        "subjectId": "string (UUID)",
        "subjectName": "Direito Constitucional",
        "totalCards": 15,
        "reviewedCards": 10,
        "averageRating": 4.5,
        "retentionRate": 90.0
      }
    ]
  }
  ```
