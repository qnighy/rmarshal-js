import { type EncodingImpl, EncodingRegistration } from "../common-internal.ts";

const US_ASCII_IMPL: EncodingImpl = {
  delimit(bytes, pos) {
    return bytes[pos] < 0x80 ? 1 : -1;
  },
};

export default [
  EncodingRegistration(US_ASCII_IMPL, "US-ASCII", [
    "ASCII",
    "ANSI_X3.4-1968",
    "646",
  ]),
] satisfies EncodingRegistration[];
