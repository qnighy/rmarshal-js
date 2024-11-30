import { freezeProperties } from "../../utils.ts";
import { type EncodingImpl } from "./common-internal.ts";
import ENCODING_REGISTRATIONS from "./encodings/mod.ts";

const PRIVATE_KEY: unknown = {};
export class REncoding {
  readonly name: string;
  #impl: EncodingImpl;

  constructor(privateKey: unknown, name: string, impl: EncodingImpl) {
    if (privateKey !== PRIVATE_KEY) {
      throw new TypeError("Do not instantiate REncoding directly");
    }
    this.name = name;
    this.#impl = impl;
    Object.freeze(this);
  }

  static [Symbol.hasInstance](instance: unknown): instance is REncoding {
    return #impl in (instance as REncoding);
  }

  static query(name: string): REncoding | undefined {
    return encodings.get(name.toLowerCase());
  }

  static find(name: string): REncoding {
    const result = encodings.get(name.toLowerCase());
    if (result == null) {
      throw new TypeError(`Unknown encoding: ${name}`);
    }
    return result;
  }

  isValid(bytes: Uint8Array): boolean {
    let pos = 0;
    while (pos < bytes.length) {
      const delim = this.#impl.delimit(bytes, pos);
      if (delim <= 0) {
        return false;
      }
      pos += delim;
    }
    return true;
  }

  *codepoints(bytes: Uint8Array): IterableIterator<number> {
    let pos = 0;
    while (pos < bytes.length) {
      const size = this.#impl.delimit(bytes, pos);
      if (size <= 0) {
        yield bytes[pos];
        pos++;
        continue;
      }
      let codepoint = 0;
      for (let i = 0; i < size; i++) {
        codepoint = codepoint * 256 + bytes[pos + i];
      }
      yield codepoint;
      pos += size;
    }
  }

  inspectBytes(bytes: Uint8Array, quote?: '"' | "'" | undefined): string {
    const quoteCodepoint = quote === '"'
      ? 0x22
      : quote === "'"
      ? 0x27
      : undefined;
    let result = "";
    for (const codepoint of this.codepoints(bytes)) {
      const esc = RUBY_BYTE_ESCAPES.get(codepoint);
      if (esc != null) {
        result += `\\${esc}`;
      } else if (codepoint === quoteCodepoint) {
        result += `\\${quote}`;
      } else if (codepoint >= 0x20 && codepoint < 0x7F) {
        result += String.fromCharCode(codepoint);
      } else if (codepoint < 0x100) {
        result += `\\x${codepoint.toString(16).padStart(2, "0").toUpperCase()}`;
      } else {
        // Pseudo multibyte escape
        const preHex = codepoint.toString(16).toUpperCase();
        const hex = preHex.padStart(preHex.length + (preHex.length & 1), "0");
        result += `\\x{${hex}}`;
      }
    }
    return result;
  }
}

freezeProperties(REncoding.prototype);
freezeProperties(REncoding);

const RUBY_BYTE_ESCAPES = new Map<number, string>([
  [0x07, "a"],
  [0x08, "b"],
  [0x09, "t"],
  [0x0A, "n"],
  [0x0B, "v"],
  [0x0C, "f"],
  [0x0D, "r"],
  [0x1B, "e"],
  [0x5C, "\\"],
]);

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

export const UTF_8 = REncoding.find("UTF-8");
export const US_ASCII = REncoding.find("US-ASCII");
export const ASCII_8BIT = REncoding.find("ASCII-8BIT");
