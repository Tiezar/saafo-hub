# Especificação de Design: Core API, Infraestrutura & Autenticação (Subprojeto 1)

**Data:** 2026-06-04  
**Autor:** Antigravity (Google DeepMind Team)  
**Status:** Em Revisão  
**Projeto:** SAAFO HUB (SaaS de Estudos)  

---

## 1. Visão Geral
Esta especificação define o design do **Subprojeto 1** do SAAFO HUB, estabelecendo a fundação da API do backend. O objetivo é fornecer uma estrutura escalável baseada em **Clean Architecture** e **SOLID**, com foco em segurança rigorosa, autenticação simples via Google Auth, e persistência robusta utilizando NestJS, Prisma e PostgreSQL.

Esta fundação foi projetada para suportar tanto o cliente web quanto o futuro aplicativo Flutter.

---

## 2. Requisitos & Escopo

### Requisitos Funcionais (RF)
*   **Cadastro Simplificado:** Registro e login rápidos de novos usuários através do Google Auth.
*   **Gestão de Perfil:** Alteração de dados cadastrais (nome de exibição, apelido/username) e definição/alteração de senha local.

### Requisitos Não Funcionais (RNF)
*   **Arquitetura:** Clean Architecture, Clean Code, DRY e SOLID à risca.
*   **Segurança:** Proteção contra vulnerabilidades comuns (Headers HTTP, CORS, Rate Limit, CSP, HSTS, JWT, Hash de senhas).
*   **Legislação:** Conformidade com a LGPD (encriptação de dados sensíveis e segurança no transporte).
*   **Desempenho:** Resposta ágil e baixo overhead de CPU/memória no container do Coolify.

---

## 3. Arquitetura do Sistema

A API será desenvolvida usando **NestJS** e estruturada de forma a isolar as regras de negócio de detalhes de infraestrutura (frameworks, banco de dados, bibliotecas externas).

```
src/
├── domain/                      # Regras de Negócio Empresariais (TypeScript Puro, sem Nest/Prisma)
│   ├── entities/                # Entidades de Domínio (ex: User)
│   └── repositories/            # Interfaces de Repositórios (Contratos) (ex: UserRepository)
│
├── application/                 # Casos de Uso da Aplicação
│   ├── use-cases/               # Casos de Uso (ex: RegisterUserUseCase, UpdateProfileUseCase)
│   └── dtos/                    # DTOs de entrada/saída das regras de negócio
│
├── infrastructure/              # Implementações Técnicas e Acoplamentos (Dependente de NestJS/Prisma)
│   ├── database/                # Configuração do Prisma e implementações de Repositories
│   │   ├── prisma.service.ts
│   │   └── prisma-user.repository.ts
│   ├── http/                    # Controladores, Rotas, Guards e DTOs de validação HTTP
│   │   ├── controllers/         # Recebem requisições e invocam Casos de Uso
│   │   ├── guards/              # JWT Guard, Google Auth Guard
│   │   └── modules/             # Módulos de organização do NestJS
│   ├── config/                  # Gerenciamento de variáveis de ambiente e segurança
│   └── main.ts                  # Ponto de entrada da aplicação
```

### Regra de Dependência
As camadas internas (`domain` e `application`) **não importam** nada de `@nestjs/...` ou `@prisma/client`. As dependências externas são injetadas nas camadas internas por meio de interfaces (Inversão de Dependência).

---

## 4. Modelo de Dados (Prisma Schema)

