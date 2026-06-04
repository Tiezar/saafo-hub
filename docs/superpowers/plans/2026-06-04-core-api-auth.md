# Core API, Infraestrutura & Autenticação (Subprojeto 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inicializar a API do SAAFO HUB em NestJS com Prisma/PostgreSQL, configurar o fluxo de cadastro e login simplificado via Google Auth com emissão de JWT, rotas de atualização de perfil e middlewares robustos de segurança (Helmet, Rate Limit, CORS, ValidationPipes).

**Architecture:** A API seguirá os padrões de Clean Architecture e SOLID. As regras de negócio ficarão isoladas nas pastas `domain` e `application`, desacopladas de frameworks. A camada `infrastructure` fará o mapeamento e integração com NestJS, Prisma e provedores externos.

**Tech Stack:** NestJS, TypeScript, Prisma ORM, PostgreSQL, JWT (Passport), Google Auth Library, Helmet, NestJS Throttler, Bcrypt.

---

## Mapeamento de Arquivos
- **domain/entities/user.ts**: Entidade pura de usuário.
- **domain/repositories/user-repository.interface.ts**: Interface do repositório de dados.
- **application/use-cases/login-google.use-case.ts**: Caso de uso para validação do token do Google e login/cadastro.
- **application/use-cases/update-profile.use-case.ts**: Caso de uso para edição de perfil.
- **infrastructure/database/prisma.service.ts**: Integração do Prisma Client.
- **infrastructure/database/prisma-user.repository.ts**: Implementação concreta do repositório usando Prisma.
- **infrastructure/http/controllers/auth.controller.ts**: Endpoints de autenticação.
- **infrastructure/http/controllers/profile.controller.ts**: Endpoints de gestão de perfil.
- **infrastructure/http/guards/jwt-auth.guard.ts**: Middleware de segurança para proteção de rotas.
- **infrastructure/main.ts**: Inicialização do servidor configurando segurança de rede.

---

### Task 1: Scaffolding do NestJS

**Files:**
- Create: `nest-cli.json`, `tsconfig.json`, `package.json` (via Nest CLI)

- [x] **Step 1: Consultar ajuda do Nest CLI para instalação no diretório atual**
  
  Run: `npx -y @nestjs/cli new --help`
  Expected: Visualizar os parâmetros suportados, garantindo conformidade com a criação de novo projeto.

- [x] **Step 2: Inicializar o projeto NestJS no diretório atual**
  
  Run: `npx -y @nestjs/cli new ./ --directory ./ --package-manager npm --skip-git --skip-install`
  Expected: Estrutura inicial do NestJS criada no workspace sem conflito com o git atual.

- [x] **Step 3: Instalar as dependências essenciais de infraestrutura e desenvolvimento**
  
  Run: `npm install @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt google-auth-library helmet @nestjs/throttler class-validator class-transformer`
  Expected: Instalação com sucesso das dependências.

- [x] **Step 4: Instalar as dependências do Prisma e tipos de desenvolvimento**
  
  Run: `npm install -D prisma @types/bcrypt @types/passport-jwt @types/node @types/passport`
  Expected: Instalação das dependências de desenvolvimento.

- [x] **Step 5: Commit inicial**
  
  Run:
  ```bash
  git add package.json package-lock.json
  git commit -m "chore: scaffold nestjs base project and dependencies"
  ```

---

### Task 2: Configuração do Prisma & Database Schema

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `.env`

- [x] **Step 1: Inicializar o Prisma no projeto**
  
  Run: `npx prisma init`
  Expected: Criação da pasta `prisma/` e do arquivo `prisma/schema.prisma`.

- [x] **Step 2: Definir o schema do Prisma com a tabela User**
  
  Overwrite `prisma/schema.prisma` com:
  ```prisma
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
    nickname     String?
    googleId     String?  @unique
    passwordHash String?
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt

    @@map("users")
  }
  ```

- [x] **Step 3: Configurar a variável DATABASE_URL no .env**
  
  Configure a linha DATABASE_URL no arquivo `.env` para apontar para o PostgreSQL local de teste.
  ```env
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/saafo_db?schema=public"
  JWT_SECRET="temp-development-secret-for-saafo-hub-key-32chars"
  ```

