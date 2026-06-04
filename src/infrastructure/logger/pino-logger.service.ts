import { LoggerService, Injectable, Scope } from '@nestjs/common';
import pino from 'pino';

@Injectable({ scope: Scope.TRANSIENT })
export class PinoLoggerService implements LoggerService {
  private logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  });

  private context = 'App';

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    const ctx = context || this.context;
    this.logger.info({ context: ctx }, message);
  }

  error(message: any, trace?: string, context?: string) {
    const ctx = context || this.context;
    this.logger.error({ context: ctx, trace }, message);
  }

  warn(message: any, context?: string) {
    const ctx = context || this.context;
    this.logger.warn({ context: ctx }, message);
  }

  debug(message: any, context?: string) {
    const ctx = context || this.context;
    this.logger.debug({ context: ctx }, message);
  }

  verbose(message: any, context?: string) {
    const ctx = context || this.context;
    this.logger.trace({ context: ctx }, message);
  }
}
