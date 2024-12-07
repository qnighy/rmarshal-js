import { REncoding } from "./encoding.ts";
import type { RValue } from "./mod.ts";
import { WithIvars } from "./robject.ts";
import { IvarName, RSymbol } from "./rsymbol.ts";

export type RStringOptions = {
  className?: RSymbol;
  ivars?: Record<IvarName, RValue>;
  encoding?: REncoding;
};

/**
 * Instances of Ruby's String class or its subclasses.
 */
export class RString extends WithIvars {
  /**
   * The byte contents of this string,
   * which may contain invalid byte sequences
   * according to the encoding.
   */
  bytes: Uint8Array;
  /**
   * The encoding of this string.
   */
  encoding: REncoding;

  constructor(source: Uint8Array | string, options: RStringOptions = {}) {
    const { className = "String", ivars = {}, encoding = REncoding.UTF_8 } =
      options;
    super(className, ivars);
    this.bytes = typeof source === "string"
      ? new TextEncoder().encode(source)
      : source;
    this.encoding = encoding;
    Object.defineProperty(this, "bytes", {
      configurable: false,
    });
    Object.defineProperty(this, "encoding", {
      configurable: false,
    });
  }

  override toString(): string {
    return this.encoding.inspectBytes(this.bytes);
  }

  toRSymbol(): RSymbol {
    return RSymbol(this.bytes, this.encoding);
  }

  static fromRSymbol(symbol: RSymbol): RString {
    const { bytes, encoding } = RSymbol.expand(symbol);
    return new RString(bytes, { encoding });
  }
}
