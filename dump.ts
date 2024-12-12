import {
  MARSHAL_MAJOR,
  MARSHAL_MINOR,
  RObjectLike,
  SIGN_NEGATIVE,
  SIGN_POSITIVE,
  TYPE_ARRAY,
  TYPE_BIGNUM,
  TYPE_FALSE,
  TYPE_FIXNUM,
  TYPE_FLOAT,
  TYPE_HASH,
  TYPE_HASH_DEF,
  TYPE_IVAR,
  TYPE_LINK,
  TYPE_NIL,
  TYPE_OBJECT,
  TYPE_STRING,
  TYPE_SYMBOL,
  TYPE_SYMLINK,
  TYPE_TRUE,
} from "./marshal-common.ts";
import {
  RArray,
  REncoding,
  RExoticSymbol,
  RHash,
  RObject,
  RString,
  RSymbol,
  type RValue,
} from "./rom.ts";

export function dump(value: RValue): Uint8Array {
  const dumper = new Dumper();
  dumper.writeTopLevel(value);
  return dumper.result();
}

export function dumpAll(values: RValue[]): Uint8Array {
  const dumper = new Dumper();
  for (const value of values) {
    dumper.writeTopLevel(value);
  }
  return dumper.result();
}

class Dumper {
  #buf = new Uint8Array(8);
  #pos = 0;
  #symbols!: Map<RSymbol, number>;
  #links!: Map<RValue, number>;
  #nextLinkId!: number;

  result(): Uint8Array {
    return this.#buf.subarray(0, this.#pos);
  }

  writeTopLevel(value: RValue) {
    this.#symbols = new Map<RSymbol, number>();
    this.#links = new Map<RValue, number>();
    this.#nextLinkId = 0;
    this.#writeByte(MARSHAL_MAJOR);
    this.#writeByte(MARSHAL_MINOR);
    this.#writeValue(value);
  }

