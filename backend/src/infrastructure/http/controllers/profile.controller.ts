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
  HttpCode,
  Post,
  Put,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UpdateProfileUseCase } from '../../../application/use-cases/update-profile.use-case';
import { DeleteUserUseCase } from '../../../application/use-cases/delete-user.use-case';
import { PrismaService } from '../../database/prisma.service';
import { GetWeeklyRoutinesUseCase } from '../../../application/use-cases/get-weekly-routines.use-case';
import { CreateWeeklyRoutineUseCase } from '../../../application/use-cases/create-weekly-routine.use-case';
import { UpdateWeeklyRoutineUseCase } from '../../../application/use-cases/update-weekly-routine.use-case';
import { DeleteWeeklyRoutineUseCase } from '../../../application/use-cases/delete-weekly-routine.use-case';
import type { IUserRepository } from '../../../domain/repositories/user-repository.interface';
import type { IWeeklyRoutineRepository } from '../../../domain/repositories/weekly-routine-repository.interface';
import type { IPaymentService } from '../../../domain/services/payment-service.interface';
import {
  IsString,
  IsOptional,
  MinLength,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator';
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
  private deleteUserUseCase: DeleteUserUseCase;
  private getWeeklyRoutinesUseCase: GetWeeklyRoutinesUseCase;
  private createWeeklyRoutineUseCase: CreateWeeklyRoutineUseCase;
  private updateWeeklyRoutineUseCase: UpdateWeeklyRoutineUseCase;
  private deleteWeeklyRoutineUseCase: DeleteWeeklyRoutineUseCase;

  constructor(
    @Inject('IUserRepository') private userRepository: IUserRepository,
    @Inject('IPaymentService') private paymentService: IPaymentService,
    @Inject('IWeeklyRoutineRepository')
    private weeklyRoutineRepository: IWeeklyRoutineRepository,
    private readonly prisma: PrismaService,
  ) {
    this.updateProfileUseCase = new UpdateProfileUseCase(userRepository);
    this.deleteUserUseCase = new DeleteUserUseCase(
      userRepository,
      paymentService,
    );
    this.getWeeklyRoutinesUseCase = new GetWeeklyRoutinesUseCase(
      weeklyRoutineRepository,
    );
    this.createWeeklyRoutineUseCase = new CreateWeeklyRoutineUseCase(
      weeklyRoutineRepository,
    );
    this.updateWeeklyRoutineUseCase = new UpdateWeeklyRoutineUseCase(
      weeklyRoutineRepository,
    );
    this.deleteWeeklyRoutineUseCase = new DeleteWeeklyRoutineUseCase(
      weeklyRoutineRepository,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getProfile(@Request() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: { profile: true },
    });
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
      role: user.role,
      onboardingStatus: user.profile?.onboardingStatus ?? 'PENDING',
      activeUserAreaId: user.profile?.activeUserAreaId ?? null,
      plan: user.plan,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  @HttpCode(200)
  async deleteAccount(@Request() req: any) {
    await this.deleteUserUseCase.execute(req.user.id);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  async updateProfile(@Request() req: any, @Body() body: UpdateProfileDto) {
    const user = await this.updateProfileUseCase.execute(req.user.id, body);
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
  @Get('routines')
  async getRoutines(@Request() req: any) {
    return this.getWeeklyRoutinesUseCase.execute(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('routines')
  async createRoutine(@Request() req: any, @Body() body: CreateRoutineDto) {
    return this.createWeeklyRoutineUseCase.execute({
      userId: req.user.id,
      label: body.label,
      color: body.color,
      days: body.days,
      slots: body.slots,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put('routines/:id')
  async updateRoutine(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: UpdateRoutineDto,
  ) {
    return this.updateWeeklyRoutineUseCase.execute(id, {
      userId: req.user.id,
      label: body.label,
      color: body.color,
      days: body.days,
      slots: body.slots,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete('routines/:id')
  async deleteRoutine(@Request() req: any, @Param('id') id: string) {
    await this.deleteWeeklyRoutineUseCase.execute(id, req.user.id);
    return { ok: true };
  }
}
