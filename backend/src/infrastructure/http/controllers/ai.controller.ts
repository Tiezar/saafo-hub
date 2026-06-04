import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Inject,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { GenerateFlashcardsUseCase } from '../../../application/use-cases/generate-flashcards.use-case';
import { GeminiService } from '../../ai/gemini.service';
import type { ICardRepository } from '../../../domain/repositories/card-repository.interface';
import type { ITopicRepository } from '../../../domain/repositories/topic-repository.interface';
import type { ISubjectRepository } from '../../../domain/repositories/subject-repository.interface';
import { IsString, IsNotEmpty } from 'class-validator';

class GenerateFlashcardsDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsNotEmpty()
  topicId: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  private generateFlashcardsUseCase: GenerateFlashcardsUseCase;

  constructor(
    @Inject('ICardRepository') private cardRepository: ICardRepository,
    @Inject('ITopicRepository') private topicRepository: ITopicRepository,
    @Inject('ISubjectRepository') private subjectRepository: ISubjectRepository,
    private geminiService: GeminiService,
  ) {
    this.generateFlashcardsUseCase = new GenerateFlashcardsUseCase(
      cardRepository,
      topicRepository,
      subjectRepository,
      geminiService,
    );
  }

  @Post('generate')
  // Limit to 5 calls per 15 minutes to control token costs
  @Throttle({ default: { limit: 5, ttl: 60000 * 15 } })
  async generate(@Request() req: any, @Body() body: GenerateFlashcardsDto) {
    try {
      return await this.generateFlashcardsUseCase.execute({
        text: body.text,
        topicId: body.topicId,
        userId: req.user.id,
      });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'Topic not found') {
        throw new NotFoundException(msg);
      }
      if (msg === 'Unauthorized access to topic') {
        throw new ForbiddenException(msg);
      }
      throw new BadRequestException(msg);
    }
  }
}
