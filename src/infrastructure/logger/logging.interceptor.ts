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

    // Obfuscate sensitive body fields (like password or google oauth token)
    const sanitizedBody = { ...body };
    if (sanitizedBody.password) sanitizedBody.password = '***';
    if (sanitizedBody.token) sanitizedBody.token = '***';

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
