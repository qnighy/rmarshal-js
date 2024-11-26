import type { REncoding } from "./encoding.ts";
import type { RSymbol } from "./rsymbol.ts";
export * from "./encoding.ts";
export * from "./rsymbol.ts";

export type RInteger = bigint;
export type RFloat = number;
export type RNil = null;
export type RBoolean = boolean;

export type RObject =
  | RNil
  | RInteger
  | RFloat
  | RBoolean
  | REncoding
  | RSymbol;
