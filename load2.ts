import type { MarshalValue } from "./ast.ts";
import type { Mapper } from "./mapper.ts";
import { parse } from "./parse.ts";

export function load<T>(source: Uint8Array, mapper: Mapper<T>): T {
  const mValue = parse(source);
  return loadFromNode(mValue, mapper);
}

export function loadFromNode<T>(mValue: MarshalValue, mapper: Mapper<T>): T {
  const value = mapper.load(mValue);
  if (value == null) {
    throw new TypeError(`Failed to load value: ${mValue}`);
  }
  return value.value;
}
