import { ObjectStoragePort } from '../../domain/world-map/object-storage.port';

/** Test double shared by the world-map use-case specs. */
export class InMemoryObjectStoragePort extends ObjectStoragePort {
  public readonly stored = new Map<string, Buffer>();

  upload(key: string, buffer: Buffer): Promise<string> {
    this.stored.set(key, buffer);
    return Promise.resolve(key);
  }
}
