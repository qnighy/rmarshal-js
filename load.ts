import {
  MARSHAL_MAJOR,
  MARSHAL_MINOR,
  SIGN_NEGATIVE,
  SIGN_POSITIVE,
  TYPE_ARRAY,
  TYPE_BIGNUM,
  TYPE_FALSE,
  TYPE_FIXNUM,
  TYPE_FLOAT,
  TYPE_IVAR,
  TYPE_LINK,
  TYPE_NIL,
  TYPE_OBJECT,
  TYPE_SYMBOL,
  TYPE_SYMLINK,
  TYPE_TRUE,
} from "./marshal-common.ts";
import { RArray, REncoding, RObject, RSymbol, type RValue } from "./rom.ts";

export function load(buf: Uint8Array): RValue {
  const loader = new Loader(buf);
  const value = loader.readTopLevel();
  if (loader.rest().length > 0) {
    throw new SyntaxError("Unexpected trailing data");
  }
  return value;
}
export function* loadStream(buf: Uint8Array): IterableIterator<RValue> {
  const loader = new Loader(buf);
  while (loader.hasRest()) {
    yield loader.readTopLevel();
  }
}
export function loadNext(buf: Uint8Array): [RValue, Uint8Array] {
  const loader = new Loader(buf);
  const value = loader.readTopLevel();
  return [value, loader.rest()];
}

export class Loader {
  #buf: Uint8Array;
  #pos = 0;
  #symbols!: (RSymbol | undefined)[];
  #visitedSymbols!: Set<RSymbol>;
  #links!: (RValue | undefined)[];

  constructor(buf: Uint8Array) {
    this.#buf = buf;
  }

  hasRest(): boolean {
    return this.#pos < this.#buf.length;
  }

  rest(): Uint8Array {
    return this.#buf.subarray(this.#pos);
  }

  readTopLevel(): RValue {
    this.#symbols = [];
    this.#visitedSymbols = new Set();
    this.#links = [];
    const major = this.#readByte();
    const minor = this.#readByte();
    if (major !== MARSHAL_MAJOR || minor > MARSHAL_MINOR) {
      throw new SyntaxError(
        `Unsupported marshal version: ${major}.${minor} (expected ${MARSHAL_MAJOR}.0 to ${MARSHAL_MAJOR}.${MARSHAL_MINOR})`,
      );
    }
    return this.#readValue();
  }

  #readValue(): RValue {
    const type = this.#readByte();
    switch (type) {
      case TYPE_NIL:
        return null;
      case TYPE_FALSE:
        return false;
      case TYPE_TRUE:
        return true;
      case TYPE_FIXNUM:
        return BigInt(this.#readFixnumBody());
      case TYPE_BIGNUM:
        return this.#linkValue(this.#readBignumBody());
      case TYPE_FLOAT:
        return this.#linkValue(this.#readFloatBody());
      case TYPE_SYMBOL:
        return this.#readSymbolBody(false);
      case TYPE_SYMLINK:
        return this.#readSymlinkBody();
      case TYPE_IVAR:
        return this.#readInIvarContainer();
      case TYPE_OBJECT:
        return this.#readObjectBody();
      case TYPE_ARRAY:
        return this.#readArrayBody();
      case TYPE_LINK:
        return this.#readLink();
      default:
        throw new SyntaxError(
          `Unknown type: ${type.toString(16).padStart(2, "0").toUpperCase()}`,
        );
    }
  }

