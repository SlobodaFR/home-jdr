import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { QuotaExceededError } from '../../../domain/usage-quota/quota-exceeded.error';

/**
 * `QuotaExceededError` (domain/usage-quota/quota-exceeded.error.ts) is a
 * plain Error, not an HttpException - without this filter it would surface
 * as an opaque 500 (see `tasks/08-admin-quotas-cost-guardrails.md` -
 * "doit être catché proprement au niveau HTTP"). The frontend shows its own
 * curated, non-technical copy on 429 (see `SessionPage.tsx`) rather than
 * relying on this body's `message`.
 */
@Catch(QuotaExceededError)
export class QuotaExceededFilter implements ExceptionFilter {
  catch(exception: QuotaExceededError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(429).json({
      statusCode: 429,
      message: exception.message,
    });
  }
}
