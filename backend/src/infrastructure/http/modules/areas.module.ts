import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AIModule } from '../../ai/ai.module';
import { AreasController } from '../controllers/areas.controller';
import { AreasService } from '../../../application/services/areas.service';

@Module({
  imports: [DatabaseModule, AIModule],
  controllers: [AreasController],
  providers: [AreasService],
  exports: [AreasService],
})
export class AreasModule {}
