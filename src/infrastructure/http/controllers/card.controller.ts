import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Inject,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateCardUseCase } from '../../../application/use-cases/create-card.use-case';
import { ListCardsUseCase } from '../../../application/use-cases/list-cards.use-case';
import { DeleteCardUseCase } from '../../../application/use-cases/delete-card.use-case';
import type { ICardRepository } from '../../../domain/repositories/card-repository.interface';
import type { ITopicRepository } from '../../../domain/repositories/topic-repository.interface';
import type { ISubjectRepository } from '../../../domain/repositories/subject-repository.interface';
import { IsString, IsNotEmpty } from 'class-validator';

class CreateCardDto {
  @IsString()
  @IsNotEmpty()
  front: string;

  @IsString()
  @IsNotEmpty()
  back: string;

  @IsString()
  @IsNotEmpty()
  topicId: string;
}

@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardController {
  private createCardUseCase: CreateCardUseCase;
  private listCardsUseCase: ListCardsUseCase;
  private deleteCardUseCase: DeleteCardUseCase;

  constructor(
    @Inject('ICardRepository') private cardRepository: ICardRepository,
    @Inject('ITopicRepository') private topicRepository: ITopicRepository,
    @Inject('ISubjectRepository') private subjectRepository: ISubjectRepository,
  ) {
    this.createCardUseCase = new CreateCardUseCase(
      cardRepository,
      topicRepository,
      subjectRepository,
    );
    this.listCardsUseCase = new ListCardsUseCase(
      cardRepository,
      topicRepository,
      subjectRepository,
    );
    this.deleteCardUseCase = new DeleteCardUseCase(cardRepository);
  }

  @Post()
  async create(@Request() req: any, @Body() body: CreateCardDto) {
    try {
      return await this.createCardUseCase.execute({
        front: body.front,
        back: body.back,
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

  @Get()
  async list(@Request() req: any, @Query('topicId') topicId: string) {
    if (!topicId) {
      throw new BadRequestException('topicId query parameter is required');
    }
    try {
      return await this.listCardsUseCase.execute(topicId, req.user.id);
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

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    try {
      await this.deleteCardUseCase.execute(id, req.user.id);
      return { success: true };
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'Card not found') {
        throw new NotFoundException(msg);
      }
      if (msg === 'Unauthorized access to card') {
        throw new ForbiddenException(msg);
      }
      throw new BadRequestException(msg);
    }
  }
}
