import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteUnactivatedAccounts(): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      const result = await this.prisma.user.deleteMany({
        where: {
          emailVerified: false,
          createdAt: {
            lt: sevenDaysAgo,
          },
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Deletou ${result.count} conta(s) não ativada(s) criadas há mais de 7 dias.`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Erro ao limpar contas não ativadas: ${(err as Error).message}`,
      );
    }
  }
}
