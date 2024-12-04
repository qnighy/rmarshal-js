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
  const isASCII = encoding.asciiCompatible &&
    bytes.every((byte) => byte < 0x80);
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

/**
 * Precise format:
 *
 * - Ordinary symbol: `@` + Identifier
 * - Exotic symbol: `@` + Identifier in x-user-defined encoding + `/` + Encoding name
 *
 * See {@link https://encoding.spec.whatwg.org/#x-user-defined} for the definition of x-user-defined encoding.
 */
export type IvarName = `@${string}`;

RSymbol.asIvarName = (symbol: RSymbol): IvarName | undefined => {
  if (typeof symbol === "string") {
    if (
      /^@[a-zA-Z_\u0080-\u{10FFFF}][a-zA-Z_\u0080-\u{10FFFF}0-9]*$/u.test(
        symbol,
      )
    ) {
      return symbol as `@${string}`;
    } else {
      return undefined;
    }
  }
  const bytes = symbol.bytes;
  if (
    symbol.encoding.asciiCompatible &&
    bytes.length >= 2 &&
    bytes[0] === 0x40 &&
    isIdStartByte(bytes[1]) &&
    bytes.every((byte, i) => i < 2 || isIdByte(byte))
  ) {
    const repr = embedXUserDefined(bytes) as `@${string}`;
    return `${repr}/${symbol.encoding.name}`;
  } else {
    return undefined;
  }
};

RSymbol.fromIvarName = (name: IvarName): RSymbol => {
  if (name[0] !== "@") {
    throw new TypeError("Invalid ivar name");
  }
  const slashPos = name.indexOf("/");
  if (slashPos === -1) {
    // Ordinary symbol representation
    return name;
  } else {
    // Exotic symbol representation
    const symbolBytes = extractXUserDefined(name.slice(0, slashPos));
    const encoding = REncoding.find(name.slice(slashPos + 1));
    return new RExoticSymbol(
      PRIVATE_KEY,
      Uint8Array.from(symbolBytes),
      encoding,
    );
  }
};

function isIdStartByte(byte: number): boolean {
  return (
    (0x41 <= byte && byte <= 0x5A) ||
    (0x61 <= byte && byte <= 0x7A) ||
    byte === 0x5F ||
    byte >= 0x80
  );
}

function isIdByte(byte: number): boolean {
  return isIdStartByte(byte) || (0x30 <= byte && byte <= 0x39);
}

function embedXUserDefined(bytes: readonly number[]): string {
  return String.fromCharCode(
    ...bytes.map((byte) => byte < 0x80 ? byte : byte + 0xF700),
  );
}

function extractXUserDefined(repr: string): number[] {
  return Array.from(repr).map((char) => {
    const cp = char.codePointAt(0)!;
    if (cp < 0x80) {
      return cp;
    } else if (0xF780 <= cp && cp < 0xF800) {
      return cp - 0xF700;
    } else {
      throw new TypeError("Invalid X-user-defined character");
    }
  });
}

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
