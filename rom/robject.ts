import type { RValue } from "./mod.ts";
import { type IvarName, RSymbol } from "./rsymbol.ts";

/**
 * a general Ruby object with instance variables.
 *
 * Note that, inheritance hierarchy in Ruby
 * is not represented as the one in JavaScript.
 */
export class RObject {
  /**
   * The name of the class this object belongs to
   * in its canonical form.
   */
  readonly className: RSymbol;
  /**
   * The instance variables of this object.
   *
   * Note that symbols in unusual encodings are
   * represented in `@bytes/encoding` format, and
   * you need to reconstruct the original Symbol
   * using {@link RSymbol.fromIvarName}.
   */
  [key: IvarName]: RValue;

  constructor(
    className: RSymbol,
    ivars: Record<IvarName, RValue> = {},
  ) {
    this.className = className;
    Object.defineProperty(this, "className", {
      configurable: false,
      writable: false,
    });

    for (const [key, value] of Object.entries(ivars)) {
      this[key as IvarName] = value;
    }
  }

  *ivars(): IterableIterator<[RSymbol, RValue]> {
    for (const [key, value] of Object.entries(this)) {
      if (key.startsWith("@") && value !== undefined) {
        yield [RSymbol.fromIvarName(key as IvarName), value as RValue];
      }
    }
  }
}