- [x] **Step 4: Executar a migration inicial do banco**
  
  Run: `npx prisma migrate dev --name init`
  Expected: Geração das tabelas no banco de dados e do Prisma Client.

- [x] **Step 5: Commit**
  
  Run:
  ```bash
  git add prisma/schema.prisma .env
  git commit -m "db: configure prisma schema and migration for user model"
  ```

---

### Task 3: Camada de Domínio (Entidade e Repositório)

**Files:**
- Create: `src/domain/entities/user.ts`
- Create: `src/domain/repositories/user-repository.interface.ts`

- [x] **Step 1: Criar a entidade pura User**
  
  Write to `src/domain/entities/user.ts`:
  ```typescript
  export class User {
    constructor(
      public readonly id: string,
      public email: string,
      public name: string,
      public nickname?: string | null,
      public googleId?: string | null,
      public passwordHash?: string | null,
      public readonly createdAt?: Date,
      public readonly updatedAt?: Date,
    ) {}
  }
  ```

- [x] **Step 2: Criar a interface IUserRepository**
  
  Write to `src/domain/repositories/user-repository.interface.ts`:
  ```typescript
  import { User } from '../entities/user';

  export interface IUserRepository {
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    findByGoogleId(googleId: string): Promise<User | null>;
    create(user: Partial<User>): Promise<User>;
    update(id: string, user: Partial<User>): Promise<User>;
  }
  ```

- [x] **Step 3: Commit**
  
  Run:
  ```bash
  git add src/domain/entities/user.ts src/domain/repositories/user-repository.interface.ts
  git commit -m "domain: define user entity and repository interface"
  ```

---

### Task 4: Casos de Uso (Application Layer)

**Files:**
- Create: `src/application/use-cases/login-google.use-case.ts`
- Create: `src/application/use-cases/update-profile.use-case.ts`

- [x] **Step 1: Criar o Caso de Uso LoginGoogleUseCase**
  
  Write to `src/application/use-cases/login-google.use-case.ts`:
  ```typescript
  import { IUserRepository } from '../../domain/repositories/user-repository.interface';
  import { User } from '../../domain/entities/user';

  export class LoginGoogleUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(payload: { email: string; name: string; googleId: string }): Promise<User> {
      let user = await this.userRepository.findByGoogleId(payload.googleId);
      
      if (!user) {
        user = await this.userRepository.findByEmail(payload.email);
        
        if (user) {
          user = await this.userRepository.update(user.id, { googleId: payload.googleId });
        } else {
          user = await this.userRepository.create({
            email: payload.email,
            name: payload.name,
            googleId: payload.googleId,
          });
        }
      }
      return user;
    }
  }
  ```

- [x] **Step 2: Criar o Caso de Uso UpdateProfileUseCase**
  
  Write to `src/application/use-cases/update-profile.use-case.ts`:
  ```typescript
  import { IUserRepository } from '../../domain/repositories/user-repository.interface';
  import { User } from '../../domain/entities/user';
  import * as bcrypt from 'bcrypt';

  export interface UpdateProfileInput {
    name?: string;
    nickname?: string;
    password?: string;
  }

  export class UpdateProfileUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(userId: string, data: UpdateProfileInput): Promise<User> {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const updateData: Partial<User> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.nickname !== undefined) updateData.nickname = data.nickname;
      if (data.password !== undefined) {
        updateData.passwordHash = await bcrypt.hash(data.password, 12);
      }

      return this.userRepository.update(userId, updateData);
    }
  }
  ```

- [x] **Step 3: Commit**
  
  Run:
  ```bash
  git add src/application/use-cases/login-google.use-case.ts src/application/use-cases/update-profile.use-case.ts
  git commit -m "application: implement login google and update profile use cases"
  ```

---

### Task 5: Implementação do Banco de Dados no Infra (Prisma Service & Repositories)

**Files:**
- Create: `src/infrastructure/database/prisma.service.ts`
- Create: `src/infrastructure/database/prisma-user.repository.ts`
- Create: `src/infrastructure/database/database.module.ts`

