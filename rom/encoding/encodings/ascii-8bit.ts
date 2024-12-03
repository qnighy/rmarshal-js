import {
  Char,
  type EncodingImpl,
  EncodingRegistration,
} from "../common-internal.ts";

const ASCII_8BIT_IMPL: EncodingImpl = {
  asciiCompatible: true,

  *chars(bytes: Uint8Array): IterableIterator<Char> {
    for (let i = 0; i < bytes.length; i++) {
      const unicode = bytes[i] < 0x80 ? bytes[i] : undefined;
      yield Char(i, i + 1, true, unicode);
    }
  },
};

export default [
  EncodingRegistration(ASCII_8BIT_IMPL, "ASCII-8BIT", ["BINARY"]),
] satisfies EncodingRegistration[];
