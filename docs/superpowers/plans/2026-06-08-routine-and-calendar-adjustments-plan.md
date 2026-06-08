# Weekly Routine & Calendar UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Minha Rotina Semanal" (Weekly Routine) editor under the User Profile, display recurring routine blocks as overlays/watermarks on the calendar, and replace the confusing datetime-local event end time input with a simple time input.

**Architecture:** Use Prisma to persist weekly routines as a Postgres model containing labels, colors, and JSON arrays of time intervals. Expose CRUD routes on the backend `ProfileController`. Update `AppContext` and `CalendarPage` on the frontend to handle time formatting, date synchronizations, and routine layout rendering.

**Tech Stack:** NestJS, Prisma (PostgreSQL), React, Lucide Icons, Vanilla CSS.

---

### Task 1: Prisma DB Schema & Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Update the Prisma Schema**
  Add the `UserWeeklyRoutine` model and establish the relation inside the `User` model.
  
  ```prisma
  // Inside backend/prisma/schema.prisma:
  // Add relation to User model:
  // weeklyRoutines UserWeeklyRoutine[]
  
  model UserWeeklyRoutine {
    id        String   @id @default(uuid())
    userId    String
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    label     String
    color     String   @default("#6366f1")
    days      Int[]
    slots     Json
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
  
    @@map("user_weekly_routines")
  }
  ```

- [ ] **Step 2: Generate and Apply Migration**
  Run: `npx prisma migrate dev --name add_user_weekly_routine` inside `backend/` directory.
  Expected: Command succeeds and migration is successfully applied to PostgreSQL.

- [ ] **Step 3: Commit migration changes**
  Run: `git add backend/prisma/schema.prisma backend/prisma/migrations/`
  Run: `git commit -m "db: add user_weekly_routines schema and run migration"`

---

### Task 2: Backend API Endpoints in ProfileController

**Files:**
- Modify: `backend/src/infrastructure/http/controllers/profile.controller.ts`

- [ ] **Step 1: Implement DTOs and Controller Endpoints**
  Add DTO validation and the four CRUD endpoints for `routines` in `ProfileController`.
  
  ```typescript
  // Import class-validator and NestJS decorators as needed.
  import { IsArray, ValidateNested } from 'class-validator';
  import { Type } from 'class-transformer';
  
  class RoutineSlotDto {
    @IsString()
    startTime: string; // "HH:MM"
  
    @IsString()
    endTime: string; // "HH:MM"
  }
  
  class CreateRoutineDto {
    @IsString()
    label: string;
  
    @IsString()
    color: string;
  
    @IsArray()
    @IsNumber({}, { each: true })
    days: number[]; // [1, 2, 3, 4, 5]
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RoutineSlotDto)
    slots: RoutineSlotDto[];
  }
  
  class UpdateRoutineDto extends PartialType(CreateRoutineDto) {}
  ```
  
  Inside `ProfileController` class, append:
  ```typescript
  @UseGuards(JwtAuthGuard)
  @Get('routines')
  async getRoutines(@Request() req: any) {
    return this.prisma.userWeeklyRoutine.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
    });
  }
  
  @UseGuards(JwtAuthGuard)
  @Post('routines')
  async createRoutine(@Request() req: any, @Body() body: CreateRoutineDto) {
    return this.prisma.userWeeklyRoutine.create({
      data: {
        userId: req.user.id,
        label: body.label,
        color: body.color,
        days: body.days,
        slots: body.slots as any,
      },
    });
  }
  
  @UseGuards(JwtAuthGuard)
  @Put('routines/:id')
  async updateRoutine(@Request() req: any, @Param('id') id: string, @Body() body: UpdateRoutineDto) {
    // Confirm ownership
    const routine = await this.prisma.userWeeklyRoutine.findFirst({
      where: { id, userId: req.user.id }
    });
    if (!routine) throw new NotFoundException('Rotina não encontrada');
  
    return this.prisma.userWeeklyRoutine.update({
      where: { id },
      data: {
        label: body.label,
        color: body.color,
        days: body.days,
        slots: body.slots !== undefined ? (body.slots as any) : undefined,
      },
    });
  }
  
  @UseGuards(JwtAuthGuard)
  @Delete('routines/:id')
  async deleteRoutine(@Request() req: any, @Param('id') id: string) {
    const routine = await this.prisma.userWeeklyRoutine.findFirst({
      where: { id, userId: req.user.id }
    });
    if (!routine) throw new NotFoundException('Rotina não encontrada');
  
    await this.prisma.userWeeklyRoutine.delete({ where: { id } });
    return { ok: true };
  }
  ```