- [x] **Step 1: Criar o PrismaService**
  
  Write to `src/infrastructure/database/prisma.service.ts`:
  ```typescript
  import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
  import { PrismaClient } from '@prisma/client';

  @Injectable()
  export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
      await this.$connect();
    }

    async onModuleDestroy() {
      await this.$disconnect();
    }
  }
  ```

- [x] **Step 2: Criar a implementação de PrismaUserRepository**
  
  Write to `src/infrastructure/database/prisma-user.repository.ts`:
  ```typescript
  import { Injectable } from '@nestjs/common';
  import { PrismaService } from './prisma.service';
  import { IUserRepository } from '../../domain/repositories/user-repository.interface';
  import { User } from '../../domain/entities/user';
  import { User as PrismaUser } from '@prisma/client';

  @Injectable()
  export class PrismaUserRepository implements IUserRepository {
    constructor(private prisma: PrismaService) {}

    private toDomain(prismaUser: PrismaUser): User {
      return new User(
        prismaUser.id,
        prismaUser.email,
        prismaUser.name,
        prismaUser.nickname,
        prismaUser.googleId,
        prismaUser.passwordHash,
        prismaUser.createdAt,
        prismaUser.updatedAt,
      );
    }

    async findByEmail(email: string): Promise<User | null> {
      const user = await this.prisma.user.findUnique({ where: { email } });
      return user ? this.toDomain(user) : null;
    }

    async findById(id: string): Promise<User | null> {
      const user = await this.prisma.user.findUnique({ where: { id } });
      return user ? this.toDomain(user) : null;
    }

    async findByGoogleId(googleId: string): Promise<User | null> {
      const user = await this.prisma.user.findUnique({ where: { googleId } });
      return user ? this.toDomain(user) : null;
    }

    async create(user: Partial<User>): Promise<User> {
      const created = await this.prisma.user.create({
        data: {
          email: user.email!,
          name: user.name!,
          googleId: user.googleId,
          passwordHash: user.passwordHash,
        },
      });
      return this.toDomain(created);
    }

    async update(id: string, user: Partial<User>): Promise<User> {
      const updated = await this.prisma.user.update({
        where: { id },
        data: {
          name: user.name,
          nickname: user.nickname,
          googleId: user.googleId,
          passwordHash: user.passwordHash,
        },
      });
      return this.toDomain(updated);
    }
  }
  ```

- [x] **Step 3: Criar o DatabaseModule**
  
  Write to `src/infrastructure/database/database.module.ts`:
  ```typescript
  import { Module } from '@nestjs/common';
  import { PrismaService } from './prisma.service';
  import { PrismaUserRepository } from './prisma-user.repository';

  @Module({
    providers: [
      PrismaService,
      {
        provide: 'IUserRepository',
        useClass: PrismaUserRepository,
      },
    ],
    exports: [PrismaService, 'IUserRepository'],
  })
  export class DatabaseModule {}
  ```

- [x] **Step 4: Commit**
  
  Run:
  ```bash
  git add src/infrastructure/database/
  git commit -m "infra: implement database module and prisma repositories"
  ```

---

### Task 6: Autenticação HTTP (Google Auth Validador e Emissão JWT)

**Files:**
- Create: `src/infrastructure/http/strategies/jwt.strategy.ts`
- Create: `src/infrastructure/http/controllers/auth.controller.ts`
- Create: `src/infrastructure/http/modules/auth.module.ts`

- [x] **Step 1: Criar a JWT Strategy para autenticação posterior**
  
  Write to `src/infrastructure/http/strategies/jwt.strategy.ts`:
  ```typescript
  import { Injectable, UnauthorizedException } from '@nestjs/common';
  import { PassportStrategy } from '@nestjs/passport';
  import { ExtractJwt, Strategy } from 'passport-jwt';

  @Injectable()
  export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: process.env.JWT_SECRET || 'temp-development-secret-for-saafo-hub-key-32chars',
      });
    }

    async validate(payload: { sub: string; email: string }) {
      return { id: payload.sub, email: payload.email };
    }
  }
  ```

