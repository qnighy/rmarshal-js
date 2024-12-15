import type { RSymbol } from "./rom.ts";
import {
  MarshalBoolean,
  MarshalFloat,
  MarshalInteger,
  MarshalNil,
  type MarshalValue,
} from "./ast.ts";

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

/**
 * Maps the Ruby `nil` to the JS `null`.
 */
export const NullMapper: Mapper<null> = {
  classNames: ["NilClass"],
  load(value: MarshalValue): { value: null } | undefined {
    if (value.type === "NilClass") {
      return { value: null };
    }
  },
  dump(value: unknown): MarshalValue | undefined {
    if (value == null) {
      return MarshalNil();
    }
  },
};

/**
 * Maps the Ruby `true` and `false` to the JS `true` and `false`.
 */
export const BooleanMapper: Mapper<boolean> = {
  classNames: ["Boolean"],
  load(value: MarshalValue): { value: boolean } | undefined {
    if (value.type === "Boolean") {
      return { value: value.value };
    }
  },
  dump(value: unknown): MarshalValue | undefined {
    if (typeof value === "boolean") {
      return MarshalBoolean(value);
    }
  },
};

/**
 * Maps Ruby `Integer` to JS `bigint`.
 */
export const BigIntMapper: Mapper<bigint> = {
  classNames: ["Integer"],
  load(value: MarshalValue): { value: bigint } | undefined {
    if (value.type === "Integer") {
      return { value: value.value };
    }
  },
  dump(value: unknown): MarshalValue | undefined {
    if (typeof value === "bigint") {
      return MarshalInteger(value);
    }
  },
};

/**
 * Maps Ruby `Integer` to JS `number`, but if
 * the value does not fit in a JS safe integer,
 * it raises an error.
 */
export const SafeIntegerMapper: Mapper<number> = {
  classNames: ["Integer"],
  load(value: MarshalValue): { value: number } | undefined {
    if (value.type === "Integer") {
      if (-(2n ** 53n) < value.value && value.value < 2n ** 53n) {
        return { value: Number(value.value) };
      } else {
        throw new RangeError("Integer value does not fit in a JS safe integer");
      }
    }
  },
  dump(value: unknown): MarshalValue | undefined {
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value)) {
        throw new RangeError("The given number is not a safe integer");
      }
      return MarshalInteger(BigInt(value));
    }
  },
};

/**
 * Maps Ruby `Float` to JS `number`.
 */
export const FloatMapper: Mapper<number> = {
  classNames: ["Float"],
  load(value: MarshalValue): { value: number } | undefined {
    if (value.type === "Float") {
      return { value: value.value };
    }
  },
  dump(value: unknown): MarshalValue | undefined {
    if (typeof value === "number") {
      return MarshalFloat(value);
    }
  },
};
