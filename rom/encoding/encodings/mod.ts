import type { EncodingRegistration } from "../common-internal.ts";
import ASCII_8BIT_REGISTRATIONS from "./ascii-8bit.ts";
import UTF_8_REGISTRATIONS from "./utf-8.ts";
import UTF_16_REGISTRATIONS from "./utf-16.ts";
import US_ASCII_REGISTRATIONS from "./us-ascii.ts";
import SHIFT_JIS_REGISTRATIONS from "./shift-jis.ts";
import EUC_JP_REGISTRATIONS from "./euc-jp.ts";

export default [
  ...ASCII_8BIT_REGISTRATIONS,
  ...UTF_8_REGISTRATIONS,
  ...UTF_16_REGISTRATIONS,
  ...US_ASCII_REGISTRATIONS,
  ...SHIFT_JIS_REGISTRATIONS,
  ...EUC_JP_REGISTRATIONS,
] satisfies EncodingRegistration[];
