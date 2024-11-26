import {
  assertEquals,
  assertInstanceOf,
  assertStrictEquals,
} from "@std/assert";
import { RExoticSymbol, RSymbol } from "./rsymbol.ts";
import { findEncoding } from "./rom/encoding/mod.ts";

const sjis = findEncoding("Windows-31J")!;

Deno.test("RSymbol() returns a string", () => {
  assertEquals(typeof RSymbol("hello"), "string");
  assertEquals(typeof RSymbol("あいう"), "string");
  assertEquals(typeof RSymbol(Uint8Array.from([0x61])), "string");
  assertEquals(
    typeof RSymbol(Uint8Array.from([0x61]), { encoding: sjis }),
    "string",
  );
  assertEquals(typeof RSymbol(Uint8Array.from([0xE3, 0x81, 0x82])), "string");
});

Deno.test("RSymbol() returns a RExoticSymbol", () => {
  assertInstanceOf(
    RSymbol(Uint8Array.from([0x82, 0xA0]), { encoding: sjis }),
    RExoticSymbol,
  );
});

Deno.test("RSymbol() always returns the same RExoticSymbol", () => {
  const sym1 = RSymbol(Uint8Array.from([0x82, 0xA0]), { encoding: sjis });
  const sym2 = RSymbol(Uint8Array.from([0x82, 0xA0]), { encoding: sjis });
  assertInstanceOf(sym1, RExoticSymbol);
  assertInstanceOf(sym2, RExoticSymbol);

  assertStrictEquals(sym1, sym2);
});
