import {
  Char,
  type EncodingImpl,
  EncodingRegistration,
} from "../common-internal.ts";

const UTF_8_IMPL: EncodingImpl = {
  asciiCompatible: true,

  *chars(bytes: Uint8Array): IterableIterator<Char> {
    let pos = 0;
    while (pos < bytes.length) {
      const start = pos;
      const b0 = bytes[pos++];
      if (b0 < 0x80) {
        yield Char(start, pos, true, b0);
        continue;
      } else if (b0 < 0xC2) {
        // failure
      } else if (b0 < 0xE0) {
        const b1 = bytes[pos++] ?? 0;
        if ((b1 & 0xC0) === 0x80) {
          yield Char(start, pos, true, ((b0 & 0x1F) << 6) | (b1 & 0x3F));
          continue;
        }
      } else if (b0 < 0xF0) {
        const b1 = bytes[pos++] ?? 0;
        const b2 = bytes[pos++] ?? 0;
        if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80) {
          const unicode = ((b0 & 0x0F) << 12) | ((b1 & 0x3F) << 6) |
            (b2 & 0x3F);
          if (
            (0x0800 <= unicode && unicode < 0xD800) || 0xE000 <= unicode
          ) {
            yield Char(start, pos, true, unicode);
            continue;
          }
        }
      } else if (b0 < 0xF5) {
        const b1 = bytes[pos++] ?? 0;
        const b2 = bytes[pos++] ?? 0;
        const b3 = bytes[pos++] ?? 0;
        if (
          (b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80
        ) {
          const unicode = ((b0 & 0x07) << 18) | ((b1 & 0x3F) << 12) |
            ((b2 & 0x3F) << 6) | (b3 & 0x3F);
          if (0x10000 <= unicode && unicode < 0x110000) {
            yield Char(start, pos, true, unicode);
            continue;
          }
        }
      }
      // failure case
      pos = start + 1;
      yield Char(start, pos, false);
    }
  },
};

export default [
  EncodingRegistration(UTF_8_IMPL, "UTF-8", ["CP65001"]),
] satisfies EncodingRegistration[];
