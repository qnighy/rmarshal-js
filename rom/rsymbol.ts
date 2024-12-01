import { REncoding } from "./encoding/mod.ts";
import { WeakValueMap } from "../weak-value-map.ts";
import { freezeProperties } from "../utils.ts";

export type RSymbol = string | RExoticSymbol;

export function RSymbol(
  bytes: Uint8Array,
  encoding: REncoding,
): RSymbol {
  if (!(encoding instanceof REncoding)) {
    throw new TypeError("encoding is not an REncoding");
  }
  if (!encoding.isValidBytes(bytes)) {
    throw new TypeError("Got an invalid byte sequence as a symbol source");
  }
  const asciiCompat = true;
  const isASCII = asciiCompat && bytes.every((byte) => byte < 0x80);
  if (isASCII || encoding === REncoding.UTF_8) {
    return new TextDecoder("utf-8").decode(bytes);
  }
  return new RExoticSymbol(PRIVATE_KEY, bytes, encoding);
}

RSymbol.encodingOf = (symbol: RSymbol): REncoding => {
  if (typeof symbol === "string") {
    // deno-lint-ignore no-control-regex
    return /^[\u0000-\u00FF]*$/.test(symbol)
      ? REncoding.US_ASCII
      : REncoding.UTF_8;
  }
  return symbol.encoding;
};

RSymbol.bytesOf = (symbol: RSymbol): Uint8Array => {
  if (typeof symbol === "string") {
    return new TextEncoder().encode(symbol);
  }
  return Uint8Array.from(symbol.bytes);
};

RSymbol.expand = (
  symbol: RSymbol,
): { encoding: REncoding; bytes: Uint8Array } => {
  return {
    encoding: RSymbol.encodingOf(symbol),
    bytes: RSymbol.bytesOf(symbol),
  };
};

freezeProperties(RSymbol);

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
