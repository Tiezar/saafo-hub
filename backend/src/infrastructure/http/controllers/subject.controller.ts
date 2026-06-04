import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Inject,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateSubjectUseCase } from '../../../application/use-cases/create-subject.use-case';
import { ListSubjectsUseCase } from '../../../application/use-cases/list-subjects.use-case';
import { DeleteSubjectUseCase } from '../../../application/use-cases/delete-subject.use-case';
import type { ISubjectRepository } from '../../../domain/repositories/subject-repository.interface';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  color?: string;
}

@Controller('subjects')
@UseGuards(JwtAuthGuard)
export class SubjectController {
  private createSubjectUseCase: CreateSubjectUseCase;
  private listSubjectsUseCase: ListSubjectsUseCase;
  private deleteSubjectUseCase: DeleteSubjectUseCase;

  constructor(
    @Inject('ISubjectRepository') private subjectRepository: ISubjectRepository,
  ) {
    this.createSubjectUseCase = new CreateSubjectUseCase(subjectRepository);
    this.listSubjectsUseCase = new ListSubjectsUseCase(subjectRepository);
    this.deleteSubjectUseCase = new DeleteSubjectUseCase(subjectRepository);
  }

  @Post()
  async create(@Request() req: any, @Body() body: CreateSubjectDto) {
    try {
      return await this.createSubjectUseCase.execute({
        name: body.name,
        color: body.color || null,
        userId: req.user.id,
      });
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  @Get()
  async list(@Request() req: any) {
    return this.listSubjectsUseCase.execute(req.user.id);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    try {
      await this.deleteSubjectUseCase.execute(id, req.user.id);
      return { success: true };
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
}
