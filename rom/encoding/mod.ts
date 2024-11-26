import { type EncodingImpl } from "./common-internal.ts";
import ENCODING_REGISTRATIONS from "./encodings/mod.ts";

const PRIVATE_KEY: unknown = {};
export class REncoding {
  #name: string;
  #impl: EncodingImpl;

  constructor(privateKey: unknown, name: string, impl: EncodingImpl) {
    if (privateKey !== PRIVATE_KEY) {
      throw new TypeError("Do not instantiate REncoding directly");
    }
    this.#name = name;
    this.#impl = impl;
    Object.freeze(this);
  }

  get name(): string {
    return this.#name;
  }
}

const encodings: Map<string, REncoding> = (() => {
  const encodings = new Map<string, REncoding>();
  for (const { impl, name, aliases } of ENCODING_REGISTRATIONS) {
    const enc = new REncoding(PRIVATE_KEY, name, impl);
    encodings.set(name.toLowerCase(), enc);
    for (const alias of aliases) {
      encodings.set(alias.toLowerCase(), enc);
    }
  }
  return encodings;
})();

export function findEncoding(name: string): REncoding | undefined {
  return encodings.get(name.toLowerCase());
}
