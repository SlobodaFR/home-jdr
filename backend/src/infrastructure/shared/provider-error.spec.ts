import { describeProviderFailure } from './provider-error';

describe('describeProviderFailure', () => {
  it('keeps the status and the parsed error type/code only', () => {
    const body = JSON.stringify({
      error: {
        type: 'invalid_request_error',
        code: 'content_policy_violation',
        message: 'Your prompt "Grognak de alice@example.com" was rejected',
      },
    });

    const text = describeProviderFailure('Image generation failed', 400, body);

    expect(text).toBe(
      'Image generation failed: 400 invalid_request_error content_policy_violation',
    );
    expect(text).not.toContain('Grognak');
    expect(text).not.toContain('alice@example.com');
  });

  it('never echoes a raw or unparsable body, nor an API key', () => {
    const text = describeProviderFailure(
      'Image generation failed',
      401,
      'Incorrect API key provided: sk-proj-AbC_123-xyz. alice@example.com',
    );

    expect(text).toBe('Image generation failed: 401');
  });

  it('drops type/code values that are not plain identifiers', () => {
    const body = JSON.stringify({
      error: { type: 'sk-live-secret key', code: 'a b' },
    });

    expect(describeProviderFailure('Failed', 500, body)).toBe('Failed: 500');
  });
});
