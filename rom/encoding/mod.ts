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
  static readonly ISO_8859_1 = REncoding.find("ISO-8859-1");
  static readonly ISO8859_1 = REncoding.find("ISO8859-1");
  static readonly ISO_8859_2 = REncoding.find("ISO-8859-2");
  static readonly ISO8859_2 = REncoding.find("ISO8859-2");
  static readonly ISO_8859_3 = REncoding.find("ISO-8859-3");
  static readonly ISO8859_3 = REncoding.find("ISO8859-3");
  static readonly ISO_8859_4 = REncoding.find("ISO-8859-4");
  static readonly ISO8859_4 = REncoding.find("ISO8859-4");
  static readonly ISO_8859_5 = REncoding.find("ISO-8859-5");
  static readonly ISO8859_5 = REncoding.find("ISO8859-5");
  static readonly ISO_8859_6 = REncoding.find("ISO-8859-6");
  static readonly ISO8859_6 = REncoding.find("ISO8859-6");
  static readonly ISO_8859_7 = REncoding.find("ISO-8859-7");
  static readonly ISO8859_7 = REncoding.find("ISO8859-7");
  static readonly ISO_8859_8 = REncoding.find("ISO-8859-8");
  static readonly ISO8859_8 = REncoding.find("ISO8859-8");
  static readonly ISO_8859_9 = REncoding.find("ISO-8859-9");
  static readonly ISO8859_9 = REncoding.find("ISO8859-9");
  static readonly ISO_8859_10 = REncoding.find("ISO-8859-10");
  static readonly ISO8859_10 = REncoding.find("ISO8859-10");
  static readonly ISO_8859_11 = REncoding.find("ISO-8859-11");
  static readonly ISO8859_11 = REncoding.find("ISO8859-11");
  static readonly ISO_8859_13 = REncoding.find("ISO-8859-13");
  static readonly ISO8859_13 = REncoding.find("ISO8859-13");
  static readonly ISO_8859_14 = REncoding.find("ISO-8859-14");
  static readonly ISO8859_14 = REncoding.find("ISO8859-14");
  static readonly ISO_8859_15 = REncoding.find("ISO-8859-15");
  static readonly ISO8859_15 = REncoding.find("ISO8859-15");
  static readonly ISO_8859_16 = REncoding.find("ISO-8859-16");
  static readonly ISO8859_16 = REncoding.find("ISO8859-16");
  static readonly KOI8_R = REncoding.find("KOI8-R");
  static readonly CP878 = REncoding.find("CP878");
  static readonly KOI8_U = REncoding.find("KOI8-U");
  static readonly Windows_874 = REncoding.find("Windows-874");
  static readonly WINDOWS_874 = REncoding.find("Windows-874");
  static readonly CP874 = REncoding.find("CP874");
  static readonly Windows_1250 = REncoding.find("Windows-1250");
  static readonly WINDOWS_1250 = REncoding.find("Windows-1250");
  static readonly CP1250 = REncoding.find("CP1250");
  static readonly Windows_1251 = REncoding.find("Windows-1251");
  static readonly WINDOWS_1251 = REncoding.find("Windows-1251");
  static readonly CP1251 = REncoding.find("CP1251");
  static readonly Windows_1252 = REncoding.find("Windows-1252");
  static readonly WINDOWS_1252 = REncoding.find("Windows-1252");
  static readonly CP1252 = REncoding.find("CP1252");
  static readonly Windows_1253 = REncoding.find("Windows-1253");
  static readonly WINDOWS_1253 = REncoding.find("Windows-1253");
  static readonly CP1253 = REncoding.find("CP1253");
  static readonly Windows_1254 = REncoding.find("Windows-1254");
  static readonly WINDOWS_1254 = REncoding.find("Windows-1254");
  static readonly CP1254 = REncoding.find("CP1254");
  static readonly Windows_1255 = REncoding.find("Windows-1255");
  static readonly WINDOWS_1255 = REncoding.find("Windows-1255");
  static readonly CP1255 = REncoding.find("CP1255");
  static readonly Windows_1256 = REncoding.find("Windows-1256");
  static readonly WINDOWS_1256 = REncoding.find("Windows-1256");
  static readonly CP1256 = REncoding.find("CP1256");
  static readonly Windows_1257 = REncoding.find("Windows-1257");
  static readonly WINDOWS_1257 = REncoding.find("Windows-1257");
  static readonly CP1257 = REncoding.find("CP1257");
  static readonly Windows_1258 = REncoding.find("Windows-1258");
  static readonly WINDOWS_1258 = REncoding.find("Windows-1258");
  static readonly CP1258 = REncoding.find("CP1258");
  static readonly IBM437 = REncoding.find("IBM437");
  static readonly CP437 = REncoding.find("CP437");
  static readonly IBM720 = REncoding.find("IBM720");
  static readonly CP720 = REncoding.find("CP720");
  static readonly IBM737 = REncoding.find("IBM737");
  static readonly CP737 = REncoding.find("CP737");
  static readonly IBM775 = REncoding.find("IBM775");
  static readonly CP775 = REncoding.find("CP775");
  static readonly IBM850 = REncoding.find("IBM850");
  static readonly CP850 = REncoding.find("CP850");
  static readonly IBM852 = REncoding.find("IBM852");
  static readonly CP852 = REncoding.find("CP852");
  static readonly IBM855 = REncoding.find("IBM855");
  static readonly CP855 = REncoding.find("CP855");
  static readonly IBM857 = REncoding.find("IBM857");
  static readonly CP857 = REncoding.find("CP857");
  static readonly IBM860 = REncoding.find("IBM860");
  static readonly CP860 = REncoding.find("CP860");
  static readonly IBM861 = REncoding.find("IBM861");
  static readonly CP861 = REncoding.find("CP861");
  static readonly IBM862 = REncoding.find("IBM862");
  static readonly CP862 = REncoding.find("CP862");
  static readonly IBM863 = REncoding.find("IBM863");
  static readonly CP863 = REncoding.find("CP863");
  static readonly IBM864 = REncoding.find("IBM864");
  static readonly CP864 = REncoding.find("CP864");
  static readonly IBM865 = REncoding.find("IBM865");
  static readonly CP865 = REncoding.find("CP865");
  static readonly IBM866 = REncoding.find("IBM866");
  static readonly CP866 = REncoding.find("CP866");
  static readonly IBM869 = REncoding.find("IBM869");
  static readonly CP869 = REncoding.find("CP869");
  static readonly GB1988 = REncoding.find("GB1988");
  static readonly MacCentEuro = REncoding.find("macCentEuro");
  static readonly MACCENTEURO = REncoding.find("macCentEuro");
  static readonly MacCroatian = REncoding.find("macCroatian");
  static readonly MACCROATIAN = REncoding.find("macCroatian");
  static readonly MacCyrillic = REncoding.find("macCyrillic");
  static readonly MACCYRILLIC = REncoding.find("macCyrillic");
  static readonly MacGreek = REncoding.find("macGreek");
  static readonly MACGREEK = REncoding.find("macGreek");
  static readonly MacIceland = REncoding.find("macIceland");
  static readonly MACICELAND = REncoding.find("macIceland");
  static readonly MacRoman = REncoding.find("macRoman");
  static readonly MACROMAN = REncoding.find("macRoman");
  static readonly MacRomania = REncoding.find("macRomania");
  static readonly MACROMANIA = REncoding.find("macRomania");
  static readonly MacThai = REncoding.find("macThai");
  static readonly MACTHAI = REncoding.find("macThai");
  static readonly MacTurkish = REncoding.find("macTurkish");
  static readonly MACTURKISH = REncoding.find("macTurkish");
  static readonly MacUkraine = REncoding.find("macUkraine");
  static readonly MACUKRAINE = REncoding.find("macUkraine");
  static readonly TIS_620 = REncoding.find("TIS-620");
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
  static readonly EUC_JP = REncoding.find("EUC-JP");
  static readonly EucJP = REncoding.find("eucJP");
  static readonly EUCJP = REncoding.find("eucJP");
  static readonly EucJP_MS = REncoding.find("eucJP-MS");
  static readonly EUCJP_MS = REncoding.find("eucJP-MS");
  static readonly Euc_jp_ms = REncoding.find("euc-jp-ms");
  static readonly EUC_JP_MS = REncoding.find("euc-jp-ms");
  static readonly CP51932 = REncoding.find("CP51932");
  static readonly EUC_JIS_2004 = REncoding.find("EUC-JIS-2004");
  static readonly EUC_JISX0213 = REncoding.find("EUC-JISX0213");
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
