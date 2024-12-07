import {
  Char,
  type EncodingImpl,
  EncodingRegistration,
} from "../common-internal.ts";

const EUC_JP_IMPL: EncodingImpl = {
  asciiCompatible: true,

  *chars(bytes: Uint8Array): IterableIterator<Char> {
    let pos = 0;
    while (pos < bytes.length) {
      const start = pos;
      const b0 = bytes[pos++];
      if (b0 < 0x80) {
        yield Char(start, pos, true, b0);
        continue;
      } else if (b0 === 0x8E) {
        // SS2 (G2) ... JIS X 0201 Kana
        const b1 = bytes[pos++] ?? 0;
        // All the 94 code points are considered valid
        // although there are only 63 assigned.
        if (0xA1 <= b1 && b1 < 0xFF) {
          yield Char(start, pos, true);
          continue;
        }
      } else if (b0 === 0x8F) {
        // SS3 (G3) ... JIS X 0212 / JIS X 0213 plane 2
        const b1 = bytes[pos++] ?? 0;
        const b2 = bytes[pos++] ?? 0;
        // All 94x94 are considered valid
        if (0xA1 <= b1 && b1 < 0xFF && 0xA1 <= b2 && b2 < 0xFF) {
          yield Char(start, pos, true);
          continue;
        }
      } else if (b0 < 0xA1) {
        // C1 other than SS2 and SS3 are considered invalid
      } else if (b0 < 0xFF) {
        // G1 ... JIS X 0208 / JIS X 0213 plane 1
        const b1 = bytes[pos++] ?? 0;
        // All 94x94 are considered valid
        if (0xA1 <= b1 && b1 < 0xFF) {
          yield Char(start, pos, true);
          continue;
        }
      } else {
        // 0xFF is invalid
      }
      // failure case
      pos = start + 1;
      yield Char(start, pos, false);
    }
  },
};

export default [
  EncodingRegistration(EUC_JP_IMPL, "EUC-JP", ["eucJP"]),
  EncodingRegistration(EUC_JP_IMPL, "eucJP-ms", ["euc-jp-ms"]),
  EncodingRegistration(EUC_JP_IMPL, "CP51932", []),
  EncodingRegistration(EUC_JP_IMPL, "EUC-JIS-2004", ["EUC-JISX0213"]),
] satisfies EncodingRegistration[];
