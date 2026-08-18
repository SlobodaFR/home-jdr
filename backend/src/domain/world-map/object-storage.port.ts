/**
 * Port (driven side) implemented by the infrastructure layer. Generic
 * object storage, not MinIO-specific, so it stays substitutable (see
 * `tasks/05-world-map.md`). Returns the storage key the object was written
 * to (not a URL) - that key is what gets persisted on the `WorldMap`.
 */
export abstract class ObjectStoragePort {
  abstract upload(key: string, buffer: Buffer): Promise<string>;
}
