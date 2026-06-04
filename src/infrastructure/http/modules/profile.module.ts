import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ProfileController } from '../controllers/profile.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ProfileController],
})
export class ProfileModule {}
