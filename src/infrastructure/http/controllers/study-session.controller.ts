import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Inject,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { StartStudySessionUseCase } from '../../../application/use-cases/start-study-session.use-case';
import { ReviewCardUseCase } from '../../../application/use-cases/review-card.use-case';
import type { IStudySessionRepository } from '../../../domain/repositories/study-session-repository.interface';
import type { ICardRepository } from '../../../domain/repositories/card-repository.interface';
import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

class ReviewCardDto {
  @IsString()
  @IsNotEmpty()
  cardId: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsInt()
  @Min(0)
  @Max(5)
  rating: number;
}

@Controller('study-sessions')
@UseGuards(JwtAuthGuard)
export class StudySessionController {
  private startStudySessionUseCase: StartStudySessionUseCase;
  private reviewCardUseCase: ReviewCardUseCase;

  constructor(
    @Inject('IStudySessionRepository')
    private studySessionRepository: IStudySessionRepository,
    @Inject('ICardRepository') private cardRepository: ICardRepository,
  ) {
    this.startStudySessionUseCase = new StartStudySessionUseCase(
      studySessionRepository,
    );
    this.reviewCardUseCase = new ReviewCardUseCase(
      cardRepository,
      studySessionRepository,
    );
  }

  @Post()
  async start(@Request() req: any) {
    return this.startStudySessionUseCase.execute(req.user.id);
  }

  @Get('due')
  async getDueCards(@Request() req: any) {
    return this.cardRepository.findDueCards(req.user.id, new Date());
  }

  @Get()
  async list(@Request() req: any) {
    return this.studySessionRepository.findByUserId(req.user.id);
  }

  @Post('review')
  async review(@Request() req: any, @Body() body: ReviewCardDto) {
    try {
      return await this.reviewCardUseCase.execute({
        cardId: body.cardId,
        sessionId: body.sessionId,
        rating: body.rating,
        userId: req.user.id,
      });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'Card not found' || msg === 'Study session not found') {
        throw new NotFoundException(msg);
      }
      if (
        msg === 'Unauthorized access to card' ||
        msg === 'Unauthorized access to study session'
      ) {
        throw new ForbiddenException(msg);
      }
      throw new BadRequestException(msg);
    }
  }
}