- [x] **Step 2: Criar o AuthController com validação Google e login**
  
  Write to `src/infrastructure/http/controllers/auth.controller.ts`:
  ```typescript
  import { Controller, Post, Body, Inject, BadRequestException } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  import { OAuth2Client } from 'google-auth-library';
  import { LoginGoogleUseCase } from '../../../application/use-cases/login-google.use-case';
  import { IUserRepository } from '../../../domain/repositories/user-repository.interface';
  import { IsNotEmpty, IsString } from 'class-validator';

  class LoginGoogleDto {
    @IsString()
    @IsNotEmpty()
    token: string;
  }

  @Controller('auth')
  export class AuthController {
    private googleClient: OAuth2Client;
    private loginGoogleUseCase: LoginGoogleUseCase;

    constructor(
      @Inject('IUserRepository') private userRepository: IUserRepository,
      private jwtService: JwtService,
    ) {
      this.googleClient = new OAuth2Client();
      this.loginGoogleUseCase = new LoginGoogleUseCase(userRepository);
    }

    @Post('google')
    async loginGoogle(@Body() body: LoginGoogleDto) {
      try {
        const ticket = await this.googleClient.verifyIdToken({
          idToken: body.token,
          // Se tiver CLIENT_ID configurável por env, pode setar audience
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email || !payload.sub || !payload.name) {
          throw new BadRequestException('Token do Google inválido ou sem as informações necessárias');
        }

        const user = await this.loginGoogleUseCase.execute({
          email: payload.email,
          name: payload.name,
          googleId: payload.sub,
        });

        const jwtPayload = { email: user.email, sub: user.id };
        return {
          access_token: this.jwtService.sign(jwtPayload),
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            nickname: user.nickname,
          },
        };
      } catch (err) {
        throw new BadRequestException('Falha na validação do token do Google: ' + (err as Error).message);
      }
    }
  }
  ```

- [x] **Step 3: Criar o AuthModule**
  
  Write to `src/infrastructure/http/modules/auth.module.ts`:
  ```typescript
  import { Module } from '@nestjs/common';
  import { JwtModule } from '@nestjs/jwt';
  import { PassportModule } from '@nestjs/passport';
  import { DatabaseModule } from '../../database/database.module';
  import { AuthController } from '../controllers/auth.controller';
  import { JwtStrategy } from '../strategies/jwt.strategy';

  @Module({
    imports: [
      DatabaseModule,
      PassportModule,
      JwtModule.register({
        secret: process.env.JWT_SECRET || 'temp-development-secret-for-saafo-hub-key-32chars',
        signOptions: { expiresIn: '1h' },
      }),
    ],
    controllers: [AuthController],
    providers: [JwtStrategy],
  })
  export class AuthModule {}
  ```

- [x] **Step 4: Commit**
  
  Run:
  ```bash
  git add src/infrastructure/http/strategies/jwt.strategy.ts src/infrastructure/http/controllers/auth.controller.ts src/infrastructure/http/modules/auth.module.ts
  git commit -m "http: implement authentication controllers, strategy, and modules"
  ```

---

### Task 7: Edição de Perfil HTTP (Proteção e Hash de Senha)

**Files:**
- Create: `src/infrastructure/http/guards/jwt-auth.guard.ts`
- Create: `src/infrastructure/http/controllers/profile.controller.ts`
- Create: `src/infrastructure/http/modules/profile.module.ts`

- [x] **Step 1: Criar o JwtAuthGuard**
  
  Write to `src/infrastructure/http/guards/jwt-auth.guard.ts`:
  ```typescript
  import { Injectable } from '@nestjs/common';
  import { AuthGuard } from '@nestjs/passport';

  @Injectable()
  export class JwtAuthGuard extends AuthGuard('jwt') {}
  ```

