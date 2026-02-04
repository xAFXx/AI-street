export class CacheHelper<T> {
  private cache: Map<string, T> = new Map();

  has(key: string): boolean {
    return this.cache.has(key);
  }

  get(key: string): T | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: T): void {
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}
