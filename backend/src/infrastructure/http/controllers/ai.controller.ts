import {
  Controller,
  Post,
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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PlanGuard } from '../guards/plan.guard';
import { Throttle } from '@nestjs/throttler';
import { GenerateFlashcardsUseCase } from '../../../application/use-cases/generate-flashcards.use-case';
import { GeminiService } from '../../ai/gemini.service';
import type { ICardRepository } from '../../../domain/repositories/card-repository.interface';
import type { ITopicRepository } from '../../../domain/repositories/topic-repository.interface';
import type { ISubjectRepository } from '../../../domain/repositories/subject-repository.interface';
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsIn, IsInt, Min, Max } from 'class-validator';

const SUPPORTED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'image/heic', 'image/heif',
  'application/pdf',
  'text/plain',
]);

const FILE_SIZE_LIMIT = 50 * 1024 * 1024; // 50 MB

class GenerateQuizDto {
  @IsString() @IsNotEmpty() topicId: string;
  @IsIn(['easy', 'medium', 'hard']) difficulty: 'easy' | 'medium' | 'hard';
  @IsInt() @IsOptional() @Min(3) @Max(20) count?: number;
}

class GenerateFromTextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  text: string;

  @IsString()
  @IsNotEmpty()
  topicId: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  theme?: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard, PlanGuard)
export class AiController {
  private useCase: GenerateFlashcardsUseCase;

  constructor(
    @Inject('ICardRepository') private cardRepository: ICardRepository,
    @Inject('ITopicRepository') private topicRepository: ITopicRepository,
    @Inject('ISubjectRepository') private subjectRepository: ISubjectRepository,
    private geminiService: GeminiService,
  ) {
    this.useCase = new GenerateFlashcardsUseCase(
      cardRepository, topicRepository, subjectRepository, geminiService,
    );
  }

  private handleError(err: unknown): never {
    const msg = (err as Error).message;
    if (msg === 'Topic not found')           throw new NotFoundException(msg);
    if (msg === 'Unauthorized access to topic') throw new ForbiddenException(msg);
    throw new BadRequestException(msg);
  }

  @Post('quiz')
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  async generateQuiz(@Request() req: any, @Body() body: GenerateQuizDto) {
    const topic = await this.topicRepository.findById(body.topicId);
    if (!topic) throw new NotFoundException('Topic not found');

    const subject = await this.subjectRepository.findById(topic.subjectId);
    if (!subject || subject.userId !== req.user.id) throw new ForbiddenException('Unauthorized access to topic');

    const cards = await this.cardRepository.findByTopicId(body.topicId);
    if (cards.length < 3) {
      throw new BadRequestException('Adicione pelo menos 3 flashcards ao tópico antes de gerar um quiz.');
    }

    try {
      return await this.geminiService.generateQuiz(
        cards.map(c => ({ front: c.front, back: c.back })),
        body.difficulty,
        body.count ?? Math.min(10, Math.max(3, cards.length)),
      );
    } catch (err) { this.handleError(err); }
  }

  @Post('generate')
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  async generateFromText(@Request() req: any, @Body() body: GenerateFromTextDto) {
    try {
      return await this.useCase.execute({
        text: body.text,
        topicId: body.topicId,
        userId: req.user.id,
        theme: body.theme,
      });
    } catch (err) { this.handleError(err); }
  }

  @Post('generate-file')
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: FILE_SIZE_LIMIT } }))
  async generateFromFile(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { topicId: string; theme?: string },
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    if (!body.topicId) throw new BadRequestException('topicId é obrigatório.');

    const mimeType = file.mimetype;

    if (!SUPPORTED_TYPES.has(mimeType)) {
      throw new BadRequestException(
        `Tipo de arquivo não suportado: ${mimeType}. Use PDF, imagem (JPG/PNG/WEBP) ou texto (.txt).`,
      );
    }

    if (file.size > FILE_SIZE_LIMIT) {
      throw new PayloadTooLargeException('Arquivo muito grande. Limite: 50 MB.');
    }

    let fileBuffer: Buffer | undefined;
    let text: string | undefined;

    if (mimeType === 'text/plain') {
      // Plain text files: treat as text directly
      text = file.buffer.toString('utf-8');
    } else {
      fileBuffer = file.buffer;
    }

    try {
      return await this.useCase.execute({
        text,
        fileBuffer,
        mimeType: fileBuffer ? mimeType : undefined,
        topicId: body.topicId,
        userId: req.user.id,
        theme: body.theme,
      });
    } catch (err) { this.handleError(err); }
  }
}
