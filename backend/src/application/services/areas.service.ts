import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { IAIService } from '../../domain/services/ai-service.interface';

@Injectable()
export class AreasService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('IAIService') private readonly aiService: IAIService,
  ) {}

  // 1. List global templates
  async listTemplates() {
    return this.prisma.area.findMany({
      where: { isTemplate: true },
      include: {
        banca: true,
        subjects: {
          include: {
            topics: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // 2. List user's registered areas
  async listMyAreas(userId: string) {
    return this.prisma.userArea.findMany({
      where: { userId },
      include: {
        area: {
          include: {
            banca: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Get current active study area context
  async getActiveArea(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile || !profile.activeUserAreaId) {
      return {
        activeArea: null,
        onboardingStatus: profile?.onboardingStatus ?? 'PENDING',
      };
    }

    const activeArea = await this.prisma.userArea.findUnique({
      where: { id: profile.activeUserAreaId },
      include: {
        area: {
          include: {
            banca: true,
          },
        },
        subjects: {
          where: { parentId: null }, // Return root subjects first (Sciences of Nature, etc.)
          include: {
            subSubjects: {
              include: {
                topics: true,
              },
            },
            topics: true,
          },
        },
      },
    });

    return {
      activeArea,
      onboardingStatus: profile.onboardingStatus,
    };
  }

  // 4. Select template area and clone subjects/topics
  async selectTemplateArea(userId: string, areaId: string) {
    const areaTemplate = await this.prisma.area.findFirst({
      where: { id: areaId, isTemplate: true },
      include: {
        subjects: {
          include: {
            topics: true,
          },
        },
      },
    });

    if (!areaTemplate) {
      throw new NotFoundException(
        'Template de área de estudos não encontrado.',
      );
    }

    // Check if user already registered this area
    let userArea = await this.prisma.userArea.findUnique({
      where: {
        userId_areaId: {
          userId,
          areaId,
        },
      },
    });

    if (!userArea) {
      // Create user area relation
      userArea = await this.prisma.userArea.create({
        data: {
          userId,
          areaId,
          isActive: true,
        },
      });

      // Clone subjects and topics
      const subjectMapping = new Map<string, string>();

      // Clone parent subjects first
      const parentSubjects = areaTemplate.subjects.filter((s) => !s.parentId);
      const childSubjects = areaTemplate.subjects.filter((s) => s.parentId);

      for (const tSubject of parentSubjects) {
        const clonedSub = await this.prisma.subject.create({
          data: {
            name: tSubject.name,
            color: tSubject.color,
            userId,
            userAreaId: userArea.id,
          },
        });
        subjectMapping.set(tSubject.id, clonedSub.id);

        // Clone topics directly associated with this parent
        for (const tTopic of tSubject.topics) {
          await this.prisma.topic.create({
            data: {
              name: tTopic.name,
              subjectId: clonedSub.id,
            },
          });
        }
      }

      // Clone subSubjects (depth level 2)
      for (const tSubject of childSubjects) {
        const dbParentId = subjectMapping.get(tSubject.parentId!);
        const clonedSub = await this.prisma.subject.create({
          data: {
            name: tSubject.name,
            color: tSubject.color,
            userId,
            userAreaId: userArea.id,
            parentId: dbParentId,
          },
        });
        subjectMapping.set(tSubject.id, clonedSub.id);

        // Clone topics associated with child subject
        for (const tTopic of tSubject.topics) {
          await this.prisma.topic.create({
            data: {
              name: tTopic.name,
              subjectId: clonedSub.id,
            },
          });
        }
      }
    }

    // Set other areas as inactive
    await this.prisma.userArea.updateMany({
      where: { userId, NOT: { id: userArea.id } },
      data: { isActive: false },
    });

    // Update active area setting
    await this.prisma.userArea.update({
      where: { id: userArea.id },
      data: { isActive: true },
    });

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const status =
      profile?.onboardingStatus === 'COMPLETED' ? 'COMPLETED' : 'CHOSEN_AREA';

    await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        activeUserAreaId: userArea.id,
        onboardingStatus: status,
      },
      create: {
        userId,
        activeUserAreaId: userArea.id,
        onboardingStatus: status,
      },
    });

    return { success: true, userAreaId: userArea.id };
  }

  // 5. Create a custom area via IA
  async createCustomArea(userId: string, name: string, bancaId?: string) {
    let customData;
    try {
      customData = await this.aiService.generateCustomAreaSubjects(name);
    } catch {
      // Fallback: Grade curricular padrão caso IA falhe
      customData = {
        name,
        subjects: [
          {
            name: 'Língua Portuguesa',
            color: '#3B82F6',
            topics: ['Ortografia', 'Sintaxe', 'Interpretação de Texto'],
          },
          {
            name: 'Raciocínio Lógico',
            color: '#10B981',
            topics: ['Proposições', 'Lógica de Argumentação', 'Diagramas'],
          },
          {
            name: 'Conhecimentos Gerais',
            color: '#F59E0B',
            topics: ['Atualidades', 'História Geral', 'Geografia'],
          },
        ],
      };
    }

    // Create the custom Area entry
    const area = await this.prisma.area.create({
      data: {
        name: customData.name,
        type: 'CUSTOM',
        bancaId: bancaId || null,
        isTemplate: false,
        createdById: userId,
      },
    });

    // Save AreaSubjects and AreaTopics as template fields for the Area
    for (const sub of customData.subjects) {
      await this.prisma.areaSubject.create({
        data: {
          areaId: area.id,
          name: sub.name,
          color: sub.color,
          topics: {
            create: sub.topics.map((tName) => ({ name: tName, priority: 3 })),
          },
        },
      });
    }

    // Reuse select logic by passing the newly created custom Area ID
    return this.selectTemplateArea(userId, area.id);
  }

  // 6. Switch active area context
  async switchActiveArea(userId: string, id: string) {
    const userArea = await this.prisma.userArea.findFirst({
      where: { id, userId },
    });

    if (!userArea) {
      throw new NotFoundException('Área de estudos do usuário não encontrada.');
    }

    await this.prisma.$transaction([
      this.prisma.userArea.updateMany({
        where: { userId, NOT: { id } },
        data: { isActive: false },
      }),
      this.prisma.userArea.update({
        where: { id },
        data: { isActive: true },
      }),
      this.prisma.userProfile.update({
        where: { userId },
        data: { activeUserAreaId: id },
      }),
    ]);

    return { success: true };
  }

  // 7. Delete area and cascade
  async deleteArea(userId: string, id: string) {
    const userArea = await this.prisma.userArea.findFirst({
      where: { id, userId },
    });

    if (!userArea) {
      throw new NotFoundException('Área de estudos não encontrada.');
    }

    // Cascade deletes trigger automatically from Prisma schema settings
    await this.prisma.userArea.delete({
      where: { id },
    });

    // Clear active area if we just deleted it
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (profile && profile.activeUserAreaId === id) {
      const remainingArea = await this.prisma.userArea.findFirst({
        where: { userId },
      });

      await this.prisma.userProfile.update({
        where: { userId },
        data: {
          activeUserAreaId: remainingArea?.id || null,
          onboardingStatus: remainingArea ? 'COMPLETED' : 'PENDING',
        },
      });
    }

    return { success: true };
  }

  // 8. Generate diagnostic questions
  async startDiagnostic(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile || !profile.activeUserAreaId) {
      throw new BadRequestException(
        'Selecione uma área de estudos ativa primeiro.',
      );
    }

    const userArea = await this.prisma.userArea.findUnique({
      where: { id: profile.activeUserAreaId },
      include: {
        area: { include: { banca: true } },
        subjects: { include: { topics: true } },
      },
    });

    if (!userArea)
      throw new NotFoundException('Área de estudos ativa não encontrada.');

    // Look for existing global diagnostic test in DB
    let diagTest = await this.prisma.diagnosticTest.findUnique({
      where: { areaId: userArea.areaId },
      include: { questions: true },
    });

    if (!diagTest) {
      // Generate questions via AI
      const mapping = userArea.subjects.map((s) => ({
        name: s.name,
        topics: s.topics.map((t) => t.name),
      }));

      let generatedQuestions;
      try {
        generatedQuestions = await this.aiService.generateDiagnosticQuestions(
          userArea.area.name,
          mapping,
          userArea.area.banca?.name,
        );
      } catch {
        // Fallback static questions if AI fails
        generatedQuestions = userArea.subjects.slice(0, 3).map((sub) => ({
          subjectName: sub.name,
          topicName: sub.topics[0]?.name || 'Geral',
          statement: `Questão de nivelamento para a disciplina de ${sub.name}. Qual a alternativa correta?`,
          options: [
            'Alternativa A (Correta)',
            'Alternativa B',
            'Alternativa C',
            'Alternativa D',
          ],
          correctOptionIdx: 0,
          explanation: 'Esta é uma questão padrão de fallback.',
        }));
      }

      diagTest = await this.prisma.diagnosticTest.create({
        data: {
          areaId: userArea.areaId,
          name: `Nivelamento - ${userArea.area.name}`,
          questions: {
            create: generatedQuestions.map((q) => ({
              subjectName: q.subjectName,
              topicName: q.topicName,
              statement: q.statement,
              options: q.options,
              correctOptionIdx: q.correctOptionIdx,
              explanation: q.explanation,
            })),
          },
        },
        include: { questions: true },
      });
    }

    // Return questions hiding the correct answer indices
    const questionsForUser = diagTest.questions.map((q) => ({
      id: q.id,
      subjectName: q.subjectName,
      topicName: q.topicName,
      statement: q.statement,
      options: q.options,
    }));

    return {
      testId: diagTest.id,
      questions: questionsForUser,
    };
  }

  // 9. Grade and create adaptive calendar schedule
  async submitDiagnostic(
    userId: string,
    answers: { questionId: string; selectedIdx: number }[],
  ) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile || !profile.activeUserAreaId) {
      throw new BadRequestException(
        'Selecione uma área de estudos ativa primeiro.',
      );
    }

    const userArea = await this.prisma.userArea.findUnique({
      where: { id: profile.activeUserAreaId },
      include: {
        area: true,
        subjects: { include: { topics: true } },
      },
    });

    if (!userArea)
      throw new NotFoundException('Área de estudos ativa não encontrada.');

    // Fetch correct answers
    const diagTest = await this.prisma.diagnosticTest.findUnique({
      where: { areaId: userArea.areaId },
      include: { questions: true },
    });

    if (!diagTest)
      throw new NotFoundException(
        'Teste diagnóstico correspondente não encontrado.',
      );

    let correctCount = 0;
    const userAnswersToSave: any[] = [];

    // Map correct indexes
    const questionsMap = new Map(diagTest.questions.map((q) => [q.id, q]));

    for (const ans of answers) {
      const q = questionsMap.get(ans.questionId);
      if (q) {
        const isCorrect = q.correctOptionIdx === ans.selectedIdx;
        if (isCorrect) correctCount++;
        userAnswersToSave.push({
          questionId: ans.questionId,
          selectedIdx: ans.selectedIdx,
          isCorrect,
        });
      }
    }

    const totalQuestions = diagTest.questions.length || 1;
    const scorePct = (correctCount / totalQuestions) * 100;

    // Save diagnostic results
    const result = await this.prisma.userDiagnosticResult.create({
      data: {
        userAreaId: userArea.id,
        score: scorePct,
        answers: {
          create: userAnswersToSave,
        },
      },
    });

    // Compute subject proficiency metrics to generate scheduling priorities
    const subjectGrades = new Map<string, { total: number; correct: number }>();
    userArea.subjects.forEach((sub) =>
      subjectGrades.set(sub.name, { total: 0, correct: 0 }),
    );

    for (const ans of userAnswersToSave) {
      const q = questionsMap.get(ans.questionId);
      if (q && subjectGrades.has(q.subjectName)) {
        const current = subjectGrades.get(q.subjectName)!;
        current.total++;
        if (ans.isCorrect) current.correct++;
      }
    }

    // Generate Adaptive Schedule
    // Priority weights = 1.0 - (correct/total).
    const priorityMapping = userArea.subjects.map((sub) => {
      const grade = subjectGrades.get(sub.name);
      let weight = 0.5; // Default middle priority
      if (grade && grade.total > 0) {
        weight = 1.0 - grade.correct / grade.total;
      }
      return {
        subjectId: sub.id,
        name: sub.name,
        weight: Math.max(0.1, weight), // Guarantee at least a small weight
      };
    });

    // Sort by weight descending (hardest subjects first)
    priorityMapping.sort((a, b) => b.weight - a.weight);

    // Create UserStudySchedule
    const userSchedule = await this.prisma.userStudySchedule.upsert({
      where: { userAreaId: userArea.id },
      update: {},
      create: { userAreaId: userArea.id },
    });

    // Wipe previous items if re-doing onboarding
    await this.prisma.scheduleItem.deleteMany({
      where: { scheduleId: userSchedule.id },
    });

    // Generate weekly slots
    const slotsToCreate: any[] = [];
    const subjectsCount = priorityMapping.length;

    if (subjectsCount > 0) {
      // 1. Fetch user routines
      const routines = await this.prisma.userWeeklyRoutine.findMany({
        where: { userId },
      });

      const parseTime = (timeStr: string): number => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      const formatTime = (minutes: number): string => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      const getFreeIntervals = (
        day: number,
      ): { start: number; end: number }[] => {
        const occupied: { start: number; end: number }[] = [];
        for (const r of routines) {
          if (!r.days.includes(day)) continue;
          const slots = r.slots as any[];
          if (Array.isArray(slots)) {
            for (const s of slots) {
              if (s && s.startTime && s.endTime) {
                occupied.push({
                  start: parseTime(s.startTime),
                  end: parseTime(s.endTime),
                });
              }
            }
          }
        }
        occupied.sort((a, b) => a.start - b.start);
        // Merge overlapping
        const merged: { start: number; end: number }[] = [];
        for (const slot of occupied) {
          if (merged.length && slot.start <= merged[merged.length - 1].end) {
            merged[merged.length - 1].end = Math.max(
              merged[merged.length - 1].end,
              slot.end,
            );
          } else {
            merged.push({ ...slot });
          }
        }
        // Gaps from 06:00 (360 min) to 23:00 (1380 min)
        const free: { start: number; end: number }[] = [];
        let cursor = 360;
        for (const { start, end } of merged) {
          if (start > cursor) {
            free.push({ start: cursor, end: start });
          }
          cursor = Math.max(cursor, end);
        }
        if (cursor < 1380) {
          free.push({ start: cursor, end: 1380 });
        }
        return free.filter((f) => f.end - f.start >= 50);
      };

      // 2. Select 10 subjects proportional to difficulty (D'Hondt method)
      const selectedSubjects: any[] = [];
      const allocatedCount = new Map<string, number>();
      priorityMapping.forEach((sub) => allocatedCount.set(sub.subjectId, 0));

      for (let i = 0; i < 10; i++) {
        let bestSubject = priorityMapping[0];
        let bestRatio = -1;

        for (const sub of priorityMapping) {
          const count = allocatedCount.get(sub.subjectId) || 0;
          const ratio = sub.weight / (count + 1);
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestSubject = sub;
          }
        }

        selectedSubjects.push(bestSubject);
        allocatedCount.set(
          bestSubject.subjectId,
          (allocatedCount.get(bestSubject.subjectId) || 0) + 1,
        );
      }

      // 3. Allocate 2 slots per day (from Mon-Fri, dayOfWeek 1 to 5)
      for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
        const dayIndex = dayOfWeek - 1;
        const sub1 = selectedSubjects[dayIndex];
        const sub2 = selectedSubjects[dayIndex + 5];

        const free = getFreeIntervals(dayOfWeek);
        let time1: string | null = null;
        let time2: string | null = null;

        const isWindowFree = (blockStart: number): boolean => {
          const blockEnd = blockStart + 50;
          return free.some((f) => f.start <= blockStart && f.end >= blockEnd);
        };

        // Try Evening: 19:00 (1140) and 20:00 (1200)
        if (isWindowFree(1140) && isWindowFree(1200)) {
          time1 = '19:00';
          time2 = '20:00';
        }
        // Try Morning: 09:00 (540) and 10:00 (600)
        else if (isWindowFree(540) && isWindowFree(600)) {
          time1 = '09:00';
          time2 = '10:00';
        }
        // Try Afternoon: 15:00 (900) and 16:00 (960)
        else if (isWindowFree(900) && isWindowFree(960)) {
          time1 = '15:00';
          time2 = '16:00';
        }
        // Greedy search in free windows
        else {
          const allocatedTimes: number[] = [];
          for (const interval of free) {
            let curr = interval.start;
            while (curr + 50 <= interval.end && allocatedTimes.length < 2) {
              allocatedTimes.push(curr);
              curr += 60; // 50m study + 10m break
            }
            if (allocatedTimes.length >= 2) break;
          }

          if (allocatedTimes.length >= 2) {
            time1 = formatTime(allocatedTimes[0]);
            time2 = formatTime(allocatedTimes[1]);
          } else if (allocatedTimes.length === 1) {
            time1 = formatTime(allocatedTimes[0]);
            time2 = '20:00';
          } else {
            time1 = '19:00';
            time2 = '20:00';
          }
        }

        slotsToCreate.push({
          scheduleId: userSchedule.id,
          dayOfWeek,
          subjectId: sub1.subjectId,
          duration: 50,
          priority: sub1.weight * 10,
          startTime: time1,
        });

        slotsToCreate.push({
          scheduleId: userSchedule.id,
          dayOfWeek,
          subjectId: sub2.subjectId,
          duration: 50,
          priority: sub2.weight * 10,
          startTime: time2,
        });
      }

      await this.prisma.scheduleItem.createMany({
        data: slotsToCreate,
      });
    }

    // Update onboarding status
    await this.prisma.userProfile.update({
      where: { userId },
      data: { onboardingStatus: 'COMPLETED' },
    });

    return {
      success: true,
      score: scorePct,
      correctCount,
      totalQuestions,
      resultId: result.id,
    };
  }

  // 10. Get active area study routine
  async getSchedule(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile || !profile.activeUserAreaId) {
      return { schedule: null, items: [] };
    }

    const schedule = await this.prisma.userStudySchedule.findUnique({
      where: { userAreaId: profile.activeUserAreaId },
      include: {
        items: {
          include: {
            subject: true,
            topic: true,
          },
        },
      },
    });

    return schedule;
  }

  // 11. Calculate week-by-week topic syllabus until the exam date
  async getScheduleProgression(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile || !profile.activeUserAreaId) {
      return { weeks: [], examDate: null };
    }

    const schedule = await this.prisma.userStudySchedule.findUnique({
      where: { userAreaId: profile.activeUserAreaId },
    });

    if (!schedule || !schedule.examDate) {
      return { weeks: [], examDate: null };
    }

    const examDate = new Date(schedule.examDate);
    const now = new Date();

    // Calculate start of current week (Monday)
    const dayOfWeekToday = now.getDay();
    const startOfWeek = new Date(now);
    const diffToMonday = dayOfWeekToday === 0 ? -6 : 1 - dayOfWeekToday;
    startOfWeek.setDate(now.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const examTime = examDate.getTime();
    const startTime = startOfWeek.getTime();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;

    const numWeeks = Math.min(
      100,
      Math.max(1, Math.ceil((examTime - startTime) / msPerWeek)),
    );

    const subjects = await this.prisma.subject.findMany({
      where: { userAreaId: profile.activeUserAreaId },
      include: {
        topics: {
          orderBy: { name: 'asc' },
        },
      },
    });

    const scheduleItems = await this.prisma.scheduleItem.findMany({
      where: { scheduleId: schedule.id },
      include: { subject: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    const weeks: any[] = [];
    for (let w = 0; w < numWeeks; w++) {
      const weekStart = new Date(startOfWeek);
      weekStart.setDate(startOfWeek.getDate() + w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      weeks.push({
        weekNumber: w + 1,
        startDate: weekStart.toISOString().slice(0, 10),
        endDate: weekEnd.toISOString().slice(0, 10),
        items: [],
      });
    }

    for (const subject of subjects) {
      const slotsS = scheduleItems.filter(
        (item) =>
          item.subjectId === subject.id &&
          (item.activityType === 'STUDY' || !item.activityType),
      );
      if (slotsS.length === 0) continue;

      const topicsS = subject.topics;
      if (topicsS.length === 0) {
        for (let w = 0; w < numWeeks; w++) {
          for (const slot of slotsS) {
            weeks[w].items.push({
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              duration: slot.duration,
              activityType: slot.activityType || 'STUDY',
              subject: {
                id: subject.id,
                name: subject.name,
                color: subject.color,
              },
              topics: [],
            });
          }
        }
        continue;
      }

      const totalSlots = slotsS.length * numWeeks;

      for (let idx = 0; idx < totalSlots; idx++) {
        const weekIndex = Math.floor(idx / slotsS.length);
        const slotIndex = idx % slotsS.length;
        const slot = slotsS[slotIndex];

        let assignedTopics: any[] = [];
        if (topicsS.length <= totalSlots) {
          const topic = topicsS[idx % topicsS.length];
          assignedTopics = [topic];
        } else {
          const chunkSize = Math.ceil(topicsS.length / totalSlots);
          const startIdx = idx * chunkSize;
          const endIdx = Math.min(topicsS.length, (idx + 1) * chunkSize);
          assignedTopics = topicsS.slice(startIdx, endIdx);
        }

        weeks[weekIndex].items.push({
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          duration: slot.duration,
          activityType: slot.activityType || 'STUDY',
          subject: {
            id: subject.id,
            name: subject.name,
            color: subject.color,
          },
          topics: assignedTopics,
        });
      }
    }

    // Map practice slots (SIMULADO / REDACO)
    const practiceSlots = scheduleItems.filter(
      (item) =>
        item.activityType === 'SIMULADO' || item.activityType === 'REDACO',
    );
    for (let w = 0; w < numWeeks; w++) {
      for (const slot of practiceSlots) {
        weeks[w].items.push({
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          duration: slot.duration,
          activityType: slot.activityType,
          subject: null,
          topics: [],
        });
      }
    }

    for (const week of weeks) {
      week.items.sort((a: any, b: any) => {
        if (a.dayOfWeek !== b.dayOfWeek) {
          return a.dayOfWeek - b.dayOfWeek;
        }
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
    }

    return {
      weeks,
      examDate: schedule.examDate,
    };
  }

  // 12. Auto-suggest schedule based on all areas
  async autoGenerateSchedule(userId: string) {
    // 1. Collect all areas and their subjects
    const userAreas = await this.prisma.userArea.findMany({
      where: { userId },
      include: {
        area: true,
        subjects: {
          where: { parentId: null }, // root subjects only
          include: { subSubjects: true },
        },
        schedules: {
          include: { items: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (userAreas.length === 0) {
      return { areas: [] };
    }

    // 2. Get existing routines to avoid time conflicts
    const routines = await this.prisma.userWeeklyRoutine.findMany({
      where: { userId },
    });

    // Helper: parse "HH:MM" → minutes
    const toMin = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    // Check if a given slot overlaps with any routine on a given day
    const isRoutineConflict = (
      dayOfWeek: number,
      startMin: number,
      durationMin: number,
    ): boolean => {
      for (const routine of routines) {
        if (!routine.days.includes(dayOfWeek)) continue;
        const slots: any[] = Array.isArray(routine.slots)
          ? routine.slots
          : JSON.parse(routine.slots as string);
        for (const s of slots) {
          const rStart = toMin(s.startTime || s.start || '00:00');
          const rEnd = toMin(s.endTime || s.end || '23:59');
          const slotEnd = startMin + durationMin;
          if (startMin < rEnd && rStart < slotEnd) return true;
        }
      }
      return false;
    };

    // 3. Build flat subject list weighted by priority
    type WeightedSubject = {
      subjectId: string;
      name: string;
      color: string | null;
      userAreaId: string;
      areaName: string;
      priority: number;
    };

    const weightedSubjects: WeightedSubject[] = [];

    for (const ua of userAreas) {
      const existingItems = ua.schedules?.items ?? [];
      const areaName = ua.area?.name || 'Área Personalizada';

      const flatSubjects = [
        ...ua.subjects,
        ...ua.subjects.flatMap((s) => s.subSubjects),
      ];

      for (const sub of flatSubjects) {
        // Find existing priority from schedule; default to 10
        const existingItem = existingItems.find(
          (it) => it.subjectId === sub.id && it.activityType === 'STUDY',
        );
        const priority = existingItem ? existingItem.priority : 10;

        weightedSubjects.push({
          subjectId: sub.id,
          name: sub.name,
          color: sub.color ?? '#4F46E5',
          userAreaId: ua.id,
          areaName,
          priority,
        });
      }
    }

    // Sort by priority descending
    weightedSubjects.sort((a, b) => b.priority - a.priority);

    // 4. Define candidate time slots for each day of the week
    const SLOT_DURATION = 50; // minutes
    const SESSION_STARTS: Record<number, string[]> = {
      1: ['07:00', '19:00', '20:10'], // Monday
      2: ['07:00', '19:00', '20:10'], // Tuesday
      3: ['07:00', '19:00', '20:10'], // Wednesday
      4: ['07:00', '19:00', '20:10'], // Thursday
      5: ['07:00', '19:00', '20:10'], // Friday
      6: ['09:00', '10:10'], // Saturday
      0: ['15:00', '16:10'], // Sunday
    };

    // Build pool of available slots filtered by routine conflicts
    type Slot = { dayOfWeek: number; startTime: string };
    const availableSlots: Slot[] = [];

    for (const [dayStr, times] of Object.entries(SESSION_STARTS)) {
      const day = Number(dayStr);
      for (const time of times) {
        const startMin = toMin(time);
        if (!isRoutineConflict(day, startMin, SLOT_DURATION)) {
          availableSlots.push({ dayOfWeek: day, startTime: time });
        }
      }
    }

    // 5. Weighted round-robin assignment
    const maxPriority = Math.max(...weightedSubjects.map((s) => s.priority));
    const tickets: WeightedSubject[] = [];
    for (const ws of weightedSubjects) {
      const count = Math.max(1, Math.round((ws.priority / maxPriority) * 5));
      for (let i = 0; i < count; i++) {
        tickets.push(ws);
      }
    }

    // Shuffle tickets for variety
    for (let i = tickets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tickets[i], tickets[j]] = [tickets[j], tickets[i]];
    }

    // Assign subjects to slots
    const generatedByArea: Record<string, any[]> = {};
    for (const ua of userAreas) {
      generatedByArea[ua.id] = [];
    }

    for (let i = 0; i < availableSlots.length; i++) {
      const slot = availableSlots[i];
      const subject = tickets[i % tickets.length];

      generatedByArea[subject.userAreaId].push({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        duration: SLOT_DURATION,
        priority: subject.priority,
        activityType: 'STUDY',
        subjectId: subject.subjectId,
        subject: {
          id: subject.subjectId,
          name: subject.name,
          color: subject.color,
        },
      });
    }

    // 6. Add SIMULADO / REDACAO slots for exam-prep areas
    for (const ua of userAreas) {
      const areaName = (ua.area?.name || '').toLowerCase();
      const isExamPrep = ['enem', 'oab', 'concurso', 'vestibular'].some((k) =>
        areaName.includes(k),
      );
      const hasRedacao = ua.subjects.some(
        (s) =>
          s.name.toLowerCase().includes('redaç') ||
          s.name.toLowerCase().includes('redac'),
      );

      const simStart = '11:00';
      const simDay = 6; // Saturday
      if (isExamPrep && !isRoutineConflict(simDay, toMin(simStart), 120)) {
        generatedByArea[ua.id].push({
          dayOfWeek: simDay,
          startTime: simStart,
          duration: 120,
          priority: 10,
          activityType: 'SIMULADO',
          subjectId: null,
          subject: null,
        });
      }

      const redStart = '16:30';
      const redDay = 0; // Sunday
      if (hasRedacao && !isRoutineConflict(redDay, toMin(redStart), 60)) {
        generatedByArea[ua.id].push({
          dayOfWeek: redDay,
          startTime: redStart,
          duration: 60,
          priority: 10,
          activityType: 'REDACO',
          subjectId: null,
          subject: null,
        });
      }
    }

    // 7. Return suggestions per area
    return {
      areas: userAreas.map((ua) => ({
        userAreaId: ua.id,
        areaName: ua.area?.name || 'Área Personalizada',
        items: (generatedByArea[ua.id] || []).map((item, idx) => ({
          id: `auto-${ua.id}-${idx}`,
          _areaId: ua.id,
          ...item,
        })),
      })),
    };
  }

  // 13. Get schedule items from ALL user areas
  async getUnifiedSchedule(userId: string) {
    const userAreas = await this.prisma.userArea.findMany({
      where: { userId },
      include: {
        area: true,
        schedules: {
          include: {
            items: {
              include: { subject: true, topic: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return userAreas.map((ua) => ({
      userAreaId: ua.id,
      areaName: ua.area?.name || 'Área Personalizada',
      isActive: ua.isActive,
      examDate: ua.schedules?.examDate ?? null,
      items: ua.schedules?.items ?? [],
    }));
  }

  // 14. Week-by-week syllabus for ALL user areas
  async getUnifiedProgression(userId: string) {
    const userAreas = await this.prisma.userArea.findMany({
      where: { userId },
      include: {
        area: true,
        schedules: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const dayOfWeekToday = now.getDay();
    const startOfWeek = new Date(now);
    const diffToMonday = dayOfWeekToday === 0 ? -6 : 1 - dayOfWeekToday;
    startOfWeek.setDate(now.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const msPerWeek = 7 * 24 * 60 * 60 * 1000;

    // Determine range: widest exam date across all areas
    let maxWeeks = 0;
    for (const ua of userAreas) {
      if (ua.schedules?.examDate) {
        const examTime = new Date(ua.schedules.examDate).getTime();
        const w = Math.min(
          100,
          Math.max(
            1,
            Math.ceil((examTime - startOfWeek.getTime()) / msPerWeek),
          ),
        );
        if (w > maxWeeks) maxWeeks = w;
      }
    }
    if (maxWeeks === 0) maxWeeks = 1;

    const weeks: any[] = [];
    for (let w = 0; w < maxWeeks; w++) {
      const weekStart = new Date(startOfWeek);
      weekStart.setDate(startOfWeek.getDate() + w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      weeks.push({
        weekNumber: w + 1,
        startDate: weekStart.toISOString().slice(0, 10),
        endDate: weekEnd.toISOString().slice(0, 10),
        items: [],
      });
    }

    for (const ua of userAreas) {
      if (!ua.schedules) continue;

      const numWeeks = ua.schedules.examDate
        ? Math.min(
            100,
            Math.max(
              1,
              Math.ceil(
                (new Date(ua.schedules.examDate).getTime() -
                  startOfWeek.getTime()) /
                  msPerWeek,
              ),
            ),
          )
        : maxWeeks;

      const scheduleItems = await this.prisma.scheduleItem.findMany({
        where: { scheduleId: ua.schedules.id },
        include: { subject: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });

      const subjects = await this.prisma.subject.findMany({
        where: { userAreaId: ua.id },
        include: { topics: { orderBy: { name: 'asc' } } },
      });

      // Map STUDY slots per subject
      for (const subject of subjects) {
        const slotsS = scheduleItems.filter(
          (item) =>
            item.subjectId === subject.id &&
            (item.activityType === 'STUDY' || !item.activityType),
        );
        if (slotsS.length === 0) continue;

        const topicsS = subject.topics;
        const totalSlots = slotsS.length * numWeeks;
        if (topicsS.length === 0) {
          for (let w = 0; w < numWeeks && w < maxWeeks; w++) {
            for (const slot of slotsS) {
              weeks[w].items.push({
                userAreaId: ua.id,
                areaName: ua.area?.name || 'Área Personalizada',
                dayOfWeek: slot.dayOfWeek,
                startTime: slot.startTime,
                duration: slot.duration,
                activityType: slot.activityType || 'STUDY',
                subject: {
                  id: subject.id,
                  name: subject.name,
                  color: subject.color,
                },
                topics: [],
              });
            }
          }
          continue;
        }

        for (let idx = 0; idx < totalSlots; idx++) {
          const weekIndex = Math.floor(idx / slotsS.length);
          if (weekIndex >= maxWeeks) break;
          const slot = slotsS[idx % slotsS.length];

          let assignedTopics: any[] = [];
          if (topicsS.length <= totalSlots) {
            assignedTopics = [topicsS[idx % topicsS.length]];
          } else {
            const chunkSize = Math.ceil(topicsS.length / totalSlots);
            assignedTopics = topicsS.slice(
              idx * chunkSize,
              Math.min(topicsS.length, (idx + 1) * chunkSize),
            );
          }

          weeks[weekIndex].items.push({
            userAreaId: ua.id,
            areaName: ua.area?.name || 'Área Personalizada',
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            duration: slot.duration,
            activityType: slot.activityType || 'STUDY',
            subject: {
              id: subject.id,
              name: subject.name,
              color: subject.color,
            },
            topics: assignedTopics,
          });
        }
      }

      // Map SIMULADO / REDACO slots
      const practiceSlots = scheduleItems.filter(
        (item) =>
          item.activityType === 'SIMULADO' || item.activityType === 'REDACO',
      );
      for (let w = 0; w < numWeeks && w < maxWeeks; w++) {
        for (const slot of practiceSlots) {
          weeks[w].items.push({
            userAreaId: ua.id,
            areaName: ua.area?.name || 'Área Personalizada',
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            duration: slot.duration,
            activityType: slot.activityType,
            subject: null,
            topics: [],
          });
        }
      }
    }

    // Sort items within each week chronologically
    for (const week of weeks) {
      week.items.sort((a: any, b: any) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
    }

    return { weeks };
  }

  // 15. Custom schedule overwrite by student
  async updateSchedule(
    userId: string,
    targetAreaIdOrNull: string | null | undefined,
    items: any[],
    examDate?: string | null,
  ) {
    let targetAreaId = targetAreaIdOrNull;
    if (!targetAreaId) {
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId },
      });
      if (!profile || !profile.activeUserAreaId) {
        throw new BadRequestException(
          'Nenhuma área de estudos ativa encontrada.',
        );
      }
      targetAreaId = profile.activeUserAreaId;
    }

    const schedule = await this.prisma.userStudySchedule.upsert({
      where: { userAreaId: targetAreaId },
      update: {
        examDate: examDate ? new Date(examDate) : null,
      },
      create: {
        userAreaId: targetAreaId,
        examDate: examDate ? new Date(examDate) : null,
      },
    });

    // Delete old items
    await this.prisma.scheduleItem.deleteMany({
      where: { scheduleId: schedule.id },
    });

    // Create custom items
    const itemsData = items.map((item) => ({
      scheduleId: schedule.id,
      dayOfWeek: item.dayOfWeek,
      subjectId: item.subjectId || null,
      topicId: item.topicId || null,
      duration: item.duration,
      priority: item.priority,
      startTime: item.startTime || null,
      activityType: item.activityType || 'STUDY',
    }));

    const created = await this.prisma.scheduleItem.createMany({
      data: itemsData,
    });

    // Sync to CalendarEvent - Delete old STUDY_SESSION
    await this.prisma.calendarEvent.deleteMany({
      where: {
        userId,
        userAreaId: targetAreaId,
        type: 'STUDY_SESSION',
      },
    });

    // Delete old system-generated or custom practice events from this area
    await this.prisma.calendarEvent.deleteMany({
      where: {
        userId,
        userAreaId: targetAreaId,
        type: 'EXAM',
        title: {
          in: [
            'Simulado Semanal',
            'Prática de Redação',
            'Prática: Simulado',
            'Prática: Redação',
          ],
        },
      },
    });

    const getNextOccurrence = (
      dayOfWeek: number,
      startTimeStr: string,
    ): Date => {
      const [hours, minutes] = startTimeStr.split(':').map(Number);
      const now = new Date();
      const result = new Date();
      result.setHours(hours, minutes, 0, 0);

      let diff = dayOfWeek - now.getDay();
      if (diff < 0 || (diff === 0 && now.getTime() >= result.getTime())) {
        diff += 7;
      }
      result.setDate(now.getDate() + diff);
      return result;
    };

    const computeScheduledAt = (startAt: Date, minutesBefore: number): Date => {
      return new Date(startAt.getTime() - minutesBefore * 60 * 1000);
    };

    // Sincronizar blocos práticos customizados para o calendário
    for (const item of items) {
      if (!item.startTime) continue;

      if (item.activityType === 'SIMULADO' || item.activityType === 'REDACO') {
        const isSim = item.activityType === 'SIMULADO';
        const title = isSim ? 'Prática: Simulado' : 'Prática: Redação';
        const color = isSim ? '#ef4444' : '#10b981';

        const startAt = getNextOccurrence(item.dayOfWeek, item.startTime);
        const endAt = new Date(startAt.getTime() + item.duration * 60 * 1000);

        await this.prisma.calendarEvent.create({
          data: {
            userId,
            userAreaId: targetAreaId,
            title,
            type: 'EXAM',
            startAt,
            endAt,
            color,
            recurrenceDays: [item.dayOfWeek],
            reminders: {
              create: [
                {
                  minutesBefore: 10,
                  method: 'EMAIL',
                  scheduledAt: computeScheduledAt(startAt, 10),
                  sent: false,
                },
                {
                  minutesBefore: 10,
                  method: 'WHATSAPP',
                  scheduledAt: computeScheduledAt(startAt, 10),
                  sent: false,
                },
              ],
            },
          },
        });
      }
    }

    const hasCustomSimulado = items.some(
      (it) => it.activityType === 'SIMULADO',
    );
    const hasCustomRedacao = items.some((it) => it.activityType === 'REDACO');

    const userArea = await this.prisma.userArea.findUnique({
      where: { id: targetAreaId },
      include: { area: true },
    });
    const areaName = userArea?.area?.name || '';

    const isExamPrep = ['enem', 'oab', 'concurso', 'vestibular'].some((k) =>
      areaName.toLowerCase().includes(k),
    );
    if (isExamPrep && !hasCustomSimulado) {
      // Create Saturday Simulado fallback
      const startAt = getNextOccurrence(6, '09:00');
      const endAt = new Date(startAt.getTime() + 120 * 60 * 1000);
      await this.prisma.calendarEvent.create({
        data: {
          userId,
          userAreaId: targetAreaId,
          title: 'Simulado Semanal',
          type: 'EXAM',
          startAt,
          endAt,
          color: '#ef4444',
          recurrenceDays: [6],
          reminders: {
            create: [
              {
                minutesBefore: 10,
                method: 'EMAIL',
                scheduledAt: computeScheduledAt(startAt, 10),
                sent: false,
              },
              {
                minutesBefore: 10,
                method: 'WHATSAPP',
                scheduledAt: computeScheduledAt(startAt, 10),
                sent: false,
              },
            ],
          },
        },
      });
    }

    const subjects = await this.prisma.subject.findMany({
      where: { userAreaId: targetAreaId },
    });
    const hasRedacao = subjects.some(
      (s) =>
        s.name.toLowerCase().includes('redaç') ||
        s.name.toLowerCase().includes('redac'),
    );
    if (hasRedacao && !hasCustomRedacao) {
      // Create Sunday Redação fallback
      const startAt = getNextOccurrence(0, '15:00');
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
      await this.prisma.calendarEvent.create({
        data: {
          userId,
          userAreaId: targetAreaId,
          title: 'Prática de Redação',
          type: 'EXAM',
          startAt,
          endAt,
          color: '#10b981',
          recurrenceDays: [0],
          reminders: {
            create: [
              {
                minutesBefore: 10,
                method: 'EMAIL',
                scheduledAt: computeScheduledAt(startAt, 10),
                sent: false,
              },
              {
                minutesBefore: 10,
                method: 'WHATSAPP',
                scheduledAt: computeScheduledAt(startAt, 10),
                sent: false,
              },
            ],
          },
        },
      });
    }

    return created;
  }
}
