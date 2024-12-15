import { assertEquals } from "@std/assert/equals";
import { load } from "../load2.ts";
import { dump } from "../dump2.ts";
import { seq } from "../testutil.ts";
import { BigIntMapper, FloatMapper, SafeIntegerMapper } from "./numerics.ts";
import { assertThrows } from "@std/assert";

Deno.test("BigIntMapper loads Integer as BigInt", () => {
  assertEquals(load(seq("\x04\x08i\x06"), BigIntMapper), 1n);
  assertEquals(load(seq("\x04\x08i\xFA"), BigIntMapper), -1n);
  assertEquals(
    load(
      seq("\x04\x08l+", 4, "\xD2\x0A\x1F\xEB\x8C\xA9\x54\xAB"),
      BigIntMapper,
    ),
    12345678901234567890n,
  );
});

Deno.test("BigIntMapper dumps BigInt as Integer", () => {
  assertEquals(dump(1n, BigIntMapper), seq("\x04\x08i\x06"));
  assertEquals(dump(-1n, BigIntMapper), seq("\x04\x08i\xFA"));
  assertEquals(
    dump(12345678901234567890n, BigIntMapper),
    seq("\x04\x08l+", 4, "\xD2\x0A\x1F\xEB\x8C\xA9\x54\xAB"),
  );
});

Deno.test("SafeIntegerMapper loads Integer as number", () => {
  assertEquals(load(seq("\x04\x08i\x06"), SafeIntegerMapper), 1);
  assertEquals(load(seq("\x04\x08i\xFA"), SafeIntegerMapper), -1);
  assertEquals(
    load(
      seq("\x04\x08l+", 4, "\xC0\xBA\x8A\x3C\xD5\x62\x04\x00"),
      SafeIntegerMapper,
    ),
    1234567890123456,
  );
});

Deno.test("SafeIntegerMapper refuses to load large Integer", () => {
  assertThrows(
    () =>
      load(
        seq("\x04\x08l+", 4, "\x87\x4B\x6B\x5D\x54\xDC\x2B\x00"),
        SafeIntegerMapper,
      ),
    RangeError,
    "Integer value does not fit in a JS safe integer",
  );
});

Deno.test("SafeIntegerMapper dumps number as Integer", () => {
  assertEquals(dump(1, SafeIntegerMapper), seq("\x04\x08i\x06"));
  assertEquals(dump(-1, SafeIntegerMapper), seq("\x04\x08i\xFA"));
  assertEquals(
    dump(1234567890123456, SafeIntegerMapper),
    seq("\x04\x08l+", 4, "\xC0\xBA\x8A\x3C\xD5\x62\x04\x00"),
  );
});

Deno.test("SafeIntegerMapper refuses to dump numbers that are not safe integers", () => {
  assertThrows(
    () => dump(2 ** 53, SafeIntegerMapper),
    RangeError,
    "The given number is not a safe integer",
  );
  assertThrows(
    () => dump(0.5, SafeIntegerMapper),
    RangeError,
    "The given number is not a safe integer",
  );
  assertThrows(
    () => dump(NaN, SafeIntegerMapper),
    RangeError,
    "The given number is not a safe integer",
  );
  assertThrows(
    () => dump(Infinity, SafeIntegerMapper),
    RangeError,
    "The given number is not a safe integer",
  );
});

Deno.test("FloatMapper loads Float as number", () => {
  assertEquals(load(seq("\x04\x08f", 3, "1.5"), FloatMapper), 1.5);
});

Deno.test("FloatMapper dumps number as Float", () => {
  assertEquals(dump(1.5, FloatMapper), seq("\x04\x08f", 3, "1.5"));
});
