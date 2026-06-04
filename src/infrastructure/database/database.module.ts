import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaUserRepository } from './prisma-user.repository';

@Module({
  providers: [
    PrismaService,
    {
      provide: 'IUserRepository',
      useClass: PrismaUserRepository,
    },
  ],
  exports: [PrismaService, 'IUserRepository'],
})
export class DatabaseModule {}
