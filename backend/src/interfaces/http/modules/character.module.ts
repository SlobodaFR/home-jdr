import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplyCharacterDeltaUseCase } from '../../../application/character/apply-character-delta.use-case';
import { CreateCharacterUseCase } from '../../../application/character/create-character.use-case';
import { GetCharacterUseCase } from '../../../application/character/get-character.use-case';
import { ListCharactersForSessionUseCase } from '../../../application/character/list-characters-for-session.use-case';
import { CharacterRepository } from '../../../domain/character/character.repository';
import { CharacterOrmEntity } from '../../../infrastructure/persistence/entities/character.orm-entity';
import { TypeOrmCharacterRepository } from '../../../infrastructure/persistence/repositories/typeorm-character.repository';
import { CharacterController } from '../controllers/character.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CharacterOrmEntity])],
  controllers: [CharacterController],
  providers: [
    { provide: CharacterRepository, useClass: TypeOrmCharacterRepository },
    CreateCharacterUseCase,
    GetCharacterUseCase,
    ListCharactersForSessionUseCase,
    ApplyCharacterDeltaUseCase,
  ],
})
export class CharacterModule {}