O banco de dados relacional PostgreSQL conterá inicialmente a tabela `users`, mapeada a partir do domínio:

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String
  nickname     String?  // Apelido / Nome de usuário
  googleId     String?  @unique // Identificador único fornecido pelo Google OAuth
  passwordHash String?  // Senha criptografada (opcional para quem logar via Google)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("users")
}
```

---

## 5. Fluxo de Autenticação e Segurança

### 5.1 Google Auth + JWT (Stateless)
Para garantir a compatibilidade com a Web e o app Flutter sem a necessidade de redirecionamentos complexos de navegador:

```
+----------+             +----------+             +-------------+
| Frontend |             | API Nest |             | Google API  |
+----------+             +----------+             +-------------+
     |                        |                          |
     |--- Login com Google -->|                          | (Fluxo Nativo no Mobile/Web)
     |    (obtém idToken)     |                          |
     |                        |                          |
     |--- POST /auth/google ->|                          | (Envia o idToken para API)
     |    { token }           |                          |
     |                        |--- Validar idToken ----->|
     |                        |<-- Token Válido ---------|
     |                        |    (email, name, sub)    |
     |                        |                          |
     |                        |-- Criar/Achar User ----| |
     |                        |-- Gerar JWT SAAFO -----| |
     |<-- Retorna JWT --------|                          |
     |    (Token de Acesso)   |                          |
```

1. **Validação de Token:** A API recebe o `idToken` do Google e utiliza a biblioteca oficial `google-auth-library` para verificar a assinatura e autenticidade do token direto com a API do Google.
2. **Criação de Conta:** Se o e-mail não estiver cadastrado, cria-se um registro na tabela `users` populando o `googleId` (campo `sub` do Google).
3. **Geração do JWT da API:** Um token assinado de curta duração (ex: 1 hora) é retornado ao frontend contendo o `id` e o `email` do usuário.

### 5.2 Segurança das Rotas
*   **Guards:** Um `JwtAuthGuard` intercepta requisições nas rotas protegidas, validando o cabeçalho `Authorization: Bearer <TOKEN>`.
*   **Criptografia:** Senhas locais criadas ou atualizadas serão convertidas em hashes seguros usando a biblioteca `bcrypt` (custo `12`).

---

## 6. Configurações de Segurança de Rede e Middlewares

Como especificado em `arquitetura.md`, as seguintes camadas de segurança serão ativadas no arquivo `main.ts` da aplicação:

1.  **Helmet (Headers HTTP):** Proteção padrão de cabeçalhos de segurança contra XSS, MIME-sniffing, clickjacking e ativação obrigatória do HSTS (HTTP Strict Transport Security).
2.  **CORS:** Liberação exclusiva para origens específicas (definidas via variáveis de ambiente `FRONTEND_URL` e conexões móveis).
3.  **Rate Limiting:** Utilização do `@nestjs/throttler` configurado globalmente para prevenir ataques de força bruta e negação de serviço (DDoS).
    *   *Limite geral:* Máximo de 100 requisições por IP a cada 15 minutos.
    *   *Limite de Auth:* Máximo de 10 tentativas de login/cadastro por IP a cada 15 minutos.
4.  **Content Security Policy (CSP):** Restrição rígida de fontes e scripts permitidos caso a API sirva arquivos estáticos ou documentação (Swagger).
5.  **Validação Global de Payload:** Ativação de `ValidationPipe` do NestJS com as flags `whitelist: true` e `forbidNonWhitelisted: true` para bloquear requisições com dados extras maliciosos.

---

## 7. Roteiro de Implementação e Verificação
Para validar o sucesso do Subprojeto 1, executaremos as seguintes etapas:
1.  **Scaffolding do NestJS** e instalação das dependências essenciais (`@prisma/client`, `prisma`, `helmet`, `@nestjs/throttler`, `bcrypt`, `google-auth-library`, `@nestjs/jwt`).
2.  **Configuração do Prisma** com PostgreSQL local/Docker.
3.  **Desenvolvimento das Camadas de Domínio** (Entidades e Contratos) e do Repositório Prisma.
4.  **Implementação do Fluxo de Autenticação** (Validação Google Token -> Criação de Usuário -> Emissão de JWT).
5.  **Criação das Rotas de Perfil** (Alteração de nome/apelido e senha com hash seguro).
6.  **Ativação de Middlewares de Segurança** (Helmet, CORS, Rate Limiting, ValidationPipes).
7.  **Escrita de Testes Unitários** para os Casos de Uso (garantindo 100% de cobertura das regras de negócio).
8.  **Verificação Manual das Rotas** usando testes automatizados de integração ou scripts HTTP.
