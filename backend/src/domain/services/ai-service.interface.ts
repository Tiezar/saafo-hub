export interface GeneratedCard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  textBase?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Insight {
  type: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export interface EssayEvaluation {
  score: number;
  feedback: string;
  correct: string[];
  missing: string[];
}

export interface AIGenerateFlashcardsOptions {
  text?: string;
  fileBuffer?: Buffer;
  mimeType?: string;
  theme?: string;
  count?: number;
  existingCards?: { front: string }[];
  subjectName?: string;
  topicName?: string;
}

export interface IAIService {
  generateFlashcards(
    options: AIGenerateFlashcardsOptions,
  ): Promise<GeneratedCard[]>;
  generateInsights(data: any): Promise<Insight[]>;
  generateExam(
    cards: { front: string; back: string }[],
    profileId: 'quick' | 'applied' | 'contextual',
    count: number,
  ): Promise<QuizQuestion[]>;
  evaluateEssayAnswer(
    question: string,
    expectedAnswer: string,
    userAnswer: string,
  ): Promise<EssayEvaluation>;
  generateCustomAreaSubjects(objective: string): Promise<{
    name: string;
    subjects: { name: string; color: string; topics: string[] }[];
  }>;
  generateDiagnosticQuestions(
    areaName: string,
    subjects: { name: string; topics: string[] }[],
    banca?: string,
  ): Promise<
    {
      subjectName: string;
      topicName: string;
      statement: string;
      options: string[];
      correctOptionIdx: number;
      explanation: string;
    }[]
  >;
}
