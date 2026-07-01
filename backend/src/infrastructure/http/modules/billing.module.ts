import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AsaasService } from '../../payments/asaas.service';
import { BillingController } from '../controllers/billing.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [BillingController],
  providers: [
    AsaasService,
    { provide: 'IPaymentService', useClass: AsaasService },
  ],
  exports: [AsaasService, 'IPaymentService'],
})
export class BillingModule {}
