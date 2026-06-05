import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { CalendarController } from '../controllers/calendar.controller';
import { StudySpaceController } from '../controllers/study-space.controller';
import { EvoApiService } from '../../notifications/evo-api.service';
import { ReminderSchedulerService } from '../../notifications/reminder-scheduler.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CalendarController, StudySpaceController],
  providers: [EvoApiService, ReminderSchedulerService],
})
export class CalendarModule {}
