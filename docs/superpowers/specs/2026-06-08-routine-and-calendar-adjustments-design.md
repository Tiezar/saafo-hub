# Design Spec: Minha Rotina Semanal & Ajustes de UX do Calendário

Este documento especifica o design arquitetural e de interface para a criação da funcionalidade de **Rotina Semanal** no perfil do usuário e a correção de usabilidade do **Horário de Término** no calendário do SAAFO HUB.

---

## 1. Motivação e Objetivos

*   **Facilidade de Estudo**: Permitir que o usuário defina seus horários ocupados recorrentes (trabalho, faculdade, igreja, etc.) para que o sistema (e futuras IAs) saiba exatamente quais são os blocos livres utilizáveis para metas e agendamento inteligente.
*   **Organização e Semântica**: Evitar que o usuário crie dezenas de eventos repetitivos no calendário de forma manual, poluindo visualmente os compromissos reais.
*   **Correção de UX no Calendário**: Resolver a ambiguidade entre o horário de término do evento (que usava `datetime-local` e pedia uma data) e a data de fim da recorrência do evento.

---

## 2. Especificação do Backend

### 2.1 Modelo do Banco de Dados (Prisma)
Adicionaremos um novo modelo `UserWeeklyRoutine` ao `schema.prisma` para salvar as rotinas estruturadas vinculadas a cada usuário.

```prisma
model UserWeeklyRoutine {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  label     String   // Ex: "Trabalho", "Faculdade", "Igreja"
  color     String   @default("#6366f1") // Cor para exibição visual
  days      Int[]    // Dias selecionados, ex: [1, 2, 3, 4, 5] (Segunda a Sexta)
  slots     Json     // Lista de intervalos, ex: [{"startTime": "08:00", "endTime": "12:00"}, {"startTime": "13:00", "endTime": "18:00"}]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("user_weekly_routines")
}
```

Também adicionaremos a relação no model `User`:
```prisma
weeklyRoutines UserWeeklyRoutine[]
```

### 2.2 Rotas da API
Criaremos um controlador de rotina sob a autenticação do usuário:
*   `GET /users/me/routines` — Lista todas as rotinas do usuário atual.
*   `POST /users/me/routines` — Cria um novo item de rotina semanal.
    *   **Payload**: `{ label: string, color: string, days: number[], slots: { startTime: string, endTime: string }[] }`
*   `PUT /users/me/routines/:id` — Atualiza um item de rotina.
*   `DELETE /users/me/routines/:id` — Remove um item de rotina.

---

## 3. Especificação do Frontend

### 3.1 Editor de Rotina no Perfil (`Profile.tsx`)
Abaixo do formulário de dados da conta e acima da Zona de Perigo, adicionaremos o painel **"Minha Rotina Semanal"**:
*   **Modo de Visualização**: Lista de cartões com as rotinas atuais (exibe o nome, a cor correspondente, os dias selecionados por extenso e os intervalos de horas).
*   **Modo de Edição/Criação**: Um modal ou formulário retrátil contendo:
    *   Input para o nome do compromisso fixo.
    *   Seletor de cores da paleta padrão.
    *   Seleção de dias da semana (botões redondos de clique alternável: `D`, `S`, `T`, `Q`, `Q`, `S`, `S`).
    *   **Construtor de Intervalos (Opção B)**: 
        *   Cada intervalo tem inputs `type="time"` para hora inicial e final, com um botão lateral de exclusão.
        *   Um botão "+ Adicionar Intervalo de Horário" permite que o usuário adicione mais linhas de horários (ex: um bloco de 08:00 às 12:00 e outro de 13:00 às 18:00, deixando o almoço como tempo livre).

### 3.2 Integração Visual com o Calendário (`CalendarPage.tsx`)
*   **Tópico de Exibição**: Adição de um botão de alternância no cabeçalho do calendário: `[x] Mostrar Rotina`.
*   **Month View**: Se ativado, os slots de rotina serão injetados de forma dinâmica nos dias correspondentes da semana como compromissos de fundo em marca d'água (estilo de texto em itálico, borda pontilhada suave, baixa opacidade). Eles não são clicáveis para edição de evento normal.
*   **Agenda View**: Slots de rotina serão mostrados intercalados em segundo plano, identificados como "Rotina" na barra de eventos diários.

### 3.3 Ajuste do Horário de Término no Calendário
*   O input de "Horário de término (opcional)" em `CalendarPage.tsx` passa a ser do tipo `time` em vez de `datetime-local`.
*   **Lógica de Sincronização**:
    ```typescript
    // Quando startAt muda (datetime-local):
    const newStartAt = e.target.value; // ex: "2026-06-08T09:00"
    setEventDraft(d => {
      const patch = { startAt: newStartAt };
      if (d.endAt) {
        const newDatePart = newStartAt.split('T')[0];
        const oldTimePart = d.endAt.split('T')[1] || '10:00';
        patch.endAt = `${newDatePart}T${oldTimePart}`;
      }
      return { ...d, ...patch };
    });
    ```
    ```typescript
    // Quando o input do Horário de término (time) muda:
    const newEndTime = e.target.value; // ex: "10:30"
    setEventDraft(d => {
      if (!newEndTime) return { ...d, endAt: '' };
      const datePart = d.startAt.split('T')[0];
      return { ...d, endAt: `${datePart}T${newEndTime}` };
    });
    ```

---

## 4. Plano de Teste e Validação

1.  **Validação de Banco de Dados**: Rodar as migrações do Prisma e verificar se a nova tabela `user_weekly_routines` é mapeada corretamente no banco PostgreSQL.
2.  **Validação de API**:
    *   Tentar salvar uma rotina com slots vazios ou horários inválidos (ex: término antes do início) e confirmar que o backend valida e rejeita.
    *   Validar que um usuário não consegue ver ou alterar as rotinas de outros usuários.
3.  **Validação de Calendário (Término)**:
    *   Criar um evento com início e término, mudar o dia de início e verificar que o término muda o dia mantendo a hora original.
    *   Criar uma recorrência e verificar que ela se estende perfeitamente até a data do fim da recorrência configurada.
4.  **Validação Visual da Rotina**:
    *   Cadastrar uma rotina no Perfil.
    *   Entrar no calendário, ativar o checkbox "Mostrar Rotina" e verificar se ela é renderizada de forma elegante e diferenciada nos dias correspondentes.
