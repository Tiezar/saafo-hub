import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AppException } from '../../../domain/exceptions/app.exception';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // 1. Let NestJS built-in HttpExceptions pass through (e.g. ValidationPipe, Guards, etc.)
    if (exception instanceof HttpException) {
      return response
        .status(exception.getStatus())
        .json(exception.getResponse());
    }

    // 2. Handle our custom AppExceptions
    const excName = exception?.constructor?.name;
    const isCustomException =
      exception instanceof AppException ||
      excName === 'AppException' ||
      excName === 'ResourceNotFoundException' ||
      excName === 'UnauthorizedAccessException' ||
      excName === 'BusinessRuleException';

    if (isCustomException) {
      let status = HttpStatus.BAD_REQUEST;

      if (excName === 'ResourceNotFoundException') {
        status = HttpStatus.NOT_FOUND;
      } else if (excName === 'UnauthorizedAccessException') {
        status = HttpStatus.FORBIDDEN;
      } else if (excName === 'BusinessRuleException') {
        status = HttpStatus.BAD_REQUEST;
      }

      const errMsg = (exception as any).message || 'Erro de regra de negócio.';

      return response.status(status).json({
        statusCode: status,
        message: errMsg,
        error: excName,
      });
    }

    // 3. Handle unknown/unexpected exceptions (e.g. Prisma connection errors, database issues)
    // Log the actual error internally (Tratamento de Erros Oculto)
    this.logger.error(
      `Unhandled Exception: ${
        exception instanceof Error ? exception.stack : String(exception)
      }`,
    );

    // Return a clean 500 error to the client, concealing details
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor.',
    });
  }
}
