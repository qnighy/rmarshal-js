import {
  MarshalBoolean,
  MarshalInteger,
  MarshalNil,
  MarshalValue,
} from "./ast.ts";
import {
  MARSHAL_MAJOR,
  MARSHAL_MINOR,
  SIGN_NEGATIVE,
  SIGN_POSITIVE,
  TYPE_ARRAY,
  TYPE_BIGNUM,
  TYPE_CLASS,
  TYPE_DATA,
  TYPE_EXTENDED,
  TYPE_FALSE,
  TYPE_FIXNUM,
  TYPE_FLOAT,
  TYPE_HASH,
  TYPE_HASH_DEF,
  TYPE_IVAR,
  TYPE_LINK,
  TYPE_MODULE,
  TYPE_MODULE_OLD,
  TYPE_NIL,
  TYPE_OBJECT,
  TYPE_REGEXP,
  TYPE_STRING,
  TYPE_STRUCT,
  TYPE_SYMBOL,
  TYPE_SYMLINK,
  TYPE_TRUE,
  TYPE_UCLASS,
  TYPE_USERDEF,
  TYPE_USRMARSHAL,
} from "./marshal-common.ts";

export function parse(buf: Uint8Array): MarshalValue {
  const parser = new Parser(buf);
  const value = parser.readTopLevel();
  if (parser.rest().length > 0) {
    throw new SyntaxError("Unexpected trailing data");
  }
  return value;
}
export function* parseStream(buf: Uint8Array): IterableIterator<MarshalValue> {
  const parser = new Parser(buf);
  while (parser.hasRest()) {
    yield parser.readTopLevel();
  }
}
export function parseNext(buf: Uint8Array): [MarshalValue, Uint8Array] {
  const parser = new Parser(buf);
  const value = parser.readTopLevel();
  return [value, parser.rest()];
}

export class Parser {
  #buf: Uint8Array;
  #pos = 0;

  constructor(buf: Uint8Array) {
    this.#buf = buf;
  }

  hasRest(): boolean {
    return this.#pos < this.#buf.length;
  }

  rest(): Uint8Array {
    return this.#buf.subarray(this.#pos);
  }

  readTopLevel(): MarshalValue {
    const major = this.#readByte();
    const minor = this.#readByte();
    if (major !== MARSHAL_MAJOR || minor > MARSHAL_MINOR) {
      throw new SyntaxError(
        `Unsupported marshal version: ${major}.${minor} (expected ${MARSHAL_MAJOR}.0 to ${MARSHAL_MAJOR}.${MARSHAL_MINOR})`,
      );
    }
    return this.#readValue();
  }

