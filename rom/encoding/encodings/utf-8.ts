import { type EncodingImpl, EncodingRegistration } from "../common-internal.ts";

const UTF_8_IMPL: EncodingImpl = {
  delimit(bytes, pos) {
    const ch0 = bytes[pos];
    if (ch0 < 0x80) {
      return 1;
    } else if (ch0 < 0xC2) {
      return -1;
    } else if (ch0 < 0xE0) {
      return pos + 1 < bytes.length && (bytes[pos + 1] & 0xC0) === 0x80
        ? 2
        : -1;
    } else if (ch0 < 0xF0) {
      if (pos + 2 >= bytes.length) {
        return -1;
      }
      const ch1 = bytes[pos + 1];
      if ((ch1 & 0xC0) !== 0x80) {
        return -1;
      }
      if (ch0 === 0xE0 && ch1 < 0xA0) {
        return -1;
      }
      if (ch0 === 0xED && ch1 >= 0xA0) {
        return -1;
      }
      const ch2 = bytes[pos + 2];
      return (ch2 & 0xC0) === 0x80 ? 3 : -1;
    } else if (ch0 < 0xF5) {
      if (pos + 3 >= bytes.length) {
        return -1;
      }
      const ch1 = bytes[pos + 1];
      if ((ch1 & 0xC0) !== 0x80) {
        return -1;
      }
      if (ch0 === 0xF0 && ch1 < 0x90) {
        return -1;
      }
      if (ch0 === 0xF4 && ch1 >= 0x90) {
        return -1;
      }
      const ch2 = bytes[pos + 2];
      const ch3 = bytes[pos + 3];
      return (ch2 & 0xC0) === 0x80 && (ch3 & 0xC0) === 0x80 ? 4 : -1;
    }
    return -1;
  },
};

export default [
  EncodingRegistration(UTF_8_IMPL, "UTF-8", ["CP65001"]),
] satisfies EncodingRegistration[];
