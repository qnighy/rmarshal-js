import { REncoding, US_ASCII, UTF_8 } from "./rom/encoding/mod.ts";
import { WeakValueMap } from "./weak-value-map.ts";

export type RSymbol = string | RExoticSymbol;

export type RSymbolOptions = {
  encoding?: REncoding;
};
export function RSymbol(
  source: string | Uint8Array,
  options: RSymbolOptions = {},
): RSymbol {
  const { encoding = UTF_8 } = options;
  if (typeof source === "string") {
    if (encoding !== UTF_8) {
      throw new Error("TODO: encoding other than UTF-8");
    }
    if (!source.isWellFormed()) {
      throw new TypeError("Got a non-well-formed string as a symbol source");
    }
    return source;
  }
  if (!encoding.isValid(source)) {
    throw new TypeError("Got an invalid byte sequence as a symbol source");
  }
  const asciiCompat = true;
  const isASCII = asciiCompat && source.every((byte) => byte < 0x80);
  if (isASCII || encoding === UTF_8) {
    return new TextDecoder("utf-8").decode(source);
  }
  return new RExoticSymbol(PRIVATE_KEY, source, encoding);
}

RSymbol.encodingOf = (symbol: RSymbol): REncoding => {
  if (typeof symbol === "string") {
    for (let i = 0; i < symbol.length; i++) {
      if (symbol.charCodeAt(i) >= 0x80) {
        return UTF_8;
      }
    }
    return US_ASCII;
  }
  return symbol.encoding;
};

const PRIVATE_KEY: unknown = {};

export class RExoticSymbol {
  #bytes: Uint8Array;
  #encoding: REncoding;
  #internKey: string;
  static #internMap = new WeakValueMap<string, RExoticSymbol>();
  constructor(
    privateKey: unknown,
    bytes: Uint8Array,
    encoding: REncoding,
  ) {
    if (privateKey !== PRIVATE_KEY) {
      throw new TypeError("Do not instantiate RExoticSymbol directly");
    }
    bytes = new Uint8Array(bytes);
    this.#bytes = bytes;
    this.#encoding = encoding;
    this.#internKey = encoding.name + "\n" + String.fromCharCode(...bytes);
    const interned = RExoticSymbol.#internMap.get(this.#internKey);
    if (interned) {
      return interned;
    }
    RExoticSymbol.#internMap.set(this.#internKey, this);
    Object.freeze(this);
  }

  get encoding(): REncoding {
    return this.#encoding;
  }

  toString(): string {
    return this.#encoding.inspectBytes(this.#bytes);
  }
}
