import { RandomInviteCodeGenerator } from './random-invite-code-generator';

const AMBIGUOUS_CHARACTERS = ['0', 'O', '1', 'I'];

describe('RandomInviteCodeGenerator', () => {
  it('generates 6-character codes with no ambiguous characters', () => {
    const generator = new RandomInviteCodeGenerator();

    for (let i = 0; i < 500; i += 1) {
      const code = generator.generate();
      expect(code).toHaveLength(6);
      for (const character of AMBIGUOUS_CHARACTERS) {
        expect(code).not.toContain(character);
      }
      expect(code).toMatch(/^[A-Z0-9]+$/);
    }
  });

  it('generates different codes across calls (extremely unlikely to collide)', () => {
    const generator = new RandomInviteCodeGenerator();

    const codes = new Set(
      Array.from({ length: 100 }, () => generator.generate()),
    );

    expect(codes.size).toBeGreaterThan(90);
  });
});
