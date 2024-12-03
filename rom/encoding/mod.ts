import { freezeProperties } from "../../utils.ts";
import { type EncodingImpl } from "./common-internal.ts";
import ENCODING_REGISTRATIONS from "./encodings/mod.ts";

const PRIVATE_KEY: unknown = {};

/**
 * Represents Ruby's Encoding object.
 *
 * REncodings has only a finite number of instances
 * defined by CRuby.
 */
export class REncoding {
  /**
   * All the registered encodings.
   * Keys are stored in lowercase form for collation.
   */
  static #encodings: Map<string, REncoding> = (() => {
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

  /**
   * The name of the encoding, as defined in CRuby.
   */
  readonly name: string;
  /**
   * The object that provides the implementation of the encoding.
   */
  #impl: EncodingImpl;

  /**
   * Private-only constructor. Do not use this.
   */
  constructor(privateKey: unknown, name: string, impl: EncodingImpl) {
    if (privateKey !== PRIVATE_KEY) {
      throw new TypeError("Do not instantiate REncoding directly");
    }
    this.name = name;
    this.#impl = impl;
    Object.freeze(this);
  }

  /**
   * Overrides the default `instanceof` operator
   * so that the check is more strict.
   */
  static [Symbol.hasInstance](instance: unknown): instance is REncoding {
    return #impl in (instance as REncoding);
  }

  /**
   * Looks up an encoding by name.
   * If the encoding is not found, returns `undefined`.
   */
  static query(name: string): REncoding | undefined {
    return this.#encodings.get(name.toLowerCase());
  }

  /**
   * Looks up an encoding by name.
   * If the encoding is not found, throws an error.
   */
  static find(name: string): REncoding {
    const result = this.#encodings.get(name.toLowerCase());
    if (result == null) {
      throw new TypeError(`Unknown encoding: ${name}`);
    }
    return result;
  }

  get asciiCompatible(): boolean {
    return this.#impl.asciiCompatible;
  }

  /**
   * Checks if the given bytes are valid for this encoding.
   */
  isValidBytes(bytes: Uint8Array): boolean {
    for (const char of this.#impl.chars(bytes)) {
      if (!char.valid) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns a human-readable representation of the given bytes
   * according to this encoding.
   */
  inspectBytes(bytes: Uint8Array, quote?: '"' | "'" | undefined): string {
    const rawMode = quote == null;
    let result = "";
    for (const char of this.#impl.chars(bytes)) {
      if (char.unicode) {
        const uch = String.fromCodePoint(char.unicode);
        if (rawMode || (/[^\p{Cc}\p{Cn}\\]/u.test(uch) && uch !== quote)) {
          // No escape needed
          result += uch;
        } else {
          // Use Unicode escape
          const esc = RUBY_BYTE_ESCAPES.get(char.unicode);
          if (esc != null) {
            result += `\\${esc}`;
          } else if (char.unicode < 0x10000) {
            // \uXXXX
            result += `\\u${
              char.unicode.toString(16).padStart(4, "0").toUpperCase()
            }`;
          } else {
            // \u{XXXXXX}
            result += `\\u{${char.unicode.toString(16).toUpperCase()}}`;
          }
        }
      } else if (char.start + 1 === char.end) {
        // Single byte escape
        const b = bytes[char.start];
        result += `\\x${b.toString(16).padStart(2, "0").toUpperCase()}`;
      } else {
        // Pseudo multibyte escape
        result += "\\x{";
        for (let i = char.start; i < char.end; i++) {
          const b = bytes[i];
          result += b.toString(16).padStart(2, "0").toUpperCase();
        }
        result += "}";
      }
    }
    return result;
  }

  // Constants for directly accessing the encoding.
  static readonly UTF_8 = REncoding.find("UTF-8");
  static readonly CP65001 = REncoding.find("CP65001");
  static readonly US_ASCII = REncoding.find("US-ASCII");
  static readonly ASCII = REncoding.find("ASCII");
  static readonly ANSI_X3_4_1968 = REncoding.find("ANSI_X3.4-1968");
  // 646 is in the form of number, which is not appropriate
  // static readonly 646 = REncoding.find("646");
  static readonly ASCII_8BIT = REncoding.find("ASCII-8BIT");
  static readonly BINARY = REncoding.find("BINARY");
  static readonly UTF_16BE = REncoding.find("UTF-16BE");
  static readonly UCS_2BE = REncoding.find("UCS-2BE");
  static readonly UTF_16LE = REncoding.find("UTF-16LE");
  static readonly UTF_16 = REncoding.find("UTF-16");
  static readonly Shift_JIS = REncoding.find("Shift_JIS");
  static readonly MacJapanese = REncoding.find("MacJapanese");
  static readonly Windows_31J = REncoding.find("Windows-31J");
  static readonly CP932 = REncoding.find("CP932");
  static readonly CsWindows31J = REncoding.find("csWindows31J");
  static readonly SJIS = REncoding.find("SJIS");
  static readonly PCK = REncoding.find("PCK");
  static readonly SJIS_DoCoMo = REncoding.find("SJIS-DoCoMo");
  static readonly SJIS_KDDI = REncoding.find("SJIS-KDDI");
  static readonly SJIS_SoftBank = REncoding.find("SJIS-SoftBank");
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
  [0x22, '"'],
  [0x27, "'"],
  [0x5C, "\\"],
]);
