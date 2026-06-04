import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ProfileController } from '../controllers/profile.controller';
import { InstitutionController } from '../controllers/institution.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ProfileController, InstitutionController],
})
export class ProfileModule {}
