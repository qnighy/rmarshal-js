import type { MarshalValue } from "./ast.ts";
import { generate } from "./generate.ts";
import type { Mapper } from "./mapper.ts";

export function dump<T>(value: NoInfer<T>, mapper: Mapper<T>): Uint8Array {
  const mValue = dumpAsNode(value, mapper);
  return generate(mValue);
}

export function dumpAsNode<T>(
  value: NoInfer<T>,
  mapper: Mapper<T>,
): MarshalValue {
  const mValue = mapper.dump(value);
  if (mValue == null) {
    throw new TypeError(`Failed to dump value: ${value}`);
  }
  return mValue;
}
