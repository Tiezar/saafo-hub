import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Inject,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PlanGuard } from '../guards/plan.guard';
import { Throttle } from '@nestjs/throttler';
import { GenerateFlashcardsUseCase } from '../../../application/use-cases/generate-flashcards.use-case';
import type { IAIService } from '../../../domain/services/ai-service.interface';
import type { ICardRepository } from '../../../domain/repositories/card-repository.interface';
import type { ITopicRepository } from '../../../domain/repositories/topic-repository.interface';
import type { ISubjectRepository } from '../../../domain/repositories/subject-repository.interface';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsIn,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

const SUPPORTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
  'text/plain',
]);

const FILE_SIZE_LIMIT = 50 * 1024 * 1024; // 50 MB
const MAX_CARDS_PER_DAY = parseInt(process.env.MAX_CARDS_PER_DAY ?? '100', 10);

class GenerateQuizDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  topicIds: string[];
  @IsIn(['quick', 'applied', 'contextual']) profileId:
    | 'quick'
    | 'applied'
    | 'contextual';
  @IsInt() @IsOptional() @Min(3) @Max(40) count?: number;
}

class GenerateFromTextDto {
  @IsString() @IsNotEmpty() @MaxLength(100_000) text: string;
  @IsString() @IsNotEmpty() topicId: string;
  @IsString() @IsOptional() @MaxLength(200) theme?: string;
  @IsInt() @IsOptional() @Min(3) @Max(30) count?: number;
}

class CardItemDto {
  @IsString() @IsNotEmpty() @MaxLength(2000) front: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) back: string;
}

class SaveCardsDto {
  @IsString() @IsNotEmpty() topicId: string;
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @Type(() => CardItemDto)
  cards: CardItemDto[];
}

class EvaluateEssayDto {
  @IsString() @IsNotEmpty() @MaxLength(1000) question: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) expectedAnswer: string;
  @IsString() @MaxLength(5000) userAnswer: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard, PlanGuard)
export class AiController {
  private useCase: GenerateFlashcardsUseCase;

  constructor(
    @Inject('ICardRepository') private cardRepository: ICardRepository,
    @Inject('ITopicRepository') private topicRepository: ITopicRepository,
    @Inject('ISubjectRepository') private subjectRepository: ISubjectRepository,
    @Inject('IAIService') private aiService: IAIService,
    private prisma: PrismaService,
  ) {
    this.useCase = new GenerateFlashcardsUseCase(
      topicRepository,
      subjectRepository,
      aiService,
      cardRepository,
    );
  }

