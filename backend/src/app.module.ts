import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './infrastructure/http/modules/auth.module';
import { ProfileModule } from './infrastructure/http/modules/profile.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { MaterialsMemoryModule } from './infrastructure/http/modules/materials-memory.module';
import { CalendarModule } from './infrastructure/http/modules/calendar.module';
import { BillingModule } from './infrastructure/http/modules/billing.module';
import { InsightsModule } from './infrastructure/http/modules/insights.module';
import { AdminModule } from './infrastructure/http/modules/admin.module';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { LoggingInterceptor } from './infrastructure/logger/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 150,
      },
    ]),
    DatabaseModule,
    AuthModule,
    ProfileModule,
    MaterialsMemoryModule,
    CalendarModule,
    BillingModule,
    InsightsModule,
    AdminModule,
    LoggerModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
