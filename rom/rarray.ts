import type { RValue } from "./mod.ts";
import { RObject } from "./robject.ts";
import type { IvarName, RSymbol } from "./rsymbol.ts";

export type RArrayOptions = {
  className?: RSymbol;
  ivars?: Record<IvarName, RValue>;
};

/**
 * Instances of Ruby's Array class or its subclasses.
 */
export class RArray extends RObject {
  /**
   * The elements of this array.
   */
  readonly elements: RValue[];

  constructor(elements: RValue[] = [], options: RArrayOptions = {}) {
    const { className = "Array", ivars = {} } = options;
    super(className, ivars);
    this.elements = [...elements];
    Object.defineProperty(this, "elements", {
      configurable: false,
      writable: false,
    });
  }
}
