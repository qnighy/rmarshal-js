import type { EncodingRegistration } from "../common-internal.ts";
import ASCII_8BIT_REGISTRATIONS from "./ascii-8bit.ts";
import UTF_8_REGISTRATIONS from "./utf-8.ts";
import US_ASCII_REGISTRATIONS from "./us-ascii.ts";

export default [
  ...ASCII_8BIT_REGISTRATIONS,
  ...UTF_8_REGISTRATIONS,
  ...US_ASCII_REGISTRATIONS,
] satisfies EncodingRegistration[];
