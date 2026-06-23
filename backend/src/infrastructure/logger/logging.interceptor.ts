import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PinoLoggerService } from './pino-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, ip } = request;

    const sanitizedBody = { ...body };
    for (const f of ['password', 'token', 'number', 'ccv', 'cpfCnpj', 'postalCode']) {
      if (sanitizedBody[f]) sanitizedBody[f] = '***';
    }
    if (sanitizedBody.card && typeof sanitizedBody.card === 'object') {
      sanitizedBody.card = { ...sanitizedBody.card };
      for (const f of ['number', 'ccv']) {
        if (sanitizedBody.card[f]) sanitizedBody.card[f] = '***';
      }
    }
    if (typeof sanitizedBody.text === 'string' && sanitizedBody.text.length > 200)
      sanitizedBody.text = sanitizedBody.text.slice(0, 200) + `…[${sanitizedBody.text.length}]`;

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;
          this.logger.log(
            `[${method}] ${url} - Status: ${response.statusCode} - IP: ${ip} - ${duration}ms - Body: ${JSON.stringify(sanitizedBody)}`,
          );
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          const status = err.status || 500;
          this.logger.error(
            `[${method}] ${url} - Status: ${status} - IP: ${ip} - ${duration}ms - Body: ${JSON.stringify(sanitizedBody)} - Error: ${err.message}`,
            err.stack,
          );
        },
      }),
    );
  }
}
