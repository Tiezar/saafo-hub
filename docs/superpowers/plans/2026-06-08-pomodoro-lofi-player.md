# Ambiente Sonoro no Pomodoro (Lo-Fi & Chuva) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um reprodutor de áudio oculto integrado ao YouTube no painel do Pomodoro com suporte a faixas curadas editáveis via Painel do Administrador e adição de links personalizados pelo usuário.

**Architecture:** O backend persistirá as faixas padrão no PostgreSQL via modelo `CuratedTrack`. O painel Admin fará requisições CRUD para gerenciá-las, enquanto a página Pomodoro usará a YouTube IFrame Player API invisível para tocar os streams controlando-os com botões React customizados do Marginália.

**Tech Stack:** NestJS, Prisma (PostgreSQL), React (TypeScript), CSS, YouTube IFrame Player API.

---

### Task 1: Banco de Dados (Prisma Model & Migração)

**Files:**
- Modify: `backend/prisma/schema.prisma:250-252`

- [ ] **Step 1: Adicionar modelo CuratedTrack ao schema do Prisma**

Adicione o seguinte modelo ao final do arquivo `backend/prisma/schema.prisma`:
```prisma
model CuratedTrack {
  id        String   @id @default(uuid())
  name      String
  youtubeId String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("curated_tracks")
}
```

- [ ] **Step 2: Gerar e executar migração do Prisma**

Execute o comando para criar a migração no banco de dados local:
`npx prisma migrate dev --name add_curated_tracks`

- [ ] **Step 3: Commitar alteração do schema**

```bash
git add backend/prisma/schema.prisma
git commit -m "db: add CuratedTrack model"
```

---

### Task 2: Backend (Módulo, Controller & Endpoints de Pomodoro/Admin)

**Files:**
- Create: `backend/src/infrastructure/http/modules/pomodoro.module.ts`
- Create: `backend/src/infrastructure/http/controllers/pomodoro.controller.ts`
- Modify: `backend/src/infrastructure/http/controllers/admin.controller.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Criar o PomodoroController público**

Crie o arquivo `backend/src/infrastructure/http/controllers/pomodoro.controller.ts`:
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';

@Controller('pomodoro')
@UseGuards(JwtAuthGuard)
export class PomodoroController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('tracks')
  async getTracks() {
    return this.prisma.curatedTrack.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }
}
```

- [ ] **Step 2: Criar o PomodoroModule**

Crie o arquivo `backend/src/infrastructure/http/modules/pomodoro.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PomodoroController } from '../controllers/pomodoro.controller';
import { PrismaService } from '../../database/prisma.service';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [DatabaseModule, PassportModule],
  controllers: [PomodoroController],
  providers: [PrismaService, JwtStrategy],
})
export class PomodoroModule {}
```

- [ ] **Step 3: Adicionar PomodoroModule ao AppModule**

Edite `backend/src/app.module.ts` para importar o módulo:
```typescript
// Adicionar import
import { PomodoroModule } from './infrastructure/http/modules/pomodoro.module';

// Adicionar na lista imports do @Module:
// PomodoroModule
```

- [ ] **Step 4: Adicionar rotas administrativas em AdminController**

Adicione os métodos CRUD ao final da classe `AdminController` em `backend/src/infrastructure/http/controllers/admin.controller.ts`:
```typescript
  // ── GET /admin/tracks ───────────────────────────────────────────────────────
  @Get('tracks')
  async listAdminTracks() {
    return this.prisma.curatedTrack.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── POST /admin/tracks ──────────────────────────────────────────────────────
  @Post('tracks')
  async createTrack(@Req() req: any) {
    const { name, youtubeId } = req.body;
    if (!name || !youtubeId) {
      throw new BadRequestException('Nome e YouTube ID são obrigatórios.');
    }
    return this.prisma.curatedTrack.create({
      data: { name, youtubeId },
    });
  }

  // ── PUT /admin/tracks/:id ───────────────────────────────────────────────────
  @Post('tracks/:id') // Usando Post/Put conforme padrão Nest
  async updateTrack(@Param('id') id: string, @Req() req: any) {
    const { name, youtubeId } = req.body;
    if (!name || !youtubeId) {
      throw new BadRequestException('Nome e YouTube ID são obrigatórios.');
    }
    return this.prisma.curatedTrack.update({
      where: { id },
      data: { name, youtubeId },
    });
  }

  // ── DELETE /admin/tracks/:id ────────────────────────────────────────────────
  @Post('tracks/:id/delete')
  async deleteTrack(@Param('id') id: string) {
    await this.prisma.curatedTrack.delete({
      where: { id },
    });
    return { ok: true };
  }
```

- [ ] **Step 5: Verificar compilação**

Execute `npm run build` na pasta do backend para confirmar que tudo compila corretamente.

- [ ] **Step 6: Commitar modificações do backend**

```bash
git add backend/src/
git commit -m "feat(backend): add pomodoro tracks controllers and module"
```

---

### Task 3: Database Seeding (Sons Padrão Iniciais)

**Files:**
- Create: `backend/prisma/seed-tracks.ts`

