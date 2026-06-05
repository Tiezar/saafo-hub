import {
  Controller, Get, Post, Delete,
  Body, Param, Request,
  UseGuards, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';
import {
  IsString, IsNotEmpty, IsInt, Min, Max, IsIn,
  IsOptional, IsArray,
} from 'class-validator';

class CreateExamRecordDto {
  @IsString() @IsNotEmpty() topicName: string;
  @IsString() @IsOptional() scopeLabel?: string;
  @IsIn(['multiple', 'essay']) mode: 'multiple' | 'essay';
  questions: any;
  @IsString() @IsOptional() topicId?: string;
  @IsArray() @IsOptional() @IsString({ each: true }) topicIds?: string[];
  @IsString() @IsOptional() profileId?: string;
}

class SaveAttemptDto {
  @IsInt() @Min(0) @Max(100) score: number;
  @IsInt() @IsOptional() @Min(0) timeLimit?: number;
  @IsInt() @IsOptional() @Min(0) timeTaken?: number;
}

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamHistoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async createRecord(@Request() req: any, @Body() body: CreateExamRecordDto) {
    return this.prisma.examRecord.create({
      data: {
        userId:     req.user.id,
        topicId:    body.topicId ?? null,
        topicIds:   body.topicIds ?? [],
        topicName:  body.topicName,
        scopeLabel: body.scopeLabel ?? null,
        profileId:  body.profileId ?? null,
        mode:       body.mode,
        questions:  body.questions,
      },
    });
  }

  @Get()
  async listRecords(@Request() req: any) {
    return this.prisma.examRecord.findMany({
      where: { userId: req.user.id },
      include: { attempts: { orderBy: { completedAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  async getRecord(@Request() req: any, @Param('id') id: string) {
    const record = await this.prisma.examRecord.findUnique({
      where: { id },
      include: { attempts: { orderBy: { completedAt: 'asc' } } },
    });
    if (!record) throw new NotFoundException('Prova não encontrada.');
    if (record.userId !== req.user.id) throw new ForbiddenException();
    return record;
  }

  @Post(':id/attempts')
  async saveAttempt(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: SaveAttemptDto,
  ) {
    const record = await this.prisma.examRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Prova não encontrada.');
    if (record.userId !== req.user.id) throw new ForbiddenException();

    return this.prisma.examAttempt.create({
      data: {
        examRecordId: id,
        score:        body.score,
        timeLimit:    body.timeLimit ?? null,
        timeTaken:    body.timeTaken ?? null,
      },
    });
  }

  @Delete(':id')
  async deleteRecord(@Request() req: any, @Param('id') id: string) {
    const record = await this.prisma.examRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Prova não encontrada.');
    if (record.userId !== req.user.id) throw new ForbiddenException();

    await this.prisma.examRecord.delete({ where: { id } });
    return { ok: true };
  }
}
