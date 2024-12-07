import type { REncoding } from "./encoding.ts";
import type { RSymbol } from "./rsymbol.ts";
import type { RObject } from "./robject.ts";
import type { RArray } from "./rarray.ts";
import type { RHash } from "./rhash.ts";
import type { RString } from "./rstring.ts";
export * from "./encoding.ts";
export * from "./rsymbol.ts";
export * from "./robject.ts";
export * from "./rarray.ts";
export * from "./rhash.ts";
export * from "./rstring.ts";

export type RInteger = bigint;
export type RFloat = number;
export type RNil = null;
export type RBoolean = boolean;

export type RValue =
  | RNil
  | RInteger
  | RFloat
  | RBoolean
  | REncoding
  | RSymbol
  | RObject
  | RArray
  | RHash
  | RString;
