import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

@Injectable()
export class ZodValidationPipe<
  TSchema extends z.ZodType<unknown, z.ZodTypeDef, unknown>,
> implements PipeTransform<unknown, z.output<TSchema>> {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'The request contains invalid values',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          code: issue.code,
          message: issue.message,
        })),
      });
    }
    return parsed.data;
  }
}
