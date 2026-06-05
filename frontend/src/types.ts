export interface User {
  id: string; email: string; name: string;
  nickname: string | null; institutionId: string | null; phone: string | null;
}

export interface Institution { id: string; name: string; sigla: string; uf: string; domains: string[] }

export interface StudySpace { id: string; userId: string; name: string; color: string | null; icon: string | null }

export interface Subject { id: string; name: string; color: string | null; spaceId: string | null }

export interface Topic { id: string; name: string; subjectId: string }

export interface Card {
  id: string; front: string; back: string; topicId: string;
  interval: number; repetition: number; efactor: number; nextReview: string;
}

export interface EventReminderSummary {
  id: string; minutesBefore: number; method: string; scheduledAt: string; sent: boolean;
}

export interface CalendarEvent {
  id: string; userId: string; title: string; type: string;
  startAt: string; endAt: string | null; allDay: boolean;
  spaceId: string | null; subjectId: string | null;
  notes: string | null; color: string | null;
  recurrenceDays: number[]; recurrenceEndsAt: string | null;
  reminders: EventReminderSummary[];
}

export interface PlanStatus {
  plan: 'FREE_TRIAL' | 'STUDENT' | 'EXPIRED';
  isActive: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number;
}

export interface Insight {
  type: string; title: string; message: string; priority: 'high' | 'medium' | 'low';
}

export interface QuizQuestion {
  question: string; options: string[]; correctIndex: number; explanation: string;
}

export interface Metrics {
  totalReviewed: number; averageRating: number; retentionRate: number;
  dailyActivity: { date: string; count: number }[];
  subjectsPerformance: {
    subjectId: string; subjectName: string; totalCards: number;
    reviewedCards: number; averageRating: number; retentionRate: number;
  }[];
}

export interface ExamAttempt {
  id: string;
  examRecordId: string;
  score: number;
  completedAt: string;
}

export interface ExamRecord {
  id: string;
  userId: string;
  topicId: string | null;
  topicName: string;
  mode: 'multiple' | 'essay';
  questions: unknown;
  createdAt: string;
  attempts: ExamAttempt[];
}

export interface EventDraft {
  id: string | null; title: string; type: string;
  startAt: string; endAt: string; allDay: boolean;
  spaceId: string; subjectId: string; notes: string;
  recurrenceEnabled: boolean; recurrenceDays: number[]; recurrenceEndsAt: string;
  reminders: { minutesBefore: number; method: string }[];
}
