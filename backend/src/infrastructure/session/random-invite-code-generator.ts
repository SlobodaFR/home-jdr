import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { InviteCodeGeneratorPort } from '../../domain/session/invite-code-generator.port';

// Avoids 0/O/1/I - easily confused when read aloud or handwritten (see
// tasks/03-session-engine.md - "court, non ambigu").
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

@Injectable()
export class RandomInviteCodeGenerator extends InviteCodeGeneratorPort {
  generate(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      code += ALPHABET[randomInt(ALPHABET.length)];
    }
    return code;
  }
}
