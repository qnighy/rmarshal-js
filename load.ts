import { type RObject } from "./rom.ts";

const MARSHAL_MAJOR = 4;
const MARSHAL_MINOR = 8;

export function load(buf: Uint8Array): RObject {
  const loader = new Loader(buf);
  const value = loader.readTopLevel();
  if (loader.rest().length > 0) {
    throw new SyntaxError("Unexpected trailing data");
  }
  return value;
}
export function loadStream(buf: Uint8Array): [RObject, Uint8Array] {
  const loader = new Loader(buf);
  const value = loader.readTopLevel();
  return [value, loader.rest()];
}

export class Loader {
  #buf: Uint8Array;
  #pos = 0;

  constructor(buf: Uint8Array) {
    this.#buf = buf;
  }

  rest(): Uint8Array {
    return this.#buf.subarray(this.#pos);
  }

  readTopLevel(): RObject {
    const major = this.#readByte();
    const minor = this.#readByte();
    if (major !== MARSHAL_MAJOR || minor > MARSHAL_MINOR) {
      throw new SyntaxError(
        `Unsupported marshal version: ${major}.${minor} (expected ${MARSHAL_MAJOR}.0 to ${MARSHAL_MAJOR}.${MARSHAL_MINOR})`,
      );
    }
    return this.#readObject();
  }

  #readObject(): RObject {
    const type = this.#readByte();
    switch (type) {
      case 0x30: // '0'
        return null;
      case 0x69: // 'i'
        return BigInt(this.#readFixnum());
      default:
        throw new SyntaxError(
          `Unknown type: ${type.toString(16).padStart(2, "0").toUpperCase()}`,
        );
    }
  }

  #readUFixnum(): number {
    const value = this.#readFixnum();
    if (value < 0) {
      throw new SyntaxError("Received a negative integer");
    }
    return value;
  }

  #readFixnum(): number {
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
