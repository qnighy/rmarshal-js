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
        throw new Error(`TODO: BigInt`);
      }
    } else {
      throw new TypeError(`Unsupported type: ${typeof value}`);
    }
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
