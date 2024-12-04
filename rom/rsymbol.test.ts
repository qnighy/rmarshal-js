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

Deno.test("RSymbol.asIvarName", () => {
  assertEquals(RSymbol.asIvarName("@foo"), "@foo");
  assertEquals(RSymbol.asIvarName("@foo_123"), "@foo_123");
  assertEquals(RSymbol.asIvarName("@Foo"), "@Foo");
  assertEquals(RSymbol.asIvarName("@あ"), "@あ");
  assertEquals(RSymbol.asIvarName("@\u3000"), "@\u3000");

  assertEquals(
    RSymbol.asIvarName(
      RSymbol(Uint8Array.from([0x40, 0x82, 0xA0, 0x41]), REncoding.Windows_31J),
    ),
    "@\uF782\uF7A0A/Windows-31J",
  );

  assertEquals(RSymbol.asIvarName("foo"), undefined);
  assertEquals(RSymbol.asIvarName("@"), undefined);
  assertEquals(RSymbol.asIvarName("@2"), undefined);
  assertEquals(RSymbol.asIvarName("@f@"), undefined);
  assertEquals(
    RSymbol.asIvarName(
      RSymbol(Uint8Array.from([0x00, 0x40, 0x30, 0x42]), REncoding.UTF_16BE),
    ),
    undefined,
  );
  assertEquals(
    RSymbol.asIvarName(
      RSymbol(Uint8Array.from([0x40, 0x40, 0x30, 0x42]), REncoding.UTF_16BE),
    ),
    undefined,
  );
  assertEquals(
    RSymbol.asIvarName(
      RSymbol(Uint8Array.from([0x40, 0x42]), REncoding.UTF_16BE),
    ),
    undefined,
  );
});

Deno.test("RSymbol.fromIvarName", () => {
  assertEquals(RSymbol.fromIvarName("@foo"), "@foo");
  assertEquals(RSymbol.fromIvarName("@foo_123"), "@foo_123");
  assertEquals(RSymbol.fromIvarName("@Foo"), "@Foo");
  assertEquals(RSymbol.fromIvarName("@あ"), "@あ");
  assertEquals(RSymbol.fromIvarName("@\u3000"), "@\u3000");

  assertEquals(
    RSymbol.fromIvarName("@\uF782\uF7A0A/Windows-31J"),
    RSymbol(Uint8Array.from([0x40, 0x82, 0xA0, 0x41]), REncoding.Windows_31J),
  );
});
