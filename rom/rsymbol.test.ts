import {
  assertEquals,
  assertInstanceOf,
  assertStrictEquals,
} from "@std/assert";
import { REncoding } from "./encoding.ts";
import { RExoticSymbol, RSymbol } from "./rsymbol.ts";

Deno.test("RSymbol() returns a string", () => {
  assertEquals(
    typeof RSymbol(Uint8Array.from([0x61]), REncoding.UTF_8),
    "string",
  );
  assertEquals(
    typeof RSymbol(Uint8Array.from([0x61]), REncoding.Windows_31J),
    "string",
  );
  assertEquals(
    typeof RSymbol(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.UTF_8),
    "string",
  );
});

Deno.test("RSymbol() returns a RExoticSymbol", () => {
  assertInstanceOf(
    RSymbol(Uint8Array.from([0x82, 0xA0]), REncoding.Windows_31J),
    RExoticSymbol,
  );
});

Deno.test("RSymbol() always returns the same RExoticSymbol", () => {
  const sym1 = RSymbol(Uint8Array.from([0x82, 0xA0]), REncoding.Windows_31J);
  const sym2 = RSymbol(Uint8Array.from([0x82, 0xA0]), REncoding.Windows_31J);
  assertInstanceOf(sym1, RExoticSymbol);
  assertInstanceOf(sym2, RExoticSymbol);

  assertStrictEquals(sym1, sym2);
});
