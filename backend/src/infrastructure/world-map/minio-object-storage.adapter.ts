import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectStoragePort } from '../../domain/world-map/object-storage.port';

/**
 * Stores objects (generated map images) on MinIO, the S3-compatible store
 * already used for Litestream replication (see CLAUDE.md/PRD.md). Uses the
 * same `MINIO_*` config as the replication setup (`.env.example`).
 */
@Injectable()
export class MinioObjectStorageAdapter extends ObjectStoragePort {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor(private readonly config: ConfigService) {
    super();
    this.bucket = this.config.getOrThrow<string>('MINIO_BUCKET');
    this.client = new S3Client({
      endpoint: this.config.getOrThrow<string>('MINIO_ENDPOINT'),
      region: this.config.get<string>('MINIO_REGION', 'us-east-1'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('MINIO_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>(
          'MINIO_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  async upload(key: string, buffer: Buffer): Promise<string> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer }),
    );
    return key;
  }
}
