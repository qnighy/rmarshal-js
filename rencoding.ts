const PRIVATE_KEY: unknown = {};
export class REncoding {
  #name: string;
  #impl: EncodingImpl;

  constructor(privateKey: unknown, name: string, impl: EncodingImpl) {
    if (privateKey !== PRIVATE_KEY) {
      throw new TypeError("Do not instantiate REncoding directly");
    }
    this.#name = name;
    this.#impl = impl;
    Object.freeze(this);
  }
}

const encodings = new Map<string, REncoding>();
export function registerEncoding(
  name: string,
  aliases: string[],
  impl: EncodingImpl,
) {
  const enc = new REncoding(PRIVATE_KEY, name, impl);
  encodings.set(name.toLowerCase(), enc);
  for (const alias of aliases) {
    encodings.set(alias.toLowerCase(), enc);
  }
}

export function findEncoding(name: string): REncoding | undefined {
  return encodings.get(name.toLowerCase());
}

export type EncodingImpl = {
  delimit(bytes: Uint8Array, pos: number): number;
};

const ASCII_8BIT_IMPL: EncodingImpl = {
  delimit(_bytes, _pos) {
    return 1;
  },
};
registerEncoding("ASCII-8BIT", ["BINARY"], ASCII_8BIT_IMPL);

const UTF_8_IMPL: EncodingImpl = {
  delimit(bytes, pos) {
    const ch0 = bytes[pos];
    if (ch0 < 0x80) {
      return 1;
    } else if (ch0 < 0xC2) {
      return -1;
    } else if (ch0 < 0xE0) {
      return pos + 1 < bytes.length && (bytes[pos + 1] & 0xC0) === 0x80
        ? 2
        : -1;
    } else if (ch0 < 0xF0) {
      if (pos + 2 >= bytes.length) {
        return -1;
      }
      const ch1 = bytes[pos + 1];
      if ((ch1 & 0xC0) !== 0x80) {
        return -1;
      }
      if (ch0 === 0xE0 && ch1 < 0xA0) {
        return -1;
      }
      if (ch0 === 0xED && ch1 >= 0xA0) {
        return -1;
      }
      const ch2 = bytes[pos + 2];
      return (ch2 & 0xC0) === 0x80 ? 3 : -1;
    } else if (ch0 < 0xF5) {
      if (pos + 3 >= bytes.length) {
        return -1;
      }
      const ch1 = bytes[pos + 1];
      if ((ch1 & 0xC0) !== 0x80) {
        return -1;
      }
      if (ch0 === 0xF0 && ch1 < 0x90) {
        return -1;
      }
      if (ch0 === 0xF4 && ch1 >= 0x90) {
        return -1;
      }
      const ch2 = bytes[pos + 2];
      const ch3 = bytes[pos + 3];
      return (ch2 & 0xC0) === 0x80 && (ch3 & 0xC0) === 0x80 ? 4 : -1;
    }
    return -1;
  },
};
registerEncoding("UTF-8", ["CP65001"], UTF_8_IMPL);

const US_ASCII_IMPL: EncodingImpl = {
  delimit(bytes, pos) {
    return bytes[pos] < 0x80 ? 1 : -1;
  },
};
registerEncoding("US-ASCII", ["ASCII", "ANSI_X3.4-1968", "646"], US_ASCII_IMPL);
