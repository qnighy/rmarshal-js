import { type EncodingImpl, EncodingRegistration } from "../common-internal.ts";

const ASCII_8BIT_IMPL: EncodingImpl = {
  delimit(_bytes, _pos) {
    return 1;
  },
};

export default [
  EncodingRegistration(ASCII_8BIT_IMPL, "ASCII-8BIT", ["BINARY"]),
] satisfies EncodingRegistration[];
