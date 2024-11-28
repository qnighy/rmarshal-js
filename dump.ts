import type { RObject } from "./rom.ts";

const MARSHAL_MAJOR = 4;
const MARSHAL_MINOR = 8;

export function dump(value: RObject): Uint8Array {
  const dumper = new Dumper();
  dumper.writeTopLevel(value);
  return dumper.result();
}

export function dumpAll(values: RObject[]): Uint8Array {
  const dumper = new Dumper();
  for (const value of values) {
    dumper.writeTopLevel(value);
  }
  return dumper.result();
}

class Dumper {
  #buf = new Uint8Array(8);
  #pos = 0;

  result(): Uint8Array {
    return this.#buf.subarray(0, this.#pos);
  }

  writeTopLevel(value: RObject) {
    this.#writeByte(MARSHAL_MAJOR);
    this.#writeByte(MARSHAL_MINOR);
    this.#writeObject(value);
  }

  #writeObject(value: RObject) {
    if (value === null) {
      this.#writeByte(0x30); // '0'
    } else if (typeof value === "boolean") {
      this.#writeByte(value ? 0x54 : 0x46); // 'T' or 'F'
    } else if (typeof value === "bigint") {
      if (-0x40000000n <= value && value < 0x40000000n) {
        this.#writeByte(0x69); // 'i'
        this.#writeFixnum(Number(value));
      } else {
        this.#writeByte(0x6C); // 'l'
        this.#writeBignum(value);
      }
    } else if (typeof value === "number") {
      this.#writeByte(0x66); // 'f'
      this.#writeFloat(value);
    } else {
      throw new TypeError(`Unsupported type: ${typeof value}`);
    }
  }

  #writeBignum(value: bigint) {
    if (value >= 0n) {
      this.#writeByte(0x2B); // '+'
    } else {
      this.#writeByte(0x2D); // '-'
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
