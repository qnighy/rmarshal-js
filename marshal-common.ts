import type { RArray, RHash, RObject, RString } from "./rom.ts";

export const MARSHAL_MAJOR = 4;
export const MARSHAL_MINOR = 8;

export const TYPE_NIL = 0x30; // '0'
export const TYPE_TRUE = 0x54; // 'T'
export const TYPE_FALSE = 0x46; // 'F'
export const TYPE_FIXNUM = 0x69; // 'i'
export const TYPE_BIGNUM = 0x6C; // 'l'
export const TYPE_FLOAT = 0x66; // 'f'
export const TYPE_SYMBOL = 0x3A; // ':'
export const TYPE_SYMLINK = 0x3B; // ';'
export const TYPE_IVAR = 0x49; // 'I'
export const TYPE_EXTENDED = 0x65; // 'e'
export const TYPE_UCLASS = 0x43; // 'C'
export const TYPE_OBJECT = 0x6F; // 'o'
export const TYPE_ARRAY = 0x5B; // '['
export const TYPE_HASH = 0x7B; // '{'
export const TYPE_HASH_DEF = 0x7D; // '}'
export const TYPE_STRING = 0x22; // '"'
export const TYPE_REGEXP = 0x2F; // '/'
export const TYPE_USRMARSHAL = 0x55; // 'U'
export const TYPE_USERDEF = 0x75; // 'u'
export const TYPE_DATA = 0x64; // 'd'
export const TYPE_STRUCT = 0x53; // 'S'
export const TYPE_MODULE_OLD = 0x4D; // 'M'
export const TYPE_CLASS = 0x63; // 'c'
export const TYPE_MODULE = 0x6D; // 'm'
export const TYPE_LINK = 0x40; // '@'

export const SIGN_NEGATIVE = 0x2D; // '-'
export const SIGN_POSITIVE = 0x2B; // '+'

export type RObjectLike =
  | RObject
  | RArray
  | RHash
  | RString;
