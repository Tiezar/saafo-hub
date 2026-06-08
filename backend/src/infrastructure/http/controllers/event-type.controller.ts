import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';

const DEFAULT_TYPES = [
  {
    key: 'EXAM',
    name: 'Prova',
    color: '#ef4444',
    icon: 'GraduationCap',
    order: 0,
    isSystem: true,
  },
  {
    key: 'DEADLINE',
    name: 'Entrega',
    color: '#f97316',
    icon: 'Flag',
    order: 1,
    isSystem: true,
  },
  {
    key: 'FIXED_BLOCK',
    name: 'Bloco Fixo',
    color: '#3b82f6',
    icon: 'Layers',
    order: 2,
    isSystem: true,
  },
  {
    key: 'REMINDER',
    name: 'Lembrete',
    color: '#8b5cf6',
    icon: 'Bell',
    order: 3,
    isSystem: true,
  },
  {
    key: 'STUDY_SESSION',
    name: 'Sessão de Estudo',
    color: '#10b981',
    icon: 'BookOpen',
    order: 4,
    isSystem: true,
  },
];

class UpsertEventTypeDto {
  @IsString() @IsNotEmpty() @MaxLength(40) name: string;
  @IsString() @Matches(/^#[0-9a-fA-F]{6}$/) color: string;
  @IsString() @IsNotEmpty() @MaxLength(40) icon: string;
  @IsOptional() @IsString() key?: string;
}

@Controller('event-types')
@UseGuards(JwtAuthGuard)
export class EventTypeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Request() req: any) {
    let types = await this.prisma.userEventType.findMany({
      where: { userId: req.user.id },
      orderBy: { order: 'asc' },
    });

    // Lazy-seed defaults on first access
    if (types.length === 0) {
      await this.prisma.userEventType.createMany({
        data: DEFAULT_TYPES.map((t) => ({ ...t, userId: req.user.id })),
      });
      types = await this.prisma.userEventType.findMany({
        where: { userId: req.user.id },
        orderBy: { order: 'asc' },
      });
    }

    return types;
  }

  @Post()
  async create(@Request() req: any, @Body() body: UpsertEventTypeDto) {
    const count = await this.prisma.userEventType.count({
      where: { userId: req.user.id },
    });
    return this.prisma.userEventType.create({
      data: {
        userId: req.user.id,
        name: body.name,
        color: body.color,
        icon: body.icon,
        key: body.key ?? null,
        order: count,
        isSystem: false,
      },
    });
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Partial<UpsertEventTypeDto>,
  ) {
    const type = await this.prisma.userEventType.findUnique({ where: { id } });
    if (!type) throw new NotFoundException();
    if (type.userId !== req.user.id) throw new ForbiddenException();
    return this.prisma.userEventType.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.icon !== undefined && { icon: body.icon }),
      },
    });
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    const type = await this.prisma.userEventType.findUnique({ where: { id } });
    if (!type) throw new NotFoundException();
    if (type.userId !== req.user.id) throw new ForbiddenException();
    await this.prisma.userEventType.delete({ where: { id } });
    return { ok: true };
  }
}
