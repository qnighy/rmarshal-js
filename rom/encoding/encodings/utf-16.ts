import {
  Char,
  type EncodingImpl,
  EncodingRegistration,
} from "../common-internal.ts";

function genImpl(le: boolean): EncodingImpl {
  const combineBytes = le
    ? (b0: number, b1: number) => (b1 << 8) | b0
    : (b0: number, b1: number) => (b0 << 8) | b1;
  return {
    asciiCompatible: false,

    *chars(bytes: Uint8Array): IterableIterator<Char> {
      let pos = 0;
      while (pos + 2 <= bytes.length) {
        const start = pos;
        const w0 = combineBytes(bytes[pos++], bytes[pos++]);
        if (0xD800 <= w0 && w0 < 0xDC00) {
          const w1 = combineBytes(bytes[pos++] ?? 0, bytes[pos++] ?? 0);
          if (0xDC00 <= w1 && w1 < 0xE000) {
            yield Char(start, pos, true, combineSurrogates(w0, w1));
            continue;
          }
          // Otherwise, invalid surrogate
        } else if (0xDC00 <= w0 && w0 < 0xE000) {
          // Invalid surrogate
        } else {
          yield Char(start, pos, true, w0);
          continue;
        }
        pos = start + 2;
        yield Char(start, start + 1, false);
        yield Char(start + 1, start + 2, false);
      }
      if (pos < bytes.length) {
        yield Char(pos, pos + 1, false);
      }
    },
  };
}

function combineSurrogates(upper: number, lower: number): number {
  return (((upper & 0x3FF) << 10) | (lower & 0x3FF)) + 0x10000;
}

const UTF_16BE_IMPL = genImpl(false);
const UTF_16LE_IMPL = genImpl(true);
const UTF_16_IMPL: EncodingImpl = {
  asciiCompatible: false,
  *chars(bytes: Uint8Array): IterableIterator<Char> {
    if (bytes.length === 0) {
      return;
    }
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      yield* UTF_16BE_IMPL.chars(bytes.subarray(2));
      return;
    } else if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
      yield* UTF_16LE_IMPL.chars(bytes.subarray(2));
      return;
    }
    // Otherwise treat as all invalid
    for (let i = 0; i < bytes.length; i++) {
      yield Char(i, i + 1, false);
    }
  },
};

export default [
  EncodingRegistration(UTF_16BE_IMPL, "UTF-16BE", ["UCS-2BE"]),
  EncodingRegistration(UTF_16LE_IMPL, "UTF-16LE", []),
  EncodingRegistration(UTF_16_IMPL, "UTF-16", []),
] satisfies EncodingRegistration[];
