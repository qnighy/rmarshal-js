import { REncoding, US_ASCII, UTF_8 } from "./encoding/mod.ts";
import { WeakValueMap } from "../weak-value-map.ts";

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
  // Using Array rather than Uint8Array so that
  // it can be frozen.
  readonly bytes: readonly number[];
  readonly encoding: REncoding;
  static #internMap = new WeakValueMap<string, RExoticSymbol>();
  constructor(
    privateKey: unknown,
    bytes: Uint8Array,
    encoding: REncoding,
  ) {
    if (privateKey !== PRIVATE_KEY) {
      throw new TypeError("Do not instantiate RExoticSymbol directly");
    }

    const copiedBytes = Object.freeze(Array.from(bytes));
    this.bytes = copiedBytes;
    this.encoding = encoding;
    Object.freeze(this);

    const internKey = encoding.name + "\n" +
      String.fromCharCode(...copiedBytes);
    const interned = RExoticSymbol.#internMap.get(internKey);
    if (interned) {
      return interned;
    }
    RExoticSymbol.#internMap.set(internKey, this);
  }

  toString(): string {
    return this.encoding.inspectBytes(Uint8Array.from(this.bytes));
  }
}
