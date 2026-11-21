const IDENTIFIER = /^[A-Za-z0-9_.-]{1,64}$/;

/**
 * Error message for a failed call to an external API (LLM, image provider). Keeps the HTTP status
 * and the parsed `error.type` / `error.code`, never the raw body: provider errors can echo the
 * prompt (player text, names) or a fragment of the API key.
 */
export function describeProviderFailure(
  label: string,
  status: number,
  rawBody: string,
): string {
  const parts = [`${label}: ${status.toString()}`];
  try {
    const error = (JSON.parse(rawBody) as { error?: Record<string, unknown> })
      .error;
    for (const field of ['type', 'code']) {
      const value = error?.[field];
      if (
        typeof value === 'string' &&
        IDENTIFIER.test(value) &&
        !/^sk-/i.test(value)
      ) {
        parts.push(value);
      }
    }
  } catch {
    // Not JSON: status only.
  }
  return parts.join(' ');
}
