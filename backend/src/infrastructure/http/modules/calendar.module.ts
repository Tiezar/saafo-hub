import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { CalendarController } from '../controllers/calendar.controller';
import { StudySpaceController } from '../controllers/study-space.controller';
import { EventTypeController } from '../controllers/event-type.controller';
import { EvoApiService } from '../../notifications/evo-api.service';
import { ReminderSchedulerService } from '../../notifications/reminder-scheduler.service';
import { FlashcardReminderService } from '../../notifications/flashcard-reminder.service';
import { ResendService } from '../../email/resend.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CalendarController, StudySpaceController, EventTypeController],
  providers: [EvoApiService, ReminderSchedulerService, FlashcardReminderService, ResendService],
})
export class CalendarModule {}