- [ ] **Step 2: Commit API changes**
  Run: `git add backend/src/infrastructure/http/controllers/profile.controller.ts`
  Run: `git commit -m "feat(api): implement weekly routine CRUD endpoints in ProfileController"`

---

### Task 3: Frontend Types & Context State Integration

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/contexts/AppContext.tsx`

- [ ] **Step 1: Declare Types**
  Add the interfaces to `frontend/src/types.ts`:
  ```typescript
  export interface RoutineSlot {
    startTime: string; // "HH:MM"
    endTime: string;   // "HH:MM"
  }
  
  export interface UserWeeklyRoutine {
    id: string;
    userId: string;
    label: string;
    color: string;
    days: number[]; // 0 = Sunday, 1 = Monday... 6 = Saturday
    slots: RoutineSlot[];
    createdAt: string;
  }
  ```

- [ ] **Step 2: Add Weekly Routines state and functions to AppContext**
  Update `AppContext.tsx` to expose routine state, loading, and helper methods.
  ```typescript
  // Inside AppContext.tsx:
  // Add to AppContextType:
  //   weeklyRoutines: UserWeeklyRoutine[];
  //   fetchWeeklyRoutines: () => Promise<void>;
  //   createWeeklyRoutine: (data: Omit<UserWeeklyRoutine, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  //   updateWeeklyRoutine: (id: string, data: Partial<Omit<UserWeeklyRoutine, 'id' | 'userId' | 'createdAt'>>) => Promise<void>;
  //   deleteWeeklyRoutine: (id: string) => Promise<void>;
  
  // Inside AppProvider:
  const [weeklyRoutines, setWeeklyRoutines] = useState<UserWeeklyRoutine[]>([]);
  
  const fetchWeeklyRoutines = useCallback(async () => {
    try {
      const data = await apiCall('/profile/routines');
      setWeeklyRoutines(data || []);
    } catch { /* silent */ }
  }, [apiCall]);
  
  const createWeeklyRoutine = useCallback(async (data: any) => {
    const res = await apiCall('/profile/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setWeeklyRoutines(prev => [...prev, res]);
  }, [apiCall]);
  
  const updateWeeklyRoutine = useCallback(async (id: string, data: any) => {
    const res = await apiCall(`/profile/routines/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setWeeklyRoutines(prev => prev.map(r => r.id === id ? res : r));
  }, [apiCall]);
  
  const deleteWeeklyRoutine = useCallback(async (id: string) => {
    await apiCall(`/profile/routines/${id}`, { method: 'DELETE' });
    setWeeklyRoutines(prev => prev.filter(r => r.id !== id));
  }, [apiCall]);
  
  // Add fetchWeeklyRoutines call to activeSession or login flows:
  useEffect(() => {
    if (currentUser) {
      fetchWeeklyRoutines();
    } else {
      setWeeklyRoutines([]);
    }
  }, [currentUser, fetchWeeklyRoutines]);
  ```

- [ ] **Step 3: Commit state changes**
  Run: `git add frontend/src/types.ts frontend/src/contexts/AppContext.tsx`
  Run: `git commit -m "feat(frontend): integrate weekly routines state in AppContext"`

---

### Task 4: Profile UI implementation (Routine Builder)

**Files:**
- Modify: `frontend/src/pages/Profile.tsx`

- [ ] **Step 1: Add Weekly Routine Editor UI**
  Add a section `Minha Rotina Semanal` with full creation/edit modal and interval selectors in `Profile.tsx`.
  
  ```typescript
  // Inside Profile.tsx:
  // Add sub-states for routine forms
  const { weeklyRoutines, createWeeklyRoutine, updateWeeklyRoutine, deleteWeeklyRoutine } = useApp();
  
  const [editingRoutine, setEditingRoutine] = useState<UserWeeklyRoutine | null>(null);
  const [routineModalOpen, setRoutineModalOpen] = useState(false);
  const [routineLabel, setRoutineLabel] = useState('');
  const [routineColor, setRoutineColor] = useState('#6366f1');
  const [routineDays, setRoutineDays] = useState<number[]>([]);
  const [routineSlots, setRoutineSlots] = useState<{ startTime: string; endTime: string }[]>([
    { startTime: '08:00', endTime: '12:00' }
  ]);
  const [routineSaving, setRoutineSaving] = useState(false);
  
  const handleOpenNewRoutine = () => {
    setEditingRoutine(null);
    setRoutineLabel('');
    setRoutineColor('#6366f1');
    setRoutineDays([]);
    setRoutineSlots([{ startTime: '08:00', endTime: '12:00' }]);
    setRoutineModalOpen(true);
  };
  
  const handleOpenEditRoutine = (r: UserWeeklyRoutine) => {
    setEditingRoutine(r);
    setRoutineLabel(r.label);
    setRoutineColor(r.color);
    setRoutineDays(r.days);
    setRoutineSlots(r.slots.map(s => ({ startTime: s.startTime, endTime: s.endTime })));
    setRoutineModalOpen(true);
  };
  
  const handleSaveRoutine = async () => {
    if (!routineLabel.trim() || routineDays.length === 0 || routineSlots.length === 0) return;
    setRoutineSaving(true);
    try {
      const payload = {
        label: routineLabel.trim(),
        color: routineColor,
        days: routineDays,
        slots: routineSlots,
      };
      if (editingRoutine) {
        await updateWeeklyRoutine(editingRoutine.id, payload);
      } else {
        await createWeeklyRoutine(payload);
      }
      setRoutineModalOpen(false);
      showSuccess('Rotina atualizada!');
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setRoutineSaving(false);
    }
  };
  
  const handleDeleteRoutine = async (id: string) => {
    if (!window.confirm('Excluir esta rotina?')) return;
    try {
      await deleteWeeklyRoutine(id);
      showSuccess('Rotina removida.');
    } catch (err) {
      showError((err as Error).message);
    }
  };
  ```
  
  Insert UI JSX before the Danger Zone in `Profile.tsx`:
  *   List cards with styling consistent with event types list.
  *   Weekday selectors using simple styled circular buttons.
  *   Dynamic list of slots with remove buttons, plus an `+ Adicionar` button.

- [ ] **Step 2: Commit Profile UI changes**
  Run: `git add frontend/src/pages/Profile.tsx`
  Run: `git commit -m "feat(ui): add weekly routines editor to Profile page"`

---

### Task 5: Calendar UI Integration & Time Input Adjustment

**Files:**
- Modify: `frontend/src/pages/CalendarPage.tsx`

- [ ] **Step 1: Replace datetime-local with time input**
  Change "Horário de término (opcional)" to use `type="time"` and sync dates in `CalendarPage.tsx`.
  
  ```typescript
  // Inside startAt onChange:
  onChange={e => {
    const val = e.target.value;
    setEventDraft(d => {
      if (d.allDay) {
        return { ...d, startAt: val + 'T00:00' };
      } else {
        const patch: Partial<typeof d> = { startAt: val };
        if (d.endAt) {
          const newDatePart = val.split('T')[0];
          const oldTimePart = d.endAt.split('T')[1] || '10:00';
          patch.endAt = `${newDatePart}T${oldTimePart}`;
        }
        return { ...d, ...patch };
      }
    });
  }}
  ```
  
  ```typescript
  // Inside endAt input:
  <input 
    type="time" 
    className="academic-input" 
    style={{ fontFamily: 'var(--font-label)', fontSize: 14 }}
    value={eventDraft.endAt ? eventDraft.endAt.split('T')[1]?.slice(0, 5) || '' : ''} 
    onChange={e => {
      const time = e.target.value;
      setEventDraft(d => {
        if (!time) return { ...d, endAt: '' };
        const datePart = d.startAt.split('T')[0];
        return { ...d, endAt: `${datePart}T${time}` };
      });
    }} 
  />
  ```

- [ ] **Step 2: Add "Mostrar Rotina" toggle and render routine overlays**
  - Add state `const [showRoutine, setShowRoutine] = useState(true);` at the top of `CalendarPage`.
  - Render routines as watermark blocks in `MonthView` and `AgendaView`.
  
  Inside Month Grid rendering:
  If a day matches a routine day (`weeklyRoutines.some(r => r.days.includes(day.getDay()))`), render slots of the routine using dotted styling:
  ```typescript
  // Within cal-cell event rendering:
  {showRoutine && weeklyRoutines.filter(r => r.days.includes(day.getDay())).map((r, ri) => (
    r.slots.map((s, si) => (
      <div 
        key={`routine-${ri}-${si}`} 
        className="calendar-event-item"
        style={{
          background: 'transparent',
          color: r.color,
          borderLeft: `2px dashed ${r.color}`,
          fontStyle: 'italic',
          opacity: 0.6,
          pointerEvents: 'none'
        }}
      >
        {s.startTime} - {r.label}
      </div>
    ))
  ))}
  ```
  Do the same for `AgendaView` (interleave routine slots with lower opacity).

- [ ] **Step 3: Commit calendar changes**
  Run: `git add frontend/src/pages/CalendarPage.tsx`
  Run: `git commit -m "feat(calendar): update event end time input to time-only and integrate routine overlays"`
