import { Module, Global } from '@nestjs/common';
import { GeminiService } from './gemini.service';

@Global()
@Module({
  providers: [
    {
      provide: 'IAIService',
      useClass: GeminiService,
    },
  ],
  exports: ['IAIService'],
})
export class AIModule {}
