export const MARSHAL_MAJOR = 4;
export const MARSHAL_MINOR = 8;

export const TYPE_NIL = 0x30; // '0'
export const TYPE_FALSE = 0x46; // 'F'
export const TYPE_TRUE = 0x54; // 'T'
export const TYPE_FIXNUM = 0x69; // 'i'
export const TYPE_BIGNUM = 0x6C; // 'l'
export const TYPE_FLOAT = 0x66; // 'f'
export const TYPE_SYMBOL = 0x3A; // ':'
export const TYPE_SYMLINK = 0x3B; // ';'
export const TYPE_IVAR = 0x49; // 'I'
export const TYPE_OBJECT = 0x6F; // 'o'
export const TYPE_ARRAY = 0x5B; // '['
export const TYPE_HASH = 0x7B; // '{'
export const TYPE_HASH_WITH_DEFAULT = 0x7D; // '}'
export const TYPE_LINK = 0x40; // '@'

export const SIGN_NEGATIVE = 0x2D; // '-'
export const SIGN_POSITIVE = 0x2B; // '+'
