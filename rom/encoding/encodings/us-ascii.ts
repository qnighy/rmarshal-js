import {
  Char,
  type EncodingImpl,
  EncodingRegistration,
} from "../common-internal.ts";

const US_ASCII_IMPL: EncodingImpl = {
  asciiCompatible: true,

  *chars(bytes: Uint8Array): IterableIterator<Char> {
    for (let i = 0; i < bytes.length; i++) {
      const valid = bytes[i] < 0x80;
      yield Char(i, i + 1, valid, bytes[i]);
    }
  },
};

export default [
  EncodingRegistration(US_ASCII_IMPL, "US-ASCII", [
    "ASCII",
    "ANSI_X3.4-1968",
    "646",
  ]),
] satisfies EncodingRegistration[];