  @Get('usage')
  async getUsage(@Request() req: any) {
    const todayCount = await this.cardRepository.countGeneratedToday(
      req.user.id,
    );
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const examsThisWeek = await this.prisma.examRecord.count({
      where: {
        userId: req.user.id,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    return {
      cardsGeneratedToday: todayCount,
      maxCardsPerDay: MAX_CARDS_PER_DAY,
      cardsRemaining: Math.max(0, MAX_CARDS_PER_DAY - todayCount),
      examsThisWeek,
      maxExamsPerWeek: 20,
      examsRemaining: Math.max(0, 20 - examsThisWeek),
    };
  }

  @Post('quiz')
  @Throttle({ default: { limit: 20, ttl: 604_800_000 } }) // 20 exams per week
  async generateQuiz(@Request() req: any, @Body() body: GenerateQuizDto) {
    const topics = await Promise.all(
      body.topicIds.map((id) => this.topicRepository.findById(id)),
    );
    for (const [i, topic] of topics.entries()) {
      if (!topic)
        throw new NotFoundException(
          `Tópico ${body.topicIds[i]} não encontrado.`,
        );
    }

    const subjects = await Promise.all(
      topics.map((t) => this.subjectRepository.findById(t!.subjectId)),
    );
    for (const subject of subjects) {
      if (!subject || subject.userId !== req.user.id)
        throw new ForbiddenException('Acesso não autorizado ao tópico.');
    }

    const cardArrays = await Promise.all(
      body.topicIds.map((id) => this.cardRepository.findByTopicId(id)),
    );
    const allCards = cardArrays
      .flat()
      .map((c) => ({ front: c.front, back: c.back }));

    if (allCards.length < 3) {
      throw new BadRequestException(
        'Adicione pelo menos 3 flashcards nos tópicos selecionados antes de gerar uma prova.',
      );
    }

    // Shuffle and cap at 200 cards to keep context manageable
    const shuffled = allCards.sort(() => Math.random() - 0.5).slice(0, 200);
    const count =
      body.count ?? Math.min(10, Math.max(3, Math.floor(allCards.length / 2)));

    return this.aiService.generateExam(shuffled, body.profileId, count);
  }

  // Returns generated cards WITHOUT saving — frontend shows preview
  @Post('generate')
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  async generateFromText(
    @Request() req: any,
    @Body() body: GenerateFromTextDto,
  ) {
    const todayCount = await this.cardRepository.countGeneratedToday(
      req.user.id,
    );
    if (todayCount >= MAX_CARDS_PER_DAY) {
      throw new HttpException(
        `Limite diário de ${MAX_CARDS_PER_DAY} cards gerados atingido. Tente novamente amanhã.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.useCase.execute({
      text: body.text,
      topicId: body.topicId,
      userId: req.user.id,
      theme: body.theme,
      count: body.count,
    });
  }

  // Returns generated cards WITHOUT saving — frontend shows preview
  @Post('generate-file')
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: FILE_SIZE_LIMIT } }),
  )
  async generateFromFile(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { topicId: string; theme?: string; count?: string },
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    if (!body.topicId) throw new BadRequestException('topicId é obrigatório.');
    const todayCount = await this.cardRepository.countGeneratedToday(
      req.user.id,
    );
    if (todayCount >= MAX_CARDS_PER_DAY) {
      throw new HttpException(
        `Limite diário de ${MAX_CARDS_PER_DAY} cards gerados atingido. Tente novamente amanhã.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const mimeType = file.mimetype;

    if (!SUPPORTED_TYPES.has(mimeType)) {
      throw new BadRequestException(
        `Tipo de arquivo não suportado: ${mimeType}. Use PDF, imagem (JPG/PNG/WEBP) ou texto (.txt).`,
      );
    }

    if (file.size > FILE_SIZE_LIMIT) {
      throw new PayloadTooLargeException(
        'Arquivo muito grande. Limite: 50 MB.',
      );
    }

    let fileBuffer: Buffer | undefined;
    let text: string | undefined;

    if (mimeType === 'text/plain') {
      text = file.buffer.toString('utf-8');
    } else {
      fileBuffer = file.buffer;
    }

    const count = body.count ? parseInt(body.count, 10) : undefined;

    return this.useCase.execute({
      text,
      fileBuffer,
      mimeType: fileBuffer ? mimeType : undefined,
      topicId: body.topicId,
      userId: req.user.id,
      theme: body.theme,
      count: count && !isNaN(count) ? count : undefined,
    });
  }

  // Saves user-confirmed card selection after preview
  @Post('save')
  async saveCards(@Request() req: any, @Body() body: SaveCardsDto) {
    const topic = await this.topicRepository.findById(body.topicId);
    if (!topic) throw new NotFoundException('Topic not found');

    const subject = await this.subjectRepository.findById(topic.subjectId);
    if (!subject || subject.userId !== req.user.id)
      throw new ForbiddenException('Unauthorized access to topic');

    const todayCount = await this.cardRepository.countGeneratedToday(
      req.user.id,
    );
    const remaining = MAX_CARDS_PER_DAY - todayCount;
    if (remaining <= 0) {
      throw new HttpException(
        `Limite diário de ${MAX_CARDS_PER_DAY} cards atingido. Tente novamente amanhã.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const cardsToSave = body.cards.slice(0, remaining);

    const created = await Promise.all(
      cardsToSave.map((card) =>
        this.cardRepository.create({
          front: card.front,
          back: card.back,
          topicId: body.topicId,
          userId: req.user.id,
          repetitions: 0,
          interval: 0,
          easeFactor: 2.5,
          nextReview: new Date(),
        }),
      ),
    );
    return created;
  }

  @Post('evaluate-essay')
  @Throttle({ default: { limit: 100, ttl: 86_400_000 } }) // 100/day
  async evaluateEssay(@Body() body: EvaluateEssayDto) {
    return this.aiService.evaluateEssayAnswer(
      body.question,
      body.expectedAnswer,
      body.userAnswer,
    );
  }
}
