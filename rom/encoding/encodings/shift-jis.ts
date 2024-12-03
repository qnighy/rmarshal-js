import {
  Char,
  type EncodingImpl,
  EncodingRegistration,
} from "../common-internal.ts";

const SHIFT_JIS_IMPL: EncodingImpl = {
  asciiCompatible: true,

  *chars(bytes: Uint8Array): IterableIterator<Char> {
    let pos = 0;
    while (pos < bytes.length) {
      const start = pos;
      const b0 = bytes[pos++];
      let fail = false;
      if (b0 < 0x80) {
        yield Char(start, pos, true, b0);
        continue;
      } else if (b0 === 0x80) {
        fail = true;
      } else if (b0 < 0xA0) {
        // Row part; continue
      } else if (b0 === 0xA0) {
        fail = true;
      } else if (b0 < 0xE0) {
        // JIS X 0201 Kana
        yield Char(start, pos, true);
        continue;
      } else if (b0 < 0xFD) {
        // Row part including extended rows (0xF0 - 0xFC); continue
      } else {
        fail = true;
      }
      if (!fail) {
        // shifted 2byte mode
        const b1 = bytes[pos++] ?? 0;
        if (0x40 <= b1 && b1 < 0xFD && b1 !== 0x7F) {
          yield Char(start, pos, true);
          continue;
        }
      }
      // failure case
      pos = start + 1;
      yield Char(start, pos, false);
    }
  },
};

export default [
  EncodingRegistration(SHIFT_JIS_IMPL, "Shift_JIS", []),
  EncodingRegistration(SHIFT_JIS_IMPL, "MacJapanese", []),
  EncodingRegistration(SHIFT_JIS_IMPL, "Windows-31J", [
    "CP932",
    "csWindows31J",
    "SJIS",
    "PCK",
    "SJIS-DoCoMo",
    "SJIS-KDDI",
    "SJIS-SoftBank",
  ]),
] satisfies EncodingRegistration[];
