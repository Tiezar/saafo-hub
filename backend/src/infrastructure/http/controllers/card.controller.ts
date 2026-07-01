import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateCardUseCase } from '../../../application/use-cases/create-card.use-case';
import { ListCardsUseCase } from '../../../application/use-cases/list-cards.use-case';
import { DeleteCardUseCase } from '../../../application/use-cases/delete-card.use-case';
import { UpdateCardUseCase } from '../../../application/use-cases/update-card.use-case';
import { ListAllCardsUseCase } from '../../../application/use-cases/list-all-cards.use-case';
import type { ICardRepository } from '../../../domain/repositories/card-repository.interface';
import type { ITopicRepository } from '../../../domain/repositories/topic-repository.interface';
import type { ISubjectRepository } from '../../../domain/repositories/subject-repository.interface';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

class CreateCardDto {
  @IsString() @IsNotEmpty() @MaxLength(1000) front: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) back: string;
  @IsString() @IsNotEmpty() topicId: string;
}

class UpdateCardDto {
  @IsString() @IsOptional() @MaxLength(1000) front?: string;
  @IsString() @IsOptional() @MaxLength(2000) back?: string;
}

@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardController {
  private createCardUseCase: CreateCardUseCase;
  private listCardsUseCase: ListCardsUseCase;
  private deleteCardUseCase: DeleteCardUseCase;
  private updateCardUseCase: UpdateCardUseCase;
  private listAllCardsUseCase: ListAllCardsUseCase;

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
    this.updateCardUseCase = new UpdateCardUseCase(cardRepository);
    this.listAllCardsUseCase = new ListAllCardsUseCase(cardRepository);
  }

  @Post()
  async create(@Request() req: any, @Body() body: CreateCardDto) {
    return this.createCardUseCase.execute({
      front: body.front,
      back: body.back,
      topicId: body.topicId,
      userId: req.user.id,
    });
  }

  @Get()
  async list(@Request() req: any, @Query('topicId') topicId: string) {
    if (!topicId) {
      throw new BadRequestException('topicId query parameter is required');
    }
    return this.listCardsUseCase.execute(topicId, req.user.id);
  }

  @Get('all')
  async listAll(@Request() req: any) {
    return this.listAllCardsUseCase.execute(req.user.id);
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: UpdateCardDto,
  ) {
    if (!body.front && !body.back)
      throw new BadRequestException('Forneça front ou back para atualizar.');
    return this.updateCardUseCase.execute(id, {
      userId: req.user.id,
      front: body.front,
      back: body.back,
    });
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    await this.deleteCardUseCase.execute(id, req.user.id);
    return { success: true };
  }
}