  #readValue(): MarshalValue {
    const type = this.#readByte();
    switch (type) {
      case TYPE_NIL:
        return MarshalNil();
      case TYPE_TRUE:
        return MarshalBoolean(true);
      case TYPE_FALSE:
        return MarshalBoolean(false);
      case TYPE_FIXNUM:
        return this.#readFixnumBody();
      case TYPE_BIGNUM:
        return this.#readBignumBody();
      case TYPE_FLOAT:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_SYMBOL:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_SYMLINK:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_IVAR:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_EXTENDED:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_UCLASS:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_OBJECT:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_ARRAY:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_HASH:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_HASH_DEF:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_STRING:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_REGEXP:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_USRMARSHAL:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_USERDEF:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_DATA:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_STRUCT:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_MODULE_OLD:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_CLASS:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_MODULE:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      case TYPE_LINK:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      default:
        throw new SyntaxError(`Unknown type: ${describeByte(type)}`);
    }
  }

  #readFixnumBody(): MarshalInteger {
    const num = this.#readLong();
    if (num < -0x40000000 || num >= 0x40000000) {
      throw new SyntaxError("Integer too large for 31bit");
    }
    return MarshalInteger(BigInt(num));
  }

  #readBignumBody(): MarshalInteger {
    const signByte = this.#readByte();
    if (signByte !== SIGN_POSITIVE && signByte !== SIGN_NEGATIVE) {
      throw new SyntaxError("Invalid Bignum sign byte");
    }
    const numWords = this.#readIndex();
    let value = 0n;
    for (let i = 0; i < numWords * 2; i++) {
      value |= BigInt(this.#readByte()) << (BigInt(i) * 8n);
    }
    if (signByte !== SIGN_NEGATIVE) {
      if (numWords <= 2 && value < 0x40000000n) {
        throw new SyntaxError("Incorrect Fixnum representation as Bignum");
      } else if (value < (1n << (BigInt(numWords - 1) * 16n))) {
        throw new SyntaxError("Non-canonical Bignum representation");
      }
    } else {
      value = -value;
      if (numWords <= 2 && value >= -0x40000000n) {
        throw new SyntaxError("Incorrect Fixnum representation as Bignum");
      } else if (value > -(1n << (BigInt(numWords - 1) * 16n))) {
        throw new SyntaxError("Non-canonical Bignum representation");
      }
    }
    return MarshalInteger(value);
  }

  #readIndex(): number {
    const num = this.#readLong();
    if (num < 0) {
      throw new SyntaxError("Negative index or length");
    }
    return num;
  }

  #readLong(): number {
    const first = this.#readByte();
    if (first === 0) {
      return 0;
    } else if (first >= 6 && first <= 127) {
      // 1 to 122
      return first - 5;
    } else if (first >= 128 && first <= 250) {
      // -123 to -1
      return first - 251;
    } else if (first >= 1 && first <= 4) {
      const numBytes = first;
      let value = 0;
      for (let i = 0; i < numBytes; i++) {
        value = value + this.#readByte() * 256 ** i;
      }
      if (value < 123 || value < 256 ** (numBytes - 1)) {
        throw new SyntaxError("Non-canonical Fixnum representation");
      } else if (value >= 0x80000000) {
        throw new SyntaxError("Integer too large for 32bit");
      }
      return value;
    } else if (first >= 252 && first <= 255) {
      const numBytes = 256 - first;
      let value = 0;
      for (let i = 0; i < numBytes; i++) {
        value = value + this.#readByte() * 256 ** i;
      }
      value -= 256 ** numBytes;
      if (value >= -123 || value >= -(256 ** (numBytes - 1))) {
        throw new SyntaxError("Non-canonical Fixnum representation");
      } else if (value < -0x80000000) {
        throw new SyntaxError("Integer too large for 32bit");
      }
      return value;
    } else {
      throw new SyntaxError("Non-canonical Fixnum representation");
    }
  }

  #readByte(): number {
    if (this.#pos >= this.#buf.length) {
      throw new SyntaxError("Unexpected end of input");
    }
    return this.#buf[this.#pos++];
  }
}

const TYPE_NAMES = new Map<number, string>([
  [TYPE_NIL, "nil"],
  [TYPE_TRUE, "true"],
  [TYPE_FALSE, "false"],
  [TYPE_FIXNUM, "Integer (Fixnum)"],
  [TYPE_BIGNUM, "Integer (Bignum)"],
  [TYPE_FLOAT, "Float"],
  [TYPE_SYMBOL, "Symbol"],
  [TYPE_SYMLINK, "Symbol link"],
  [TYPE_IVAR, "instance variable container"],
  [TYPE_EXTENDED, "singleton extension"],
  [TYPE_UCLASS, "subclass of Array/Hash/String/Regexp"],
  [TYPE_OBJECT, "Object"],
  [TYPE_ARRAY, "Array"],
  [TYPE_HASH, "Hash"],
  [TYPE_HASH_DEF, "Hash with default value"],
  [TYPE_STRING, "String"],
  [TYPE_REGEXP, "Regexp"],
  [TYPE_USRMARSHAL, "#marshal_dump"],
  [TYPE_USERDEF, "#_dump"],
  [TYPE_DATA, "#_dump_data"],
  [TYPE_STRUCT, "Struct or Data"],
  [TYPE_MODULE_OLD, "Class or Module"],
  [TYPE_CLASS, "Class"],
  [TYPE_MODULE, "Module"],
  [TYPE_LINK, "Object link"],
]);

function describeType(byte: number): string {
  const name = TYPE_NAMES.get(byte);
  if (name) {
    return name;
  }
  return `Unknown type ${describeByte(byte)}`;
}

function describeByte(byte: number): string {
  const hex = `0x${byte.toString(16).padStart(2, "0").toUpperCase()}`;
  if (byte >= 0x20 && byte <= 0x7E) {
    return `${hex} '${String.fromCharCode(byte)}'`;
  }
  return hex;
}
