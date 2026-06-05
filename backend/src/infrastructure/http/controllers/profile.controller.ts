import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UpdateProfileUseCase } from '../../../application/use-cases/update-profile.use-case';
import type { IUserRepository } from '../../../domain/repositories/user-repository.interface';
import { IsString, IsOptional, MinLength } from 'class-validator';

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

@Controller('profile')
export class ProfileController {
  private updateProfileUseCase: UpdateProfileUseCase;

  constructor(
    @Inject('IUserRepository') private userRepository: IUserRepository,
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
}

