import {
  type MarshalArray,
  type MarshalBoolean,
  type MarshalDump,
  type MarshalDumpBytes,
  type MarshalDumpData,
  type MarshalFloat,
  type MarshalHash,
  type MarshalInteger,
  type MarshalModule,
  type MarshalNil,
  type MarshalObject,
  type MarshalRegexp,
  MarshalString,
  type MarshalStruct,
  type MarshalSymbol,
  type MarshalValue,
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

export function generate(value: MarshalValue): Uint8Array {
  const generator = new Generator();
  generator.writeTopLevel(value);
  return generator.result();
}

export function generateAll(values: Iterable<MarshalValue>): Uint8Array {
  const generator = new Generator();
  for (const value of values) {
    generator.writeTopLevel(value);
  }
  return generator.result();
}

class Generator {
  #buf = new Uint8Array(8);
  #pos = 0;
  #symbols!: Map<RSymbol, number>;
  #links!: Map<MarshalValue, number>;
  #nextLinkId!: number;
  #encodingNames!: Map<REncoding, MarshalString>;

  result(): Uint8Array {
    return this.#buf.subarray(0, this.#pos);
  }

  writeTopLevel(value: MarshalValue) {
    this.#symbols = new Map<RSymbol, number>();
    this.#links = new Map<MarshalValue, number>();
    this.#nextLinkId = 0;
    this.#encodingNames = new Map();
    this.#writeByte(MARSHAL_MAJOR);
    this.#writeByte(MARSHAL_MINOR);
    this.#writeValue(value);
  }

  #writeValue(value: MarshalValue) {
    switch (value.type) {
      case "NilClass":
        this.#writeNil(value);
        break;
      case "Boolean":
        this.#writeBoolean(value);
        break;
      case "Integer":
        this.#writeInteger(value);
        break;
      case "Float":
        this.#writeFloat(value);
        break;
      case "Symbol":
        this.#writeSymbol(value);
        break;
      case "Object":
        this.#writeObject(value);
        break;
      case "Array":
        this.#writeArray(value);
        break;
      case "Hash":
        this.#writeHash(value);
        break;
      case "String":
        this.#writeString(value);
        break;
      case "Regexp":
        this.#writeRegexp(value);
        break;
      case "#marshal_dump":
        this.#writeDump(value);
        break;
      case "#_dump":
        this.#writeDumpBytes(value);
        break;
      case "#_dump_data":
        this.#writeDumpData(value);
        break;
      case "Struct":
        this.#writeStruct(value);
        break;
      case "Module":
        this.#writeModule(value);
        break;
      default: {
        throw new Error(
          `Unsupported value type: ${(value as { type: "$invalid" }).type}`,
        );
      }
    }
  }

  #writeNil(_value: MarshalNil) {
    this.#writeByte(TYPE_NIL);
  }

  #writeBoolean(value: MarshalBoolean) {
    this.#writeByte(value.value ? TYPE_TRUE : TYPE_FALSE);
  }

  #writeInteger(value: MarshalInteger) {
    const num = value.value;
    if (-0x40000000n <= num && num < 0x40000000n) {
      this.#writeByte(TYPE_FIXNUM);
      this.#writeLong(Number(num));
      return;
    }
    if (this.#tryWriteLink(value)) {
      return;
    }

    this.#writeByte(TYPE_BIGNUM);
    this.#writeByte(num >= 0n ? SIGN_POSITIVE : SIGN_NEGATIVE);
    const abs = num >= 0n ? num : -num;
    let numWords = 0;
    {
      let current = abs;
      while (current > 0n) {
        numWords++;
        current >>= 16n;
      }
    }
    this.#writeLong(numWords);
    {
      let current = abs;
      for (let i = 0; i < numWords * 2; i++) {
        this.#writeByte(Number(current & 0xFFn));
        current >>= 8n;
      }
    }
  }

  #writeFloat(value: MarshalFloat) {
    if (this.#tryWriteLink(value)) {
      return;
    }
    const text = printNumber(value.value);
    const bytes = new TextEncoder().encode(text);
    this.#writeByte(TYPE_FLOAT);
    this.#writeBytes(bytes);
  }

  #writeSymbol(value: MarshalSymbol) {
    this.#writeSymbolValue(value.value);
  }
  #writeSymbolValue(value: RSymbol) {
    const symlinkId = this.#symbols.get(value);
    if (symlinkId != null) {
      this.#writeByte(TYPE_SYMLINK);
      this.#writeLong(symlinkId);
      return;
    }
    this.#symbols.set(value, this.#symbols.size);

    const encoding = RSymbol.encodingOf(value);
    const bytes = typeof value === "string"
      ? new TextEncoder().encode(value)
      : Uint8Array.from(value.bytes);
    if (
      encoding === REncoding.US_ASCII || encoding === REncoding.ASCII_8BIT
    ) {
      this.#writeByte(TYPE_SYMBOL);
      this.#writeBytes(bytes);
    } else {
      this.#writeByte(TYPE_IVAR);
      this.#writeByte(TYPE_SYMBOL);
      this.#writeBytes(bytes);
      this.#writeLong(1);
      this.#writeEncodingPair(encoding);
    }
  }

  #writeObject(value: MarshalObject) {
    if (this.#tryWriteLink(value)) {
      return;
    }
    const numIvars = this.#writeObjectHead(value);

    this.#writeByte(TYPE_OBJECT);
    this.#writeSymbolValue(value.className);
    this.#writeIvars(value, numIvars);
  }

  #writeArray(value: MarshalArray) {
    if (this.#tryWriteLink(value)) {
      return;
    }
    const numIvars = this.#writeObjectHead(value);

    this.#writeByte(TYPE_ARRAY);
    let length = +value.elements.length;
    this.#writeLong(length);
    for (const elem of value.elements) {
      --length;
      this.#writeValue(elem);
    }
    if (length !== 0) {
      throw new Error("Array length mismatch");
    }
    this.#writeIvars(value, numIvars);
  }

  #writeHash(value: MarshalHash) {
    if (this.#tryWriteLink(value)) {
      return;
    }
    const numIvars = this.#writeObjectHead(value);

    const defaultValue = value.defaultValue;
    this.#writeByte(
      defaultValue == null ? TYPE_HASH : TYPE_HASH_DEF,
    );
    let length = +value.entries.length;
    this.#writeLong(length);
    for (const [entryKey, entryValue] of value.entries) {
      --length;
      this.#writeValue(entryKey);
      this.#writeValue(entryValue);
    }
    if (length !== 0) {
      throw new Error("Hash length mismatch");
    }
    if (defaultValue != null) {
      this.#writeValue(defaultValue);
    }
    this.#writeIvars(value, numIvars);
  }

  #writeString(value: MarshalString) {
    if (this.#tryWriteLink(value)) {
      return;
    }
    const numIvars = this.#writeObjectHead(value);

    const bytes = value.bytes;
    if (!(bytes instanceof Uint8Array)) {
      throw new Error("Not a byte array");
    }

    this.#writeByte(TYPE_STRING);
    this.#writeBytes(bytes);
    this.#writeIvars(value, numIvars);
  }

  #writeRegexp(value: MarshalRegexp) {
    if (this.#tryWriteLink(value)) {
      return;
    }
    const numIvars = this.#writeObjectHead(value);

    const sourceBytes = value.sourceBytes;
    if (!(sourceBytes instanceof Uint8Array)) {
      throw new Error("Not a byte array");
    }

    this.#writeByte(TYPE_REGEXP);
    this.#writeBytes(sourceBytes);
    let flags = (value.ignoreCase ? 1 : 0) | (value.multiline ? 2 : 0) |
      (value.extended ? 4 : 0);
    if (value.ruby18Compat) {
      switch (value.encoding) {
        case REncoding.US_ASCII:
        case REncoding.ASCII_8BIT:
          if (value.noEncoding) {
            flags |= 0x10;
          }
          break;
        case REncoding.EUC_JP:
          flags |= 0x20;
          break;
        case REncoding.Windows_31J:
          flags |= 0x30;
          break;
        case REncoding.UTF_8:
          flags |= 0x40;
          break;
        default:
          throw new Error(
            `Invalid Regexp encoding with ruby18Compat: ${value.encoding.name}`,
          );
      }
    } else {
      if (
        (value.encoding !== REncoding.ASCII_8BIT &&
          value.encoding !== REncoding.US_ASCII) ||
        !value.sourceBytes.every((b) => b < 0x80)
      ) {
        flags |= 0x10;
      }
      if (value.noEncoding) {
        flags |= 0x20;
      }
    }
    this.#writeByte(flags);
    this.#writeIvars(value, numIvars);
  }

  #writeObjectHead(
    value:
      | MarshalObject
      | MarshalArray
      | MarshalHash
      | MarshalString
      | MarshalRegexp,
  ): number {
    let numIvars = value.ivars.size;
    switch (value.type) {
      case "Hash":
        if (value.ruby2Keywords) {
          ++numIvars;
        }
        break;
      case "String":
        if (value.encoding !== REncoding.ASCII_8BIT) {
          ++numIvars;
        }
        break;
      case "Regexp":
        if (value.encoding !== REncoding.ASCII_8BIT && !value.ruby18Compat) {
          ++numIvars;
        }
        break;
    }
    if (numIvars > 0 && value.type !== "Object") {
      this.#writeByte(TYPE_IVAR);
    }
    for (const extender of value.extenders) {
      this.#writeByte(TYPE_EXTENDED);
      this.#writeSymbolValue(extender);
    }
    if (value.type !== "Object" && value.className != null) {
      this.#writeByte(TYPE_UCLASS);
      this.#writeSymbolValue(value.className);
    }
    return numIvars;
  }

  #writeIvars(
    value:
      | MarshalObject
      | MarshalArray
      | MarshalHash
      | MarshalString
      | MarshalRegexp,
    numIvars: number,
  ) {
    if (value.type !== "Object" && numIvars === 0) {
      return;
    }
    this.#writeLong(numIvars);
    switch (value.type) {
      case "Hash":
        if (value.ruby2Keywords) {
          --numIvars;
          this.#writeSymbolValue("K");
          this.#writeByte(TYPE_TRUE);
        }
        break;
      case "String":
        if (value.encoding !== REncoding.ASCII_8BIT) {
          --numIvars;
          this.#writeEncodingPair(value.encoding);
        }
        break;
      case "Regexp":
        if (value.encoding !== REncoding.ASCII_8BIT && !value.ruby18Compat) {
          --numIvars;
          this.#writeEncodingPair(value.encoding);
        }
        break;
    }
    for (const [key, val] of value.ivars) {
      --numIvars;
      this.#writeSymbolValue(key);
      this.#writeValue(val);
    }
    if (numIvars !== 0) {
      throw new Error("Ivar count mismatch");
    }
  }

  #writeEncodingPair(enc: REncoding) {
    if (enc === REncoding.ASCII_8BIT) {
      throw new Error("ASCII-8BIT should not be encoded explicitly");
    }
    if (
      enc === REncoding.UTF_8 ||
      enc === REncoding.US_ASCII
    ) {
      this.#writeSymbolValue("E");
      this.#writeByte(
        enc === REncoding.UTF_8 ? TYPE_TRUE : TYPE_FALSE,
      );
    } else {
      this.#writeSymbolValue("encoding");
      this.#writeEncodingName(enc);
    }
  }

  #writeEncodingName(enc: REncoding) {
    let name = this.#encodingNames.get(enc);
    if (name == null) {
      name = MarshalString(
        new TextEncoder().encode(enc.name),
        REncoding.ASCII_8BIT,
      );
      this.#encodingNames.set(enc, name);
    }
    this.#writeString(name);
  }

  #writeDump(value: MarshalDump) {
    if (this.#tryWriteLink(value)) {
      return;
    }
    this.#writeByte(TYPE_USRMARSHAL);
    this.#writeSymbolValue(value.className);
    this.#writeValue(value.dump);
  }

  #writeDumpBytes(value: MarshalDumpBytes) {
    if (this.#tryWriteLink(value)) {
      return;
    }
    if (value.encoding === REncoding.ASCII_8BIT) {
      this.#writeByte(TYPE_USERDEF);
      this.#writeSymbolValue(value.className);
      this.#writeBytes(value.bytes);
    } else {
      this.#writeByte(TYPE_IVAR);
      this.#writeByte(TYPE_USERDEF);
      this.#writeSymbolValue(value.className);
      this.#writeBytes(value.bytes);
      this.#writeLong(1);
      this.#writeEncodingPair(value.encoding);
    }
  }

  #writeDumpData(value: MarshalDumpData) {
    if (this.#tryWriteLink(value)) {
      return;
    }
    this.#writeByte(TYPE_DATA);
    this.#writeSymbolValue(value.className);
    this.#writeValue(value.dump);
  }

  #writeStruct(value: MarshalStruct) {
    if (this.#tryWriteLink(value)) {
      return;
    }
    this.#writeByte(TYPE_STRUCT);
    this.#writeSymbolValue(value.className);
    let numEntries = +value.entries.length;
    this.#writeLong(numEntries);
    for (const [eKey, eValue] of value.entries) {
      --numEntries;
      this.#writeSymbolValue(eKey);
      this.#writeValue(eValue);
    }
    if (numEntries !== 0) {
      throw new Error("Struct length mismatch");
    }
  }

  #writeModule(value: MarshalModule) {
    if (this.#tryWriteLink(value)) {
      return;
    }
    switch (value.kind) {
      case "class":
        this.#writeByte(TYPE_CLASS);
        break;
      case "module":
        this.#writeByte(TYPE_MODULE);
        break;
      case "legacy":
        this.#writeByte(TYPE_MODULE_OLD);
        break;
      default:
        throw new Error("Invalid kind");
    }
    const enc = RSymbol.encodingOf(value.moduleName);
    if (enc !== REncoding.US_ASCII && enc !== REncoding.ASCII_8BIT) {
      throw new Error(`Non-serializable encoding for Module: ${enc.name}`);
    }
    this.#writeBytes(RSymbol.bytesOf(value.moduleName));
  }

  #tryWriteLink(value: MarshalValue): boolean {
    const linkId = this.#links.get(value);
    if (linkId != null) {
      this.#writeByte(TYPE_LINK);
      this.#writeLong(linkId);
      return true;
    }

    this.#links.set(value, this.#nextLinkId++);
    return false;
  }

  #writeBytes(bytes: Uint8Array) {
    this.#writeLong(bytes.length);
    this.#reserve(this.#pos + bytes.length);
    this.#buf.set(bytes, this.#pos);
    this.#pos += bytes.length;
  }

  #writeLong(value: number) {
    if (value < -0x80000000 || value >= 0x80000000) {
      throw new RangeError("Value out of range");
    }
    if (value === 0) {
      this.#writeByte(0);
      return;
    }
    if (value > 0) {
      let byteSize: number;
      if (value < 123) {
        this.#writeByte(value + 5);
        return;
      } else if (value < 0x100) {
        byteSize = 1;
      } else if (value < 0x10000) {
        byteSize = 2;
      } else if (value < 0x1000000) {
        byteSize = 3;
      } else {
        byteSize = 4;
      }
      this.#writeByte(byteSize);
      let current = value;
      for (let i = 0; i < byteSize; i++) {
        this.#writeByte(current & 0xFF);
        current >>= 8;
      }
    } else {
      let byteSize: number;
      if (value >= -123) {
        this.#writeByte(value + 251);
        return;
      } else if (value >= -0x100) {
        byteSize = 1;
      } else if (value >= -0x10000) {
        byteSize = 2;
      } else if (value >= -0x1000000) {
        byteSize = 3;
      } else {
        byteSize = 4;
      }
      this.#writeByte(256 - byteSize);
      let current = value + 256 ** byteSize;
      for (let i = 0; i < byteSize; i++) {
        this.#writeByte(current & 0xFF);
        current >>= 8;
      }
    }
  }

  #writeByte(byte: number) {
    this.#reserve(this.#pos + 1);
    this.#buf[this.#pos++] = byte;
  }

  #reserve(demand: number) {
    if (demand <= this.#buf.length) {
      return;
    }
    const newCap = Math.max(
      this.#buf.length + (this.#buf.length >> 1),
      demand,
    );
    // deno-lint-ignore no-explicit-any
    if ((ArrayBuffer as any).prototype.transfer) {
      // deno-lint-ignore no-explicit-any
      const newAB = (this.#buf.buffer as any).transfer(newCap);
      this.#buf = new Uint8Array(newAB);
    } else {
      const newBuf = new Uint8Array(newCap);
      newBuf.set(this.#buf);
      this.#buf = newBuf;
    }
  }
}

function printNumber(value: number): string {
  if (Number.isNaN(value)) {
    return "nan";
  } else if (value === Infinity) {
    return "inf";
  } else if (value === -Infinity) {
    return "-inf";
  } else if (value === 0) {
    return Object.is(value, -0) ? "-0" : "0";
  }

  const signPart = value < 0 ? "-" : "";
  const [fracPointText, expText] = Math.abs(value).toExponential().split("e");
  const exp = Number(expText);
  const frac = fracPointText.replace(".", "");

  if (exp + 1 === frac.length) {
    // Integral representation
    return signPart + frac;
  } else if (exp + 1 < frac.length && exp >= -4) {
    // Fractional non-scientific representation
    if (exp < 0) {
      return signPart + "0." + "0".repeat(-exp - 1) + frac;
    } else {
      return signPart + frac.slice(0, exp + 1) + "." +
        frac.slice(exp + 1);
    }
  } else {
    // Scientific representation, but uses "e" for "e+"
    if (frac.length > 1) {
      return signPart + frac[0] + "." + frac.slice(1) + "e" + exp;
    } else {
      return signPart + frac + "e" + exp;
    }
  }
}
