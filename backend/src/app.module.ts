import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './infrastructure/http/modules/auth.module';
import { ProfileModule } from './infrastructure/http/modules/profile.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { MaterialsMemoryModule } from './infrastructure/http/modules/materials-memory.module';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { LoggingInterceptor } from './infrastructure/logger/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000 * 15, // 15 minutos
        limit: 100, // Máximo de 100 requisições
      },
    ]),
    DatabaseModule,
    AuthModule,
    ProfileModule,
    MaterialsMemoryModule,
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
