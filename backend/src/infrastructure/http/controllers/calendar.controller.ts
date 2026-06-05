import {
  Controller,
  Get,
  Post,
  Put,
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
import type { ICalendarEventRepository } from '../../../domain/repositories/calendar-event-repository.interface';
import { ReminderMethod } from '../../../domain/entities/calendar-event';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  IsEnum,
  IsISO8601,
  ValidateNested,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

class ReminderDto {
  @IsNumber()
  minutesBefore: number;

  @IsEnum(ReminderMethod)
  method: ReminderMethod;
}

class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsISO8601()
  startAt: string;

  @IsISO8601()
  @IsOptional()
  endAt?: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;

  @IsString()
  @IsOptional()
  spaceId?: string;

  @IsString()
  @IsOptional()
  subjectId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsArray()
  @IsOptional()
  recurrenceDays?: number[];

  @IsISO8601()
  @IsOptional()
  recurrenceEndsAt?: string;

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ReminderDto)
  reminders?: ReminderDto[];
}

class UpdateEventDto extends CreateEventDto {}

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(
    @Inject('ICalendarEventRepository')
    private eventRepo: ICalendarEventRepository,
  ) {}

  @Get('events')
  async list(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('spaceId') spaceId?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 7));
    const toDate = to ? new Date(to) : new Date(new Date().setDate(new Date().getDate() + 60));
    return this.eventRepo.findByUserAndRange(req.user.id, fromDate, toDate, spaceId);
  }

  @Get('events/upcoming')
  async upcoming(@Request() req: any, @Query('limit') limit?: string) {
    const n = limit ? Math.min(parseInt(limit, 10), 20) : 5;
    return this.eventRepo.findUpcoming(req.user.id, n);
  }

  @Post('events')
  async create(@Request() req: any, @Body() body: CreateEventDto) {
    try {
      return await this.eventRepo.create({
        userId: req.user.id,
        title: body.title.trim(),
        type: body.type,
        startAt: new Date(body.startAt),
        endAt: body.endAt ? new Date(body.endAt) : null,
        allDay: body.allDay ?? false,
        spaceId: body.spaceId ?? null,
        subjectId: body.subjectId ?? null,
        notes: body.notes ?? null,
        color: body.color ?? null,
        recurrenceDays: body.recurrenceDays ?? [],
        recurrenceEndsAt: body.recurrenceEndsAt ? new Date(body.recurrenceEndsAt) : null,
        reminders: body.reminders ?? [],
      });
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  @Put('events/:id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: UpdateEventDto,
  ) {
    const event = await this.eventRepo.findById(id);
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.userId !== req.user.id) throw new ForbiddenException();

    try {
      return await this.eventRepo.update(id, {
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.startAt !== undefined && { startAt: new Date(body.startAt) }),
        ...(body.endAt !== undefined && { endAt: new Date(body.endAt) }),
        ...(body.allDay !== undefined && { allDay: body.allDay }),
        ...(body.spaceId !== undefined && { spaceId: body.spaceId }),
        ...(body.subjectId !== undefined && { subjectId: body.subjectId }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.recurrenceDays !== undefined && { recurrenceDays: body.recurrenceDays }),
        ...(body.recurrenceEndsAt !== undefined && { recurrenceEndsAt: new Date(body.recurrenceEndsAt) }),
        ...(body.reminders !== undefined && { reminders: body.reminders }),
      });
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  @Delete('events/:id')
  async delete(@Request() req: any, @Param('id') id: string) {
    const event = await this.eventRepo.findById(id);
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.userId !== req.user.id) throw new ForbiddenException();
    await this.eventRepo.delete(id);
    return { success: true };
  }
}
