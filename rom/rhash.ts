import type { RValue } from "./mod.ts";
import { WithIvars } from "./robject.ts";
import type { IvarName, RSymbol } from "./rsymbol.ts";

export type RHashOptions = {
  className?: RSymbol;
  ivars?: Record<IvarName, RValue>;
  defaultValue?: RValue;
};

/**
 * Instances of Ruby's Hash class or its subclasses.
 */
export class RHash extends WithIvars {
  /**
   * The entries of this hash.
   */
  readonly entries: [RValue, RValue][];

  /**
   * The default value for this hash.
   *
   * In ordinary Ruby code, there is no such thing as
   * a default value of nil for a hash and it is instead
   * interpreted as an absence of a default value.
   * To follow the same behavior, the value of null in defaultValue
   * means that there is no default value.
   */
  defaultValue: RValue;

  constructor(entries: [RValue, RValue][] = [], options: RHashOptions = {}) {
    const { className = "Hash", ivars = {}, defaultValue = null } = options;
    super(className, ivars);
    this.entries = [...entries];
    this.defaultValue = defaultValue;
    Object.defineProperty(this, "elements", {
      configurable: false,
      writable: false,
    });
    Object.defineProperty(this, "defaultValue", {
      configurable: false,
    });
  }
}