  #readInIvarContainer(): RValue {
    const type = this.#readByte();
    switch (type) {
      case TYPE_SYMBOL:
        return this.#readSymbolBody(true);
      case TYPE_IVAR:
        throw new SyntaxError("Nested instance variable container");
      default:
        return Loader.#rejectUnsupportedType(
          type,
          "cannot have instance variables",
        );
    }
  }

  #readSymbol(): RSymbol {
    const type = this.#readByte();
    switch (type) {
      case TYPE_SYMBOL:
        return this.#readSymbolBody(false);
      case TYPE_SYMLINK:
        return this.#readSymlinkBody();
      case TYPE_IVAR: {
        const subtype = this.#readByte();
        switch (subtype) {
          case TYPE_SYMBOL:
            return this.#readSymbolBody(true);
          case TYPE_IVAR:
            throw new SyntaxError("Nested instance variable container");
          default:
            return Loader.#rejectUnsupportedType(
              subtype,
              "cannot be an instance variable key",
            );
        }
      }
      default:
        return Loader.#rejectUnsupportedType(
          type,
          "cannot be an instance variable key",
        );
    }
  }

  static #rejectUnsupportedType(type: number, msg: string): never {
    const desc = Loader.#typeDescription(type);
    if (desc !== null) {
      throw new SyntaxError(`${desc} ${msg}`);
    }
    throw new SyntaxError(
      `Unknown type: ${
        type.toString(16).padStart(2, "0").toUpperCase()
      } ${msg}`,
    );
  }

  static #typeDescription(type: number): string | undefined {
    switch (type) {
      case TYPE_NIL:
        return "nil";
      case TYPE_FALSE:
        return "false";
      case TYPE_TRUE:
        return "true";
      case TYPE_FIXNUM:
        return "Integer (Fixnum)";
      case TYPE_BIGNUM:
        return "Integer (Bignum)";
      case TYPE_FLOAT:
        return "Float";
      case TYPE_SYMBOL:
        return "Symbol";
      case TYPE_SYMLINK:
        return "Symbol link";
      case TYPE_IVAR:
        return "Instance variable container";
      case TYPE_OBJECT:
        return "Object";
      case TYPE_ARRAY:
        return "Array";
      case TYPE_LINK:
        return "Object link";
    }
  }

  #readBignumBody(): bigint {
    const signByte = this.#readByte();
    if (signByte !== SIGN_POSITIVE && signByte !== SIGN_NEGATIVE) {
      throw new SyntaxError("Invalid Bignum sign byte");
    }
    const numWords = this.#readLength();
    let value = 0n;
    for (let i = 0; i < numWords * 2; i++) {
      value |= BigInt(this.#readByte()) << (BigInt(i) * 8n);
    }
    if (signByte !== SIGN_NEGATIVE) {
      if (value < 0x40000000n) {
        throw new SyntaxError("Incorrect Fixnum representation as Bignum");
      } else if (value < (1n << (BigInt(numWords - 1) * 16n))) {
        throw new SyntaxError("Non-canonical Bignum representation");
      }
    } else {
      value = -value;
      if (value >= -0x40000000n) {
        throw new SyntaxError("Incorrect Fixnum representation as Bignum");
      } else if (value > -(1n << (BigInt(numWords - 1) * 16n))) {
        throw new SyntaxError("Non-canonical Bignum representation");
      }
    }
    return value;
  }

  #readFloatBody(): number {
    const text = new TextDecoder().decode(this.#readByteSlice());
    switch (text) {
      case "nan":
        return NaN;
      case "inf":
        return Infinity;
      case "-inf":
        return -Infinity;
    }
    if (/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:e-?[1-9][0-9]*)?$/.test(text)) {
      return Number(text);
    } else if (
      /^[+\-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+\-]?[0-9]+)?$/.test(text)
    ) {
      throw new SyntaxError("Noncanonical Float format");
    } else {
      throw new SyntaxError("Invalid Float format");
    }
  }

  #readSymbolBody(hasIvar: boolean): RSymbol {
    const symbolId = this.#symbols.length;
    this.#symbols.push(undefined);

    const sym = this.#readSymbolBodyImpl(hasIvar);
    this.#symbols[symbolId] = sym;
    if (this.#visitedSymbols.has(sym)) {
      throw new SyntaxError("Same symbol appeared twice");
    }
    this.#visitedSymbols.add(sym);
    return sym;
  }

  #readSymbolBodyImpl(hasIvar: boolean): RSymbol {
    const bytes = this.#readByteSlice();
    if (!hasIvar) {
      return RSymbol(bytes, REncoding.ASCII_8BIT);
    }
    const numIvars = this.#readLength();
    if (numIvars !== 1) {
      throw new SyntaxError(
        "Complex symbol must have exactly one instance variable",
      );
    }
    const key = this.#readSymbol();
    const value = this.#readValue();
    let encoding: REncoding;
    switch (key) {
      case "E":
        // Short encoding form
        if (value === true) {
          encoding = REncoding.UTF_8;
        } else if (value === false) {
          throw new SyntaxError("Redundant US-ASCII specifier in Symbol");
        } else {
          throw new SyntaxError("Invalid short encoding specifier in Symbol");
        }
        break;
      case "encoding":
        throw Error("TODO: Symbol with encoding");
        // // Long encoding form
        // if (typeof value === "string") {
        //   const maybeEncoding = findEncoding(value);
        //   if (maybeEncoding == null) {
        //     throw new SyntaxError(`Unknown encoding: ${value}`);
        //   }
        //   encoding = maybeEncoding;
        //   if (encoding === REncoding.ASCII_8BIT) {
        //     throw new SyntaxError("Redundant ASCII-8BIT specifier in Symbol");
        //   }
        // } else {
        //   throw new SyntaxError("Invalid encoding specifier in Symbol");
        // }
        // break;
      default:
        throw new SyntaxError("Invalid instance variable key in Symbol");
    }
    const sym = RSymbol(bytes, encoding);
    if (RSymbol.encodingOf(sym) !== encoding) {
      throw new SyntaxError("Redundant encoding specifier in ASCII Symbol");
    }
    return sym;
  }

  #readSymlinkBody(): RSymbol {
    const symbolId = this.#readLength();
    if (symbolId >= this.#symbols.length) {
      throw new SyntaxError("Invalid symbol link");
    }
    const sym = this.#symbols[symbolId];
    if (sym == null) {
      throw new SyntaxError("Circular symbol link");
    }
    return sym;
  }

  #readObjectBody(): RObject {
    // Need to reserve one before className is read
    // because className may contain String as part of encoding.
    const linkId = this.#reserveLinkId();
    const className = this.#readSymbol();
    const numIvars = this.#readLength();
    const obj = this.#linkValueAt(linkId, new RObject(className));
    for (let i = 0; i < numIvars; i++) {
      const key = this.#readSymbol();
      const value = this.#readValue();
      const ivarName = RSymbol.asIvarName(key);
      if (ivarName == null) {
        throw new SyntaxError(
          `Not allowed as an instance variable name: ${key}`,
        );
      }
      if (ivarName in obj) {
        throw new SyntaxError(
          `Duplicate instance variable name: ${key}`,
        );
      }
      obj[ivarName] = value;
    }
    return obj;
  }

  #readArrayBody(): RArray {
    const numElems = this.#readLength();
    const arr = this.#linkValue(new RArray());
    for (let i = 0; i < numElems; i++) {
      arr.elements.push(this.#readValue());
    }
    return arr;
  }

  #reserveLinkId(): number {
    const linkId = this.#links.length;
    this.#links.push(undefined);
    return linkId;
  }

  #linkValueAt<T extends RValue>(linkId: number, value: T): T {
    this.#links[linkId] = value;
    return value;
  }

  #linkValue<T extends RValue>(value: T): T {
    this.#links.push(value);
    return value;
  }

  #readLink(): RValue {
    const linkId = this.#readLength();
    if (linkId >= this.#links.length) {
      throw new SyntaxError("Invalid link");
    }
    const value = this.#links[linkId];
    if (value == null) {
      throw new SyntaxError("Invalid circular link");
    }
    return value;
  }

  #readByteSlice(): Uint8Array {
    const length = this.#readLength();
    if (this.#pos + length > this.#buf.length) {
      throw new SyntaxError("Unexpected end of input");
    }
    const slice = this.#buf.subarray(this.#pos, this.#pos + length);
    this.#pos += length;
    return slice;
  }

  #readLength(): number {
    const value = this.#readFixnumBody();
    if (value < 0) {
      throw new SyntaxError("Received a negative integer");
    }
    return value;
  }

  #readFixnumBody(): number {
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
      } else if (value >= 0x40000000) {
        throw new SyntaxError("Incorrect Bignum representation as Fixnum");
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
      } else if (value < -0x40000000) {
        throw new SyntaxError("Incorrect Bignum representation as Fixnum");
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