- [ ] **Step 1: Criar o script de seed**

Crie o arquivo `backend/prisma/seed-tracks.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const initialTracks = [
    { name: '🎧 Lofi Girl Focus', youtubeId: 'jfKfPfyJRdk' },
    { name: '🌧️ Som de Chuva Intensa', youtubeId: 'hBGwt25VJ-s' },
    { name: '☕ Café Ambient (Jazz)', youtubeId: '5w3T1Jg0t6w' },
    { name: '🌲 Sons da Floresta', youtubeId: 'mPZkdNFkNps' },
  ];

  for (const track of initialTracks) {
    await prisma.curatedTrack.upsert({
      where: { id: track.youtubeId }, // Temporário ou buscar por nome
      update: {},
      create: {
        name: track.name,
        youtubeId: track.youtubeId,
      },
    });
  }
  console.log('Seed de músicas curadas concluído.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```
*Ajustando para usar criação por upsert baseado em nome ou simples `createMany` limpando a tabela:*
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Limpa antes para evitar duplicidade no seed
  await prisma.curatedTrack.deleteMany({});
  
  await prisma.curatedTrack.createMany({
    data: [
      { name: '🎧 Lofi Girl Focus', youtubeId: 'jfKfPfyJRdk' },
      { name: '🌧️ Som de Chuva Intensa', youtubeId: 'hBGwt25VJ-s' },
      { name: '☕ Café Ambient (Jazz)', youtubeId: '5w3T1Jg0t6w' },
      { name: '🌲 Sons da Floresta', youtubeId: 'mPZkdNFkNps' },
    ]
  });
  console.log('Seed de músicas curadas concluído.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

- [ ] **Step 2: Rodar o script de seed**

Rode o script utilizando o ts-node instalado no backend:
`npx ts-node prisma/seed-tracks.ts`

- [ ] **Step 3: Commitar script**

```bash
git add backend/prisma/seed-tracks.ts
git commit -m "seed: add curated tracks seed script"
```

---

### Task 4: Frontend Admin UI (Gerenciador de Faixas Curadas)

**Files:**
- Modify: `frontend/src/pages/Admin.tsx`

- [ ] **Step 1: Adicionar aba "Sons Pomodoro" no Admin.tsx**

Edite `frontend/src/pages/Admin.tsx` para incluir um seletor de abas (`activeTab` podendo ser `'users'` ou `'tracks'`) e renderizar a tabela de gerenciamento de músicas.
Adicione um formulário/modal simples para cadastrar novas músicas (Nome e link/ID do YouTube).
Substitua e edite as rotas de chamada usando `apiCall('/admin/tracks')`.

```typescript
// Exemplo de inclusão de estado:
const [activeTab, setActiveTab] = useState<'users' | 'tracks'>('users');
const [tracks, setTracks] = useState<{ id: string; name: string; youtubeId: string }[]>([]);
const [newTrackName, setNewTrackName] = useState('');
const [newTrackYoutubeId, setNewTrackYoutubeId] = useState('');
```

Insira a interface do gerenciador de faixas se `activeTab === 'tracks'`. Deve conter:
- Tabela listando faixas com opção de exclusão.
- Input rápido/formulário para adicionar uma nova faixa.

- [ ] **Step 2: Verificar e testar o build do Frontend**

Execute `npm run build` no diretório do frontend para assegurar que não há falhas de digitação e tipos.

- [ ] **Step 3: Commitar frontend admin**

```bash
git add frontend/src/pages/Admin.tsx
git commit -m "feat(admin): add pomodoro tracks CRUD UI"
```

---

### Task 5: Frontend Pomodoro (Som de Foco & YouTube Player API)

**Files:**
- Modify: `frontend/src/pages/Pomodoro.tsx`
- Modify: `frontend/src/pages/Pomodoro.css`

- [ ] **Step 1: Integrar reprodutor invisível e lógica da IFrame API**

Modifique `frontend/src/pages/Pomodoro.tsx`.
Insira a carga do script do YouTube:
```typescript
useEffect(() => {
  if (window.YT) return;
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
}, []);
```

Adicione o reprodutor com a tag invisível e as opções de controle:
- Controles personalizados: Play/Pause, Próximo, Slider de Volume.
- Dropdown integrado puxando faixas curadas de `GET /pomodoro/tracks` e mesclando com faixas personalizadas gravadas no `localStorage`.
- Modal customizado para o usuário adicionar links próprios (com campos `Nome` e `URL` do YouTube, aplicando regex para extração de ID).

- [ ] **Step 2: Adicionar estilos no CSS**

Edite `frontend/src/pages/Pomodoro.css` para estilizar o bloco do reprodutor e o modal de link customizado, mantendo a consistência com o tema Marginália.

- [ ] **Step 3: Verificar build do Frontend**

Execute `npm run build` na pasta do frontend para confirmar integridade estática do TypeScript e bundler.

- [ ] **Step 4: Commitar as alterações**

```bash
git add frontend/src/pages/Pomodoro.tsx frontend/src/pages/Pomodoro.css
git commit -m "feat(pomodoro): integrate custom lofi audio player"
```