  #writeValue(value: RValue) {
    if (value === null) {
      this.#writeByte(TYPE_NIL);
    } else if (typeof value === "boolean") {
      this.#writeByte(value ? TYPE_TRUE : TYPE_FALSE);
    } else if (typeof value === "bigint") {
      if (-0x40000000n <= value && value < 0x40000000n) {
        this.#writeByte(TYPE_FIXNUM);
        this.#writeFixnum(Number(value));
      } else {
        this.#nextLinkId++;
        this.#writeByte(TYPE_BIGNUM);
        this.#writeBignum(value);
      }
    } else if (typeof value === "number") {
      this.#nextLinkId++;
      this.#writeByte(TYPE_FLOAT);
      this.#writeFloat(value);
    } else if (typeof value === "string") {
      this.#writeSymbolObject(value);
    } else if (value instanceof RExoticSymbol) {
      this.#writeSymbolObject(value);
    } else {
      const linkId = this.#links.get(value);
      if (linkId != null) {
        this.#writeByte(TYPE_LINK);
        this.#writeFixnum(linkId);
        return;
      }
      this.#links.set(value, this.#nextLinkId++);
      if (
        value instanceof RObject ||
        value instanceof RArray ||
        value instanceof RHash ||
        value instanceof RString
      ) {
        this.#writeObjectLike(value);
      } else {
        throw new TypeError(`Unsupported type: ${typeof value}`);
      }
    }
  }

  #writeBignum(value: bigint) {
    if (value >= 0n) {
      this.#writeByte(SIGN_POSITIVE);
    } else {
      this.#writeByte(SIGN_NEGATIVE);
      value = -value;
    }
    let numWords = 0;
    {
      let current = value;
      while (current > 0n) {
        numWords++;
        current >>= 16n;
      }
    }
    this.#writeFixnum(numWords);
    for (let i = 0; i < numWords * 2; i++) {
      this.#writeByte(Number(value & 0xFFn));
      value >>= 8n;
    }
  }

  #writeFloat(value: number) {
    const text = printNumber(value);
    const bytes = new TextEncoder().encode(text);
    this.#writeBytes(bytes);
  }

  #writeSymbolObject(value: RSymbol) {
    const symlinkId = this.#symbols.get(value);
    if (symlinkId != null) {
      this.#writeByte(TYPE_SYMLINK);
      this.#writeFixnum(symlinkId);
      return;
    }
    this.#symbols.set(value, this.#symbols.size);

    const encoding = RSymbol.encodingOf(value);
    const bytes = typeof value === "string"
      ? new TextEncoder().encode(value)
      : Uint8Array.from(value.bytes);
    if (encoding === REncoding.US_ASCII || encoding === REncoding.ASCII_8BIT) {
      this.#writeByte(TYPE_SYMBOL);
      this.#writeBytes(bytes);
    } else {
      this.#writeByte(TYPE_IVAR);
      this.#writeByte(TYPE_SYMBOL);
      this.#writeBytes(bytes);
      this.#writeFixnum(1);
      if (encoding === REncoding.UTF_8) {
        this.#writeSymbolObject("E");
        this.#writeByte(TYPE_TRUE);
      } else {
        this.#writeSymbolObject("encoding");
        throw new Error("TODO: exotic enodings");
      }
    }
  }

  #writeObjectLike(value: RObjectLike) {
    const numIvars = this.#numIvars(value);
    if (numIvars > 0 && !(value instanceof RObject)) {
      this.#writeByte(TYPE_IVAR);
    }
    if (value instanceof RArray) {
      this.#writeArray(value);
    } else if (value instanceof RHash) {
      this.#writeHash(value);
    } else if (value instanceof RString) {
      this.#writeString(value);
    } else {
      this.#writeObject(value);
    }
    if (numIvars > 0 || value instanceof RObject) {
      this.#writeIvars(value, numIvars);
    }
  }

  #writeObject(value: RObject) {
    this.#writeByte(TYPE_OBJECT);
    this.#writeSymbolObject(value.className);
    // ivars are handled in #writeObjectLike
  }

  #writeArray(value: RArray) {
    if (value.className !== "Array") {
      throw new Error("TODO: subclass of Array");
    }

    this.#writeByte(TYPE_ARRAY);
    let length = +value.elements.length;
    this.#writeFixnum(length);
    for (const elem of value.elements) {
      --length;
      this.#writeValue(elem);
    }
    if (length !== 0) {
      throw new Error("Array length mismatch");
    }
  }

  #writeHash(value: RHash) {
    if (value.className !== "Hash") {
      throw new Error("TODO: subclass of Hash");
    }

    const defaultValue = value.defaultValue;

    this.#writeByte(defaultValue == null ? TYPE_HASH : TYPE_HASH_DEF);
    let length = +value.entries.length;
    this.#writeFixnum(length);
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
  }

  #writeString(value: RString) {
    if (value.className !== "String") {
      throw new Error("TODO: subclass of String");
    }

    const bytes = value.bytes;
    if (!(bytes instanceof Uint8Array)) {
      throw new Error("Not a byte array");
    }

    this.#writeByte(TYPE_STRING);
    this.#writeBytes(bytes);
  }

  #numIvars(value: RObjectLike): number {
    let numIvars = value.numIvars;
    if (value instanceof RString && value.encoding !== REncoding.ASCII_8BIT) {
      numIvars++;
    }
    return numIvars;
  }

  #writeIvars(value: RObjectLike, numIvars: number) {
    this.#writeFixnum(numIvars);
    if (value instanceof RString && value.encoding !== REncoding.ASCII_8BIT) {
      --numIvars;
      if (
        value.encoding === REncoding.UTF_8 ||
        value.encoding === REncoding.US_ASCII
      ) {
        this.#writeSymbolObject("E");
        this.#writeByte(
          value.encoding === REncoding.UTF_8 ? TYPE_TRUE : TYPE_FALSE,
        );
      } else {
        this.#writeSymbolObject("encoding");
        throw new Error("TODO: exotic enodings");
      }
    }
    for (const [key, val] of value.ivars()) {
      --numIvars;
      this.#writeSymbolObject(key);
      this.#writeValue(val);
    }
    if (numIvars !== 0) {
      throw new Error("Ivar count mismatch");
    }
  }

  #writeBytes(bytes: Uint8Array) {
    this.#writeFixnum(bytes.length);
    this.#reserve(this.#pos + bytes.length);
    this.#buf.set(bytes, this.#pos);
    this.#pos += bytes.length;
  }

  #writeFixnum(value: number) {
    if (value < -0x40000000 || value >= 0x40000000) {
      throw new RangeError("Out of range fixnum");
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
    const newCap = Math.max(this.#buf.length + (this.#buf.length >> 1), demand);
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
      return signPart + frac.slice(0, exp + 1) + "." + frac.slice(exp + 1);
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
