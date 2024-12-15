import type { RSymbol } from "./rom.ts";
import type { MarshalValue } from "./ast.ts";

export type Mapper<out T> = {
  /**
   * Class names that the mapper matches.
   * For TrueClass/FalseClass, use "Boolean".
   */
  classNames: RSymbol[];
  /**
   * Loads a value from a Marshal AST node.
   */
  load(value: MarshalValue): { value: T } | undefined;
  /**
   * Dumps a JS value as a Marshal AST node.
   */
  dump(value: unknown): MarshalValue | undefined;
};