- [x] **Step 2: Criar o ProfileController**
  
  Write to `src/infrastructure/http/controllers/profile.controller.ts`:
  ```typescript
  import { Controller, Patch, Body, UseGuards, Request, Inject, NotFoundException } from '@nestjs/common';
  import { JwtAuthGuard } from '../guards/jwt-auth.guard';
  import { UpdateProfileUseCase } from '../../../application/use-cases/update-profile.use-case';
  import { IUserRepository } from '../../../domain/repositories/user-repository.interface';
  import { IsString, IsOptional, MinLength } from 'class-validator';

  class UpdateProfileDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    nickname?: string;

    @IsString()
    @IsOptional()
    @MinLength(6)
    password?: string;
  }

  @Controller('profile')
  export class ProfileController {
    private updateProfileUseCase: UpdateProfileUseCase;

    constructor(@Inject('IUserRepository') private userRepository: IUserRepository) {
      this.updateProfileUseCase = new UpdateProfileUseCase(userRepository);
    }

    @UseGuards(JwtAuthGuard)
    @Patch()
    async updateProfile(@Request() req: any, @Body() body: UpdateProfileDto) {
      try {
        const user = await this.updateProfileUseCase.execute(req.user.id, body);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          nickname: user.nickname,
        };
      } catch (err) {
        throw new NotFoundException((err as Error).message);
      }
    }
  }
  ```

- [x] **Step 3: Criar o ProfileModule**
  
  Write to `src/infrastructure/http/modules/profile.module.ts`:
  ```typescript
  import { Module } from '@nestjs/common';
  import { DatabaseModule } from '../../database/database.module';
  import { ProfileController } from '../controllers/profile.controller';

  @Module({
    imports: [DatabaseModule],
    controllers: [ProfileController],
  })
  export class ProfileModule {}
  ```

- [x] **Step 4: Commit**
  
  Run:
  ```bash
  git add src/infrastructure/http/guards/jwt-auth.guard.ts src/infrastructure/http/controllers/profile.controller.ts src/infrastructure/http/modules/profile.module.ts
  git commit -m "http: add profile updates with secure authorization guards"
  ```

---

### Task 8: Configurações Globais de Segurança (Helmet, Rate Limit e CORS)

**Files:**
- Modify: `src/app.module.ts`
- Modify: `src/main.ts`

- [x] **Step 1: Configurar a proteção Throttler no AppModule**
  
  Overwrite `src/app.module.ts` com a proteção global do NestJS e integração de módulos:
  ```typescript
  import { Module } from '@nestjs/common';
  import { ConfigModule } from '@nestjs/config';
  import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
  import { APP_GUARD } from '@nestjs/core';
  import { AuthModule } from './infrastructure/http/modules/auth.module';
  import { ProfileModule } from './infrastructure/http/modules/profile.module';
  import { DatabaseModule } from './infrastructure/database/database.module';

  @Module({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      ThrottlerModule.forRoot([{
        ttl: 60000 * 15, // 15 minutos
        limit: 100, // Máximo de 100 requisições
      }]),
      DatabaseModule,
      AuthModule,
      ProfileModule,
    ],
    providers: [
      {
        provide: APP_GUARD,
        useClass: ThrottlerGuard,
      },
    ],
  })
  export class AppModule {}
  ```

- [x] **Step 2: Configurar Helmet, CORS e Validações Globais no Entrypoint**
  
  Overwrite `src/main.ts` com:
  ```typescript
  import { NestFactory } from '@nestjs/core';
  import { AppModule } from './app.module';
  import { ValidationPipe } from '@nestjs/common';
  import helmet from 'helmet';

  async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // 1. Configuração do Helmet para HTTP Headers de Segurança
    app.use(helmet());

    // 2. Configuração de CORS Restrito
    app.enableCors({
      origin: process.env.FRONTEND_URL || '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    // 3. Validação global do Payload das rotas
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
  }
  bootstrap();
  ```

- [x] **Step 3: Deletar arquivos gerados automaticamente pelo scaffold original que não usamos**
  
  Run: `rm -f src/app.controller.ts src/app.controller.spec.ts src/app.service.ts`
  Expected: Limpeza de código boilerplate desnecessário.

- [x] **Step 4: Executar verificação e build do projeto**
  
  Run: `npm run build`
  Expected: O build compila com sucesso sem erros de sintaxe ou tipagem.

- [x] **Step 5: Commit**
  
  Run:
  ```bash
  git add src/app.module.ts src/main.ts src/app.controller.ts src/app.controller.spec.ts src/app.service.ts
  git commit -m "security: apply helmet, restricted cors, global pipes and throttler limits"
  ```
