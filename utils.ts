export function freezeProperties(obj: object) {
  for (const key of Reflect.ownKeys(obj)) {
    const prop = Reflect.getOwnPropertyDescriptor(obj, key)!;
    if (prop.get || prop.set) {
      Object.defineProperty(obj, key, {
        configurable: false,
      });
    } else {
      Object.defineProperty(obj, key, {
        writable: false,
        configurable: false,
      });
    }
  }
}
