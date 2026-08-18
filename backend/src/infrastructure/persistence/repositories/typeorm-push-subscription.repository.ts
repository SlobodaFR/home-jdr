import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscription } from '../../../domain/push-subscription/push-subscription';
import { PushSubscriptionRepository } from '../../../domain/push-subscription/push-subscription.repository';
import { PushSubscriptionOrmEntity } from '../entities/push-subscription.orm-entity';

@Injectable()
export class TypeOrmPushSubscriptionRepository extends PushSubscriptionRepository {
  constructor(
    @InjectRepository(PushSubscriptionOrmEntity)
    private readonly repository: Repository<PushSubscriptionOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<PushSubscription | null> {
    const row = await this.repository.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<PushSubscription[]> {
    const rows = await this.repository.find({ where: { userId } });
    return rows.map(toDomain);
  }

  async save(subscription: PushSubscription): Promise<void> {
    await this.repository.save({
      id: subscription.id,
      userId: subscription.userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      createdAt: subscription.createdAt,
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}

function toDomain(row: PushSubscriptionOrmEntity): PushSubscription {
  return PushSubscription.create({
    id: row.id,
    userId: row.userId,
    endpoint: row.endpoint,
    keys: row.keys,
    createdAt: row.createdAt,
  });
}
