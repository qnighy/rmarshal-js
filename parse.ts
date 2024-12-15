import { MarshalArray } from "./ast.ts";
import { MarshalHash } from "./ast.ts";
import { MarshalRegexp } from "./ast.ts";
import { MarshalString } from "./ast.ts";
import {
  MarshalBoolean,
  MarshalFloat,
  MarshalInteger,
  MarshalNil,
  MarshalObject,
  MarshalSymbol,
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
import { REncoding, RSymbol } from "./rom.ts";

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
  #symbols!: (RSymbol | undefined)[];
  #visitedSymbols!: Set<RSymbol>;

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
    this.#symbols = [];
    this.#visitedSymbols = new Set();
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
        return this.#readFloatBody();
      case TYPE_SYMBOL:
        return this.#readSymbolBody(false);
      case TYPE_SYMLINK:
        return this.#readSymbolLinkBody();
      case TYPE_IVAR:
        return this.#readIvarBody();
      case TYPE_EXTENDED:
        return this.#readExtendedBody(false);
      case TYPE_UCLASS:
        return this.#readUClassBody(false, []);
      case TYPE_OBJECT:
        return this.#readObjectBody(false, []);
      case TYPE_ARRAY:
        return this.#readArrayBody(false, [], undefined);
      case TYPE_HASH:
        return this.#readHashBody(false, [], undefined, false);
      case TYPE_HASH_DEF:
        return this.#readHashBody(false, [], undefined, true);
      case TYPE_STRING:
        return this.#readStringBody(false, [], undefined);
      case TYPE_REGEXP:
        return this.#readRegexpBody(false, [], undefined);
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

  #readSymbol(): MarshalSymbol {
    const type = this.#readByte();
    switch (type) {
      case TYPE_SYMBOL:
        return this.#readSymbolBody(false);
      case TYPE_SYMLINK:
        return this.#readSymbolLinkBody();
      case TYPE_IVAR:
        return this.#readIvarBodyAsSymbol();
      default:
        throw new SyntaxError(`${describeType(type)} cannot be a Symbol`);
    }
  }

  #readIvarBody(): MarshalValue {
    const type = this.#readByte();
    switch (type) {
      case TYPE_SYMBOL:
        return this.#readSymbolBody(true);
      case TYPE_IVAR:
        throw new SyntaxError("Nested instance variable container");
      case TYPE_EXTENDED:
        return this.#readExtendedBody(true);
      case TYPE_UCLASS:
        return this.#readUClassBody(true, []);
      case TYPE_ARRAY:
        return this.#readArrayBody(true, [], undefined);
      case TYPE_HASH:
        return this.#readHashBody(true, [], undefined, false);
      case TYPE_HASH_DEF:
        return this.#readHashBody(true, [], undefined, true);
      case TYPE_STRING:
        return this.#readStringBody(true, [], undefined);
      case TYPE_REGEXP:
        return this.#readRegexpBody(true, [], undefined);
      case TYPE_USERDEF:
        throw new Error(`TODO: not implemented yet: ${describeType(type)}`);
      default:
        throw new SyntaxError(
          `${describeType(type)} cannot include instance variables`,
        );
    }
  }

  #readIvarBodyAsSymbol(): MarshalSymbol {
    const type = this.#readByte();
    switch (type) {
      case TYPE_SYMBOL:
        return this.#readSymbolBody(true);
      case TYPE_IVAR:
        throw new SyntaxError("Nested instance variable container");
      case TYPE_ARRAY:
      case TYPE_HASH:
      case TYPE_HASH_DEF:
      case TYPE_STRING:
      case TYPE_REGEXP:
      case TYPE_USERDEF:
        throw new SyntaxError(`${describeType(type)} cannot be a Symbol`);
      default:
        throw new SyntaxError(
          `${describeType(type)} cannot include instance variables`,
        );
    }
  }

  #readExtendedBody(hasIvar: boolean): MarshalValue {
    const extenders: RSymbol[] = [];
    while (true) {
      const extender = this.#readSymbol().value;
      extenders.push(extender);

      const type = this.#readByte();
      switch (type) {
        case TYPE_IVAR:
          throw new SyntaxError("Invalid nest order: e -> I");
        case TYPE_EXTENDED:
          continue;
        case TYPE_UCLASS:
          return this.#readUClassBody(hasIvar, extenders);
        case TYPE_OBJECT:
          return this.#readObjectBody(hasIvar, extenders);
        case TYPE_ARRAY:
          return this.#readArrayBody(hasIvar, extenders, undefined);
        case TYPE_HASH:
          return this.#readHashBody(hasIvar, extenders, undefined, false);
        case TYPE_HASH_DEF:
          return this.#readHashBody(hasIvar, extenders, undefined, true);
        case TYPE_STRING:
          return this.#readStringBody(hasIvar, extenders, undefined);
        case TYPE_REGEXP:
          return this.#readRegexpBody(hasIvar, extenders, undefined);
        default:
          throw new SyntaxError(
            `${describeType(type)} cannot include extenders`,
          );
      }
    }
  }

  #readUClassBody(hasIvar: boolean, extenders: RSymbol[]): MarshalValue {
    const className = this.#readSymbol().value;
    const type = this.#readByte();
    switch (type) {
      case TYPE_IVAR:
        throw new SyntaxError("Invalid nest order: C -> I");
      case TYPE_EXTENDED:
        throw new SyntaxError("Invalid nest order: C -> e");
      case TYPE_UCLASS:
        throw new SyntaxError("Nested custom AHSR subclass name");
      case TYPE_OBJECT:
        throw new SyntaxError("Invalid nesting: C -> o");
      case TYPE_ARRAY:
        return this.#readArrayBody(hasIvar, extenders, className);
      case TYPE_HASH:
        return this.#readHashBody(hasIvar, extenders, className, false);
      case TYPE_HASH_DEF:
        return this.#readHashBody(hasIvar, extenders, className, true);
      case TYPE_STRING:
        return this.#readStringBody(hasIvar, extenders, className);
      case TYPE_REGEXP:
        return this.#readRegexpBody(hasIvar, extenders, className);
      default:
        throw new SyntaxError(
          `${
            describeType(type)
          } cannot be a subclass of Array/Hash/String/Regexp`,
        );
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

  #readFloatBody(): MarshalValue {
    const text = new TextDecoder().decode(this.#readByteSlice());
    // Ruby >= 1.8 emits "inf", "-inf", or "nan" for non-finite numbers
    // but Ruby < 1.8 uses sprintf(3) with "%.16g",
    // whose definition in Open Group states:
    //
    // - Infinity can be either "inf" or "infinity"
    // - Negative infinity can be either "-inf" or "-infinity"
    // - NaN can be either "nan" or "-nan" possibly followed
    //   by any sequence of characters wrapped in parentheses.
    // https://pubs.opengroup.org/onlinepubs/009695399/functions/sprintf.html
    switch (text) {
      case "inf":
      case "infinity":
        return MarshalFloat(Infinity);
      case "-inf":
      case "-infinity":
        return MarshalFloat(-Infinity);
      case "nan":
      case "-nan":
        return MarshalFloat(NaN);
      default:
        if (
          (text.startsWith("nan(") || text.startsWith("-nan(")) &&
          text.endsWith(")")
        ) {
          return MarshalFloat(NaN);
        }
    }
    if (
      /^-?(?:(?:[1-9][0-9]*|0)(?:\.[0-9]*[1-9])?|[1-9](?:\.[0-9]*[1-9])?e[\-+]?[1-9][0-9]*)$/
        .test(text)
    ) {
      return MarshalFloat(Number(text));
    } else {
      throw new SyntaxError("Invalid Float format");
    }
  }

  #readSymbolBody(hasIvar: boolean): MarshalSymbol {
    const symbolId = this.#symbols.length;
    this.#symbols.push(undefined);

    const sym = this.#readSymbolBodyImpl(hasIvar);
    this.#symbols[symbolId] = sym;
    if (this.#visitedSymbols.has(sym)) {
      throw new SyntaxError("Same symbol appeared twice");
    }
    this.#visitedSymbols.add(sym);
    return MarshalSymbol(sym);
  }

  #readSymbolBodyImpl(hasIvar: boolean): RSymbol {
    const bytes = this.#readByteSlice();
    if (!hasIvar) {
      return RSymbol(bytes, REncoding.ASCII_8BIT);
    }
    const ivars = this.#readIvars();
    if (ivars.size === 0) {
      throw new SyntaxError("Redundant ivar container with no ivars");
    }
    const encoding = this.#interpretEncoding(ivars);
    if (ivars.size > 0) {
      throw new SyntaxError("Extra ivars for Symbol");
    }
    if (encoding === REncoding.US_ASCII) {
      throw new SyntaxError("Invalid explicit encoding: US-ASCII");
    }
    const sym = RSymbol(bytes, encoding);
    if (RSymbol.encodingOf(sym) !== encoding) {
      throw new SyntaxError("Redundant encoding specifier in ASCII Symbol");
    }
    return sym;
  }

  #readSymbolLinkBody(): MarshalSymbol {
    const symbolId = this.#readIndex();
    if (symbolId >= this.#symbols.length) {
      throw new SyntaxError("Invalid symbol link");
    }
    const sym = this.#symbols[symbolId];
    if (sym == null) {
      throw new SyntaxError("Circular symbol link");
    }
    return MarshalSymbol(sym);
  }

  #readObjectBody(
    hasRedundantIvar: boolean,
    extenders: RSymbol[],
  ): MarshalValue {
    if (hasRedundantIvar) {
      throw new SyntaxError(
        `${describeType(TYPE_OBJECT)} cannot have instance variables`,
      );
    }
    const className = this.#readSymbol().value;
    const numIvars = this.#readIndex();
    const ivars = new Map<RSymbol, MarshalValue>();
    for (let i = 0; i < numIvars; i++) {
      const key = this.#readSymbol().value;
      const value = this.#readValue();
      if (ivars.has(key)) {
        throw new SyntaxError("Duplicate instance variables");
      }
      ivars.set(key, value);
    }
    return MarshalObject(className, ivars, { extenders });
  }

  #readArrayBody(
    hasIvar: boolean,
    extenders: RSymbol[],
    className: RSymbol | undefined,
  ): MarshalValue {
    const numElems = this.#readIndex();
    const elems: MarshalValue[] = [];
    for (let i = 0; i < numElems; i++) {
      elems.push(this.#readValue());
    }
    const ivars = this.#readAHSRIvars(hasIvar);
    return MarshalArray(elems, { className, ivars, extenders });
  }

  #readHashBody(
    hasIvar: boolean,
    extenders: RSymbol[],
    className: RSymbol | undefined,
    hasDefault: boolean,
  ): MarshalValue {
    const numEntries = this.#readIndex();
    const entries: [MarshalValue, MarshalValue][] = [];
    for (let i = 0; i < numEntries; i++) {
      const key = this.#readValue();
      const value = this.#readValue();
      entries.push([key, value]);
    }
    const defaultValue = hasDefault ? this.#readValue() : undefined;
    if (defaultValue?.type === "NilClass") {
      throw new SyntaxError("Invalid default value of Hash: explicit nil");
    }
    const ivars = this.#readAHSRIvars(hasIvar);
    let ruby2Keywords = false;
    if (ivars.has("K")) {
      const k = ivars.get("K")!;
      ivars.delete("K");
      if (k.type === "Boolean" && k.value) {
        ruby2Keywords = true;
      } else {
        throw new SyntaxError("Invalid K value");
      }
    }
    return MarshalHash(entries, {
      defaultValue,
      ruby2Keywords,
      className,
      ivars,
      extenders,
    });
  }

  #readStringBody(
    hasIvar: boolean,
    extenders: RSymbol[],
    className: RSymbol | undefined,
  ): MarshalValue {
    const bytes = this.#readByteSlice();
    const ivars = this.#readAHSRIvars(hasIvar);
    const encoding = this.#hasEncoding(ivars)
      ? this.#interpretEncoding(ivars)
      : REncoding.ASCII_8BIT;
    return MarshalString(bytes, encoding, { className, ivars, extenders });
  }

  #readRegexpBody(
    hasIvar: boolean,
    extenders: RSymbol[],
    className: RSymbol | undefined,
  ): MarshalValue {
    const sourceBytes = this.#readByteSlice();
    const flags = this.#readByte();
    const ignoreCase = Boolean(flags & 0x01);
    const multiline = Boolean(flags & 0x02);
    const extended = Boolean(flags & 0x04);
    const ivars = this.#readAHSRIvars(hasIvar);
    const encoding = this.#hasEncoding(ivars)
      ? this.#interpretEncoding(ivars)
      : REncoding.ASCII_8BIT;
    if (encoding === REncoding.ASCII_8BIT && (flags & 0x50) !== 0x10) {
      // Interpret it as dump from Ruby 1.8
      let noEncoding = false;
      let ruby18Encoding: REncoding;
      switch (flags & 0x70) {
        case 0x00:
          ruby18Encoding = sourceBytes.every((b) => b < 0x80)
            ? REncoding.US_ASCII
            // Indicates $KCODE
            : REncoding.ASCII_8BIT;
          break;
        case 0x10:
          ruby18Encoding = sourceBytes.every((b) => b < 0x80)
            ? REncoding.US_ASCII
            : REncoding.ASCII_8BIT;
          noEncoding = true;
          break;
        case 0x20:
          ruby18Encoding = REncoding.EUC_JP;
          break;
        case 0x30:
          ruby18Encoding = REncoding.Windows_31J;
          break;
        case 0x40:
          ruby18Encoding = REncoding.UTF_8;
          break;
        default:
          throw new SyntaxError("Invalid Kanji code flags for Ruby 1.8 Regexp");
      }
      if (flags & 0x88) {
        throw new SyntaxError("Invalid flags for Ruby 1.8 Regexp");
      }
      return MarshalRegexp(sourceBytes, ruby18Encoding, {
        ignoreCase,
        multiline,
        extended,
        noEncoding,
        ruby18Compat: true,
        className,
        ivars,
        extenders,
      });
    }

    const noEncoding = Boolean(flags & 0x20);
    const fixedEncoding = Boolean(flags & 0x10);
    const expectFixedEncoding = encoding !== REncoding.US_ASCII;
    if (fixedEncoding !== expectFixedEncoding) {
      throw new SyntaxError(
        `Invalid FIXEDENCODING flag value (expected ${expectFixedEncoding})`,
      );
    }
    if (flags & 0xC8) {
      throw new SyntaxError("Invalid flags for Regexp");
    }
    return MarshalRegexp(sourceBytes, encoding, {
      ignoreCase,
      multiline,
      extended,
      noEncoding,
      ruby18Compat: false,
      className,
      ivars,
      extenders,
    });
  }

  #readAHSRIvars(hasIvar: boolean): Map<RSymbol, MarshalValue> {
    if (!hasIvar) {
      return new Map();
    }
    const ivars = this.#readIvars();
    if (ivars.size === 0) {
      throw new SyntaxError("Redundant ivar container with no ivars");
    }
    return ivars;
  }

  #readIvars(): Map<RSymbol, MarshalValue> {
    const numIvars = this.#readIndex();
    const ivars = new Map<RSymbol, MarshalValue>();
    let allowSpecialVars = true;
    for (let i = 0; i < numIvars; i++) {
      const key = this.#readSymbol().value;
      const value = this.#readValue();
      if (ivars.has(key)) {
        throw new SyntaxError("Duplicate instance variables");
      }
      const isSpecialVar = key === "E" || key === "encoding" || key === "K";
      if (isSpecialVar && !allowSpecialVars) {
        throw new SyntaxError("Special instance variable must come first");
      } else if (!isSpecialVar) {
        allowSpecialVars = false;
      }
      ivars.set(key, value);
    }
    return ivars;
  }

  #hasEncoding(ivars: Map<RSymbol, MarshalValue>): boolean {
    return ivars.has("E") || ivars.has("encoding");
  }

  #interpretEncoding(ivars: Map<RSymbol, MarshalValue>): REncoding {
    const hasE = ivars.has("E");
    const hasEncoding = ivars.has("encoding");
    if (hasE && hasEncoding) {
      throw new SyntaxError("Cannot have both E and encoding");
    } else if (hasE) {
      const e = ivars.get("E")!;
      ivars.delete("E");
      if (e.type === "Boolean") {
        return e.value ? REncoding.UTF_8 : REncoding.US_ASCII;
      } else {
        throw new SyntaxError("Invalid short encoding specifier");
      }
    } else if (hasEncoding) {
      throw Error("TODO: Symbol with encoding");
    } else {
      throw new SyntaxError("Not an encoding ivar");
    }
  }

  #readByteSlice(): Uint8Array {
    const length = this.#readIndex();
    if (this.#pos + length > this.#buf.length) {
      throw new SyntaxError("Unexpected end of input");
    }
    const slice = this.#buf.subarray(this.#pos, this.#pos + length);
    this.#pos += length;
    return slice;
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
