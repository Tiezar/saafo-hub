import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  Inject,
  NotFoundException,
  BadRequestException,
  HttpCode,
  Post,
  Put,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UpdateProfileUseCase } from '../../../application/use-cases/update-profile.use-case';
import type { IUserRepository } from '../../../domain/repositories/user-repository.interface';
import { PrismaService } from '../../database/prisma.service';
import { IsString, IsOptional, MinLength, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  nickname?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsString()
  @IsOptional()
  institutionId?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

class RoutineSlotDto {
  @IsString()
  startTime: string;

  @IsString()
  endTime: string;
}

class CreateRoutineDto {
  @IsString()
  label: string;

  @IsString()
  color: string;

  @IsArray()
  @IsNumber({}, { each: true })
  days: number[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineSlotDto)
  slots: RoutineSlotDto[];
}

class UpdateRoutineDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsArray()
  @IsOptional()
  @IsNumber({}, { each: true })
  days?: number[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RoutineSlotDto)
  slots?: RoutineSlotDto[];
}

@Controller('profile')
export class ProfileController {
  private updateProfileUseCase: UpdateProfileUseCase;

  constructor(
    @Inject('IUserRepository') private userRepository: IUserRepository,
    private prisma: PrismaService,
  ) {
    this.updateProfileUseCase = new UpdateProfileUseCase(userRepository);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getProfile(@Request() req: any) {
    const user = await this.userRepository.findById(req.user.id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      nickname: user.nickname,
      institutionId: user.institutionId,
      phone: user.phone,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  @HttpCode(200)
  async deleteAccount(@Request() req: any) {
    await this.prisma.user.delete({ where: { id: req.user.id } });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  async updateProfile(@Request() req: any, @Body() body: UpdateProfileDto) {
    try {
      const user = await this.updateProfileUseCase.execute(req.user.id, body);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        institutionId: user.institutionId,
        phone: user.phone,
      };
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'User not found' || msg === 'Institution not found') {
        throw new NotFoundException(msg);
      }
      throw new BadRequestException(msg);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('routines')
  async getRoutines(@Request() req: any) {
    return this.prisma.userWeeklyRoutine.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('routines')
  async createRoutine(@Request() req: any, @Body() body: CreateRoutineDto) {
    return this.prisma.userWeeklyRoutine.create({
      data: {
        userId: req.user.id,
        label: body.label,
        color: body.color,
        days: body.days,
        slots: body.slots as any,
      },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put('routines/:id')
  async updateRoutine(@Request() req: any, @Param('id') id: string, @Body() body: UpdateRoutineDto) {
    const routine = await this.prisma.userWeeklyRoutine.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!routine) throw new NotFoundException('Rotina não encontrada');

    return this.prisma.userWeeklyRoutine.update({
      where: { id },
      data: {
        label: body.label,
        color: body.color,
        days: body.days,
        slots: body.slots !== undefined ? (body.slots as any) : undefined,
      },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete('routines/:id')
  async deleteRoutine(@Request() req: any, @Param('id') id: string) {
    const routine = await this.prisma.userWeeklyRoutine.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!routine) throw new NotFoundException('Rotina não encontrada');

    await this.prisma.userWeeklyRoutine.delete({ where: { id } });
    return { ok: true };
  }
}
