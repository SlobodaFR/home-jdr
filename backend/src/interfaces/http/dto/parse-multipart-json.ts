import { ClassConstructor, plainToInstance } from 'class-transformer';

/**
 * multipart/form-data has no notion of nested JSON - the admin catalog form
 * sends `characterSheetSchema`/`mechanicalActions` as a JSON-encoded string
 * field alongside the PDF file.
 *
 * Returns a class-transformer `@Transform` factory that both parses the
 * JSON string AND instantiates it as `cls` (or `cls[]`, mirroring the
 * runtime shape of the raw value). This has to happen in one step: a plain
 * `@Transform` that only calls `JSON.parse` leaves a plain object in place,
 * which `@Type(() => cls)` does NOT retroactively re-instantiate - the
 * following `@ValidateNested()` would then fail with "an unknown value was
 * passed to the validate function" because class-validator can't find
 * decorator metadata on a plain object.
 */
export function parseMultipartJson<T extends object>(cls: ClassConstructor<T>) {
  return ({ value }: { value: unknown }): unknown => {
    const parsed = typeof value === 'string' ? tryParseJson(value) : value;
    if (parsed === undefined) {
      // Left as-is: the following @IsArray/@ValidateNested decorators will
      // reject the malformed value with a readable 400.
      return value;
    }
    return plainToInstance(cls, parsed);
  };
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}
