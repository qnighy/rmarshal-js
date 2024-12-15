import { MarshalFloat, MarshalInteger, type MarshalValue } from "../ast.ts";
import type { Mapper } from "../mapper.ts";

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
        throw new RangeError(
          "Integer value does not fit in a JS safe integer",
        );
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
