import { type EncodingImpl, EncodingRegistration } from "../common-internal.ts";

const SHIFT_JIS_IMPL: EncodingImpl = {
  delimit(bytes, pos) {
    const ch0 = bytes[pos];
    if (ch0 < 0x80) {
      // ASCII
      return 1;
    } else if (ch0 === 0x80) {
      return -1;
    } else if (ch0 < 0xA0) {
      // Row part; continue
    } else if (ch0 === 0xA0) {
      return -1;
    } else if (ch0 < 0xE0) {
      // JIS X 0201 Kana
      return 1;
    } else if (ch0 < 0xFD) {
      // Row part including extended rows (0xF0 - 0xFC); continue
    } else {
      return -1;
    }
    if (pos + 1 >= bytes.length) {
      return -1;
    }
    // shifted 2byte mode
    const ch1 = bytes[pos + 1];
    return 0x40 <= ch1 && ch1 < 0xFD && ch1 !== 0x7F ? 2 : -1;
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
