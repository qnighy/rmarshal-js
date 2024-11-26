export class WeakValueMap<K, V extends WeakKey> {
  #inner: Map<K, WeakRef<V>> = new Map();
  #finalizationRegistry = new FinalizationRegistry<K>((key) => this.get(key));

  constructor(entries?: readonly (readonly [K, V])[] | null | undefined) {
    if (entries) {
      for (const [key, value] of entries) {
        this.#inner.set(key, new WeakRef(value));
      }
    }
  }

  clear(): void {
    this.#inner.clear();
  }

  delete(key: K): boolean {
    const prevValue = this.#inner.get(key);
    const deleted = this.#inner.delete(key);
    return deleted && prevValue?.deref() != null;
  }

  get(key: K): V | undefined {
    const weakValue = this.#inner.get(key);
    if (weakValue == null) {
      return undefined;
    }
    const value = weakValue.deref();
    if (value == null) {
      this.#inner.delete(key);
    }
    return value;
  }

  has(key: K): boolean {
    return this.get(key) != null;
  }

  set(key: K, value: V): this {
    this.#inner.set(key, new WeakRef(value));
    this.#finalizationRegistry.register(value, key);
    return this;
  }

  get size(): number {
    let size = 0;
    for (const _pair of this) {
      size++;
    }
    return size;
  }

  forEach(
    callbackfn: (value: V, key: K, map: WeakValueMap<K, V>) => void,
    thisArg?: unknown,
  ): void {
    for (const [key, value] of this) {
      callbackfn.call(thisArg, value, key, this);
    }
  }

  *keys(): IterableIterator<K> {
    for (const [key] of this) {
      yield key;
    }
  }
  *values(): IterableIterator<V> {
    for (const [, value] of this) {
      yield value;
    }
  }
  *entries(): IterableIterator<[K, V]> {
    yield* this;
  }
  *[Symbol.iterator](): IterableIterator<[K, V]> {
    for (const [key, weakValue] of this.#inner) {
      const value = weakValue.deref();
      if (value == null) {
        this.#inner.delete(key);
        continue;
      }
      yield [key, value];
    }
  }
}
