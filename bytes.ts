import { freezeProperties } from "./utils.ts";

/**
 * A phantom Symbol for use in {@link Bytes}.
 */
export declare const IsBytes: unique symbol;
/**
 * Branded type for strings that represent bytes.
 *
 * It should consist only of the following characters:
 *
 * - ASCII characters (U+0000 to U+007F)
 * - Private characters representing the upper half
 *   (U+F780 to U+F7FF)
 */
export type Bytes = string & { [IsBytes]: true };

/**
 * Creates a new `Bytes` value from a byte sequence.
 * @param value A byte sequence.
 * @returns A `Bytes` value.
 */
export function Bytes(value: Bytes | Uint8Array | readonly number[]): Bytes {
  if (typeof value === "string") {
    if (!Bytes.is(value)) {
      throw new TypeError("Not a byte sequence");
    }
    return value;
  }
  return String.fromCharCode(
    ...[...value].map((byte) => {
      const b = byte & 0xFF;
      return b < 0x80 ? b : b + 0xF700;
    }),
  ) as Bytes;
}

/**
 * Checks if a value is a `Bytes` value.
 *
 * @param value A value to check.
 * @returns `true` if the value is a `Bytes` value, otherwise `false`.
 */
Bytes.is = function (value: unknown): value is Bytes {
  return typeof value === "string" &&
    // deno-lint-ignore no-control-regex
    /^[\u0000-\u007F\uF780-\uF7FF]*$/.test(value);
};

/**
 * Converts a `Bytes` value to a byte sequence.
 *
 * @param value A `Bytes` value.
 * @returns A byte sequence.
 */
Bytes.toUint8Array = function (value: Bytes): Uint8Array {
  const vs = `${value}`;
  const ret = new Uint8Array(vs.length);
  for (let i = 0; i < vs.length; i++) {
    const code = vs.charCodeAt(i);
    if (code < 0x80 || (0xF780 <= code && code < 0xF800)) {
      ret[i] = code & 0xFF;
    } else {
      throw new TypeError("Got an invalid byte sequence");
    }
  }
  return ret;
};

Bytes.decodeUTF8 = function (value: Bytes): string {
  return new TextDecoder().decode(Bytes.toUint8Array(value));
};

Bytes.fromUTF8 = function (value: string): Bytes {
  return Bytes(new TextEncoder().encode(value));
};

Bytes.concat = function (...values: Bytes[]): Bytes {
  return values.join("") as Bytes;
};

export function b(
  template: TemplateStringsArray,
  ...substitutions: Bytes[]
): Bytes {
  const templateBytes = compileTemplate(template);
  let result = "";
  for (let i = 0; i < substitutions.length; i++) {
    result += templateBytes[i] + substitutions[i];
  }
  result += templateBytes[templateBytes.length - 1];
  return result as Bytes;
}

const templateCache = new WeakMap<TemplateStringsArray, readonly Bytes[]>();
function compileTemplate(template: TemplateStringsArray): readonly Bytes[] {
  const cached = templateCache.get(template);
  if (cached) {
    return cached;
  }

  const bytes: Bytes[] = [];
  for (const rawElement of template.raw) {
    let result = "";
    let i = 0;
    if (!rawElement.isWellFormed()) {
      throw new SyntaxError("Invalid template literal");
    }
    while (i < rawElement.length) {
      const escPos = rawElement.indexOf("\\", i);
      if (escPos === -1) {
        result += Bytes.fromUTF8(rawElement.slice(i));
        break;
      }
      result += Bytes.fromUTF8(rawElement.slice(i, escPos));
      if (escPos + 1 >= rawElement.length) {
        // It should not usually happen as the reverse solidus
        // would be interpreted as an escape of the following
        // grave accent.
        throw new SyntaxError("Unexpected end of template literal");
      }
      const ch = rawElement[escPos + 1];
      const esc = SINGLE_ESCAPES.get(ch);
      if (esc !== undefined) {
        result += esc;
        i = escPos + 2;
        continue;
      }
      if (ch === "0") {
        if (
          escPos + 2 < rawElement.length && /[0-9]/.test(rawElement[escPos + 2])
        ) {
          throw new SyntaxError("Octal escape sequences are not allowed");
        }
        result += "\0";
        i = escPos + 2;
        continue;
      }
      if (ch === "x") {
        if (escPos + 4 > rawElement.length) {
          throw new SyntaxError("Invalid hex escape sequence");
        }
        const hex = rawElement.slice(escPos + 2, escPos + 4);
        if (!/^[0-9A-Fa-f]{2}$/.test(hex)) {
          throw new SyntaxError("Invalid hex escape sequence");
        }
        result += Bytes([parseInt(hex, 16)]);
        i = escPos + 4;
        continue;
      }
      if (ch === "u" && rawElement[escPos + 2] !== "{") {
        if (escPos + 6 > rawElement.length) {
          throw new SyntaxError("Invalid Unicode escape sequence");
        }
        const hex = rawElement.slice(escPos + 2, escPos + 6);
        if (!/^[0-9A-Fa-f]{4}$/.test(hex)) {
          throw new SyntaxError("Invalid Unicode escape sequence");
        }
        const cp = parseInt(hex, 16);
        if (0xD800 <= cp && cp < 0xDC00) {
          throw new SyntaxError("Invalid Unicode escape sequence");
        }
        result += Bytes.fromUTF8(String.fromCharCode(cp));
        i = escPos + 6;
        continue;
      } else if (ch === "u" && rawElement[escPos + 2] === "{") {
        const bracePos = rawElement.indexOf("}", escPos + 3);
        if (bracePos === -1) {
          throw new SyntaxError("Invalid Unicode escape sequence");
        }
        const hex = rawElement.slice(escPos + 3, bracePos);
        if (!/^[0-9A-Fa-f]+$/.test(hex)) {
          throw new SyntaxError("Invalid Unicode escape sequence");
        }
        // The value may arbitrarily large, but its okay
        // because it's IEEE binary64.
        const cp = parseInt(hex, 16);
        if (0x110000 < cp || (0xD800 <= cp && cp < 0xDC00)) {
          throw new SyntaxError("Invalid Unicode escape sequence");
        }
        result += Bytes.fromUTF8(String.fromCharCode(cp));
        i = bracePos + 1;
        continue;
      }
      // CR does not actually occur in TRV, but including
      // it anyway for completeness.
      if (/[\r\n\u2028\u2029]/.test(ch)) {
        // LineContinuation
        i = escPos + 2;
        continue;
      }
      // Otherwise NonEscapeCharacter
      i = escPos + 1;
    }
    bytes.push(result as Bytes);
  }
  freezeProperties(bytes);
  templateCache.set(template, bytes);
  return bytes;
}

const SINGLE_ESCAPES = new Map<string, string>([
  ["'", "'"],
  ['"', '"'],
  ["\\", "\\"],
  ["b", "\b"],
  ["f", "\f"],
  ["n", "\n"],
  ["r", "\r"],
  ["t", "\t"],
  ["v", "\v"],
]);
