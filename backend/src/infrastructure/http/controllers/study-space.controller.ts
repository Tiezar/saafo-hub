import {
  Controller,
  Get,
  Post,
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
import type { IStudySpaceRepository } from '../../../domain/repositories/study-space-repository.interface';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

class CreateStudySpaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4)
  icon?: string;
}

@Controller('spaces')
@UseGuards(JwtAuthGuard)
export class StudySpaceController {
  constructor(
    @Inject('IStudySpaceRepository')
    private spaceRepo: IStudySpaceRepository,
  ) {}

  @Get()
  async list(@Request() req: any) {
    return this.spaceRepo.findByUserId(req.user.id);
  }

  @Post()
  async create(@Request() req: any, @Body() body: CreateStudySpaceDto) {
    return this.spaceRepo.create({
      userId: req.user.id,
      name: body.name.trim(),
      color: body.color ?? null,
      icon: body.icon ?? null,
    });
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    const space = await this.spaceRepo.findById(id);
    if (!space) throw new NotFoundException('Área não encontrada');
    if (space.userId !== req.user.id) throw new ForbiddenException();
    try {
      await this.spaceRepo.delete(id);
      return { success: true };
    } catch {
      throw new BadRequestException('Não foi possível remover a área');
    }
  }
}
