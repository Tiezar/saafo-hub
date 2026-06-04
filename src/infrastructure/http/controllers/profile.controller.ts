import { Controller, Patch, Body, UseGuards, Request, Inject, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UpdateProfileUseCase } from '../../../application/use-cases/update-profile.use-case';
import { IUserRepository } from '../../../domain/repositories/user-repository.interface';
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
}

@Controller('profile')
export class ProfileController {
  private updateProfileUseCase: UpdateProfileUseCase;

  constructor(@Inject('IUserRepository') private userRepository: IUserRepository) {
    this.updateProfileUseCase = new UpdateProfileUseCase(userRepository);
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
      };
    } catch (err) {
      throw new NotFoundException((err as Error).message);
    }
  }
}
