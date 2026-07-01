import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AreasService } from '../../../application/services/areas.service';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

class SelectAreaDto {
  @IsString()
  @IsNotEmpty()
  areaId: string;
}

class CustomAreaDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  bancaId?: string;
}

class DiagnosticAnswerDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsInt()
  @Min(0)
  selectedIdx: number;
}

class SubmitDiagnosticDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagnosticAnswerDto)
  answers: DiagnosticAnswerDto[];
}

class ScheduleItemDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @IsOptional()
  subjectId?: string;

  @IsString()
  @IsOptional()
  topicId?: string;

  @IsInt()
  @Min(10)
  duration: number;

  @IsNumber()
  priority: number;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  activityType?: string;
}

class UpdateScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  items: ScheduleItemDto[];

  @IsString()
  @IsOptional()
  examDate?: string;

  @IsString()
  @IsOptional()
  userAreaId?: string;
}

@Controller('areas')
@UseGuards(JwtAuthGuard)
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  // 1. GET /areas/templates - List global templates
  @Get('templates')
  async listTemplates() {
    return this.areasService.listTemplates();
  }

  // 2. GET /areas/my-areas - List user's registered areas
  @Get('my-areas')
  async listMyAreas(@Request() req: any) {
    return this.areasService.listMyAreas(req.user.id);
  }

  // 3. GET /areas/active - Get current active study area context
  @Get('active')
  async getActiveArea(@Request() req: any) {
    return this.areasService.getActiveArea(req.user.id);
  }

  // 4. POST /areas/select - Select template area and clone subjects/topics
  @Post('select')
  async selectTemplateArea(@Request() req: any, @Body() body: SelectAreaDto) {
    return this.areasService.selectTemplateArea(req.user.id, body.areaId);
  }

  // 5. POST /areas/custom - Create a custom area via IA
  @Post('custom')
  async createCustomArea(@Request() req: any, @Body() body: CustomAreaDto) {
    return this.areasService.createCustomArea(
      req.user.id,
      body.name,
      body.bancaId,
    );
  }

  // 6. POST /areas/:id/switch - Switch active area context
  @Post(':id/switch')
  async switchActiveArea(@Request() req: any, @Param('id') id: string) {
    return this.areasService.switchActiveArea(req.user.id, id);
  }

  // 7. DELETE /areas/:id - Delete area and cascade
  @Delete(':id')
  async deleteArea(@Request() req: any, @Param('id') id: string) {
    return this.areasService.deleteArea(req.user.id, id);
  }

  // 8. POST /areas/diagnostics/start - Generate diagnostic questions
  @Post('diagnostics/start')
  async startDiagnostic(@Request() req: any) {
    return this.areasService.startDiagnostic(req.user.id);
  }

  // 9. POST /areas/diagnostics/submit - Grade and create adaptive calendar schedule
  @Post('diagnostics/submit')
  async submitDiagnostic(
    @Request() req: any,
    @Body() body: SubmitDiagnosticDto,
  ) {
    return this.areasService.submitDiagnostic(req.user.id, body.answers);
  }

  // 10. GET /areas/schedule - Get active area study routine
  @Get('schedule')
  async getSchedule(@Request() req: any) {
    return this.areasService.getSchedule(req.user.id);
  }

  // 11. GET /areas/schedule/progression - Calculate week-by-week topic syllabus until the exam date
  @Get('schedule/progression')
  async getScheduleProgression(@Request() req: any) {
    return this.areasService.getScheduleProgression(req.user.id);
  }

  // 12. POST /areas/schedule/generate - Auto-suggest schedule based on all areas
  @Post('schedule/generate')
  async autoGenerateSchedule(@Request() req: any) {
    return this.areasService.autoGenerateSchedule(req.user.id);
  }

  // 13. GET /areas/schedule/unified - Get schedule items from ALL user areas
  @Get('schedule/unified')
  async getUnifiedSchedule(@Request() req: any) {
    return this.areasService.getUnifiedSchedule(req.user.id);
  }

  // 14. GET /areas/schedule/progression/unified - Week-by-week syllabus for ALL user areas
  @Get('schedule/progression/unified')
  async getUnifiedProgression(@Request() req: any) {
    return this.areasService.getUnifiedProgression(req.user.id);
  }

  // 15. POST /areas/schedule/update - Custom schedule overwrite by student
  @Post('schedule/update')
  async updateSchedule(@Request() req: any, @Body() body: UpdateScheduleDto) {
    return this.areasService.updateSchedule(
      req.user.id,
      body.userAreaId,
      body.items,
      body.examDate,
    );
  }
}
