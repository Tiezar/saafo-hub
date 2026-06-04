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
import { CreateTopicUseCase } from '../../../application/use-cases/create-topic.use-case';
import { ListTopicsUseCase } from '../../../application/use-cases/list-topics.use-case';
import { DeleteTopicUseCase } from '../../../application/use-cases/delete-topic.use-case';
import type { ITopicRepository } from '../../../domain/repositories/topic-repository.interface';
import type { ISubjectRepository } from '../../../domain/repositories/subject-repository.interface';
import { IsString, IsNotEmpty } from 'class-validator';

class CreateTopicDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;
}

@Controller('topics')
@UseGuards(JwtAuthGuard)
export class TopicController {
  private createTopicUseCase: CreateTopicUseCase;
  private listTopicsUseCase: ListTopicsUseCase;
  private deleteTopicUseCase: DeleteTopicUseCase;

  constructor(
    @Inject('ITopicRepository') private topicRepository: ITopicRepository,
    @Inject('ISubjectRepository') private subjectRepository: ISubjectRepository,
  ) {
    this.createTopicUseCase = new CreateTopicUseCase(
      topicRepository,
      subjectRepository,
    );
    this.listTopicsUseCase = new ListTopicsUseCase(
      topicRepository,
      subjectRepository,
    );
    this.deleteTopicUseCase = new DeleteTopicUseCase(
      topicRepository,
      subjectRepository,
    );
  }

  @Post()
  async create(@Request() req: any, @Body() body: CreateTopicDto) {
    try {
      return await this.createTopicUseCase.execute({
        name: body.name,
        subjectId: body.subjectId,
        userId: req.user.id,
      });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'Subject not found') {
        throw new NotFoundException(msg);
      }
      if (msg === 'Unauthorized access to subject') {
        throw new ForbiddenException(msg);
      }
      throw new BadRequestException(msg);
    }
  }

  @Get()
  async list(@Request() req: any, @Query('subjectId') subjectId: string) {
    if (!subjectId) {
      throw new BadRequestException('subjectId query parameter is required');
    }
    try {
      return await this.listTopicsUseCase.execute(subjectId, req.user.id);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'Subject not found') {
        throw new NotFoundException(msg);
      }
      if (msg === 'Unauthorized access to subject') {
        throw new ForbiddenException(msg);
      }
      throw new BadRequestException(msg);
    }
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    try {
      await this.deleteTopicUseCase.execute(id, req.user.id);
      return { success: true };
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
