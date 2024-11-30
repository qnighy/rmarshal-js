import { assertEquals } from "@std/assert";
import { ASCII_8BIT, RSymbol } from "./rom.ts";
import { dump } from "./dump.ts";
import { seq } from "./testutil.ts";

Deno.test("dump dumps nil", () => {
  assertEquals(dump(null), seq("\x04\x08", "0"));
});

Deno.test("dump dumps boolean", () => {
  assertEquals(dump(false), seq("\x04\x08", "F"));
  assertEquals(dump(true), seq("\x04\x08", "T"));
});

Deno.test("dump dumps Fixnum", () => {
  // Zero
  assertEquals(dump(0n), seq("\x04\x08", "i\x00"));
  // Positive short form
  assertEquals(dump(1n), seq("\x04\x08", "i\x06"));
  assertEquals(dump(122n), seq("\x04\x08", "i\x7F"));
  // Negative short form
  assertEquals(dump(-1n), seq("\x04\x08", "i\xFA"));
  assertEquals(dump(-123n), seq("\x04\x08", "i\x80"));
  // Positive 1-byte form
  assertEquals(dump(123n), seq("\x04\x08", "i\x01\x7B"));
  assertEquals(dump(255n), seq("\x04\x08", "i\x01\xFF"));
  // Positive 2-byte form
  assertEquals(dump(256n), seq("\x04\x08", "i\x02\x00\x01"));
  assertEquals(dump(0xFFFFn), seq("\x04\x08", "i\x02\xFF\xFF"));
  // Positive 3-byte form
  assertEquals(dump(0x10000n), seq("\x04\x08", "i\x03\x00\x00\x01"));
  assertEquals(dump(0xFFFFFFn), seq("\x04\x08", "i\x03\xFF\xFF\xFF"));
  // Positive 4-byte form
  assertEquals(dump(0x1000000n), seq("\x04\x08", "i\x04\x00\x00\x00\x01"));
  assertEquals(dump(0x3FFFFFFFn), seq("\x04\x08", "i\x04\xFF\xFF\xFF\x3F"));
  // Negative 1-byte form
  assertEquals(dump(-124n), seq("\x04\x08", "i\xFF\x84"));
  assertEquals(dump(-256n), seq("\x04\x08", "i\xFF\x00"));
  // Negative 2-byte form
  assertEquals(dump(-257n), seq("\x04\x08", "i\xFE\xFF\xFE"));
  assertEquals(dump(-0x10000n), seq("\x04\x08", "i\xFE\x00\x00"));
  // Negative 3-byte form
  assertEquals(dump(-0x10001n), seq("\x04\x08", "i\xFD\xFF\xFF\xFE"));
  assertEquals(dump(-0x1000000n), seq("\x04\x08", "i\xFD\x00\x00\x00"));
  // Negative 4-byte form
  assertEquals(dump(-0x1000001n), seq("\x04\x08", "i\xFC\xFF\xFF\xFF\xFE"));
  assertEquals(dump(-0x40000000n), seq("\x04\x08", "i\xFC\x00\x00\x00\xC0"));
});

Deno.test("dump dumps Float", () => {
  // Non-finite values
  // NaN
  assertEquals(dump(NaN), seq("\x04\x08", "f", 3, "nan"));
  // Infinity
  assertEquals(dump(Infinity), seq("\x04\x08", "f", 3, "inf"));

  // -Infinity
  assertEquals(dump(-Infinity), seq("\x04\x08", "f", 4, "-inf"));

  // Zeroes
  // 0
  assertEquals(dump(0), seq("\x04\x08", "f", 1, "0"));
  // -0
  assertEquals(dump(-0), seq("\x04\x08", "f", 2, "-0"));

  // Integers in non-scientific notation
  // 1
  assertEquals(dump(1), seq("\x04\x08", "f", 1, "1"));
  // -1
  assertEquals(dump(-1), seq("\x04\x08", "f", 2, "-1"));
  // 9007199254740992
  assertEquals(
    dump(9007199254740992e+0),
    seq("\x04\x08", "f", 16, "9007199254740992"),
  );
  assertEquals(
    dump(72057594037927896e+0),
    seq("\x04\x08", "f", 17, "72057594037927896"),
  );
  assertEquals(
    dump(-9007199254740992e+0),
    seq("\x04\x08", "f", 17, "-9007199254740992"),
  );
  assertEquals(
    dump(-72057594037927896e+0),
    seq("\x04\x08", "f", 18, "-72057594037927896"),
  );

  // Integers in scientific notation
  // "1e1"
  assertEquals(dump(10), seq("\x04\x08", "f", 3, "1e1"));
  // "-1e1"
  assertEquals(dump(-10), seq("\x04\x08", "f", 4, "-1e1"));
  // "1.7976931348623157e308"
  assertEquals(
    dump(1.7976931348623157e+308),
    seq("\x04\x08", "f", 22, "1.7976931348623157e308"),
  );
  // "-1.7976931348623157e308"
  assertEquals(
    dump(-1.7976931348623157e+308),
    seq("\x04\x08", "f", 23, "-1.7976931348623157e308"),
  );

  // Non-scientific fractions
  // "0.0001"
  assertEquals(dump(0.0001), seq("\x04\x08", "f", 6, "0.0001"));
  // "-0.0001"
  assertEquals(dump(-0.0001), seq("\x04\x08", "f", 7, "-0.0001"));

  // Scientific fractions
  // "9.999999999999999e-5"
  assertEquals(
    dump(9.999999999999999e-5),
    seq("\x04\x08", "f", 20, "9.999999999999999e-5"),
  );
  // "-9.999999999999999e-5"
  assertEquals(
    dump(-9.999999999999999e-5),
    seq("\x04\x08", "f", 21, "-9.999999999999999e-5"),
  );
  // "5e-324"
  assertEquals(dump(5e-324), seq("\x04\x08", "f", 6, "5e-324"));
  // "-5e-324"
  assertEquals(dump(-5e-324), seq("\x04\x08", "f", 7, "-5e-324"));
});

Deno.test("dump dumps Symbol", () => {
  assertEquals(dump("foo"), seq("\x04\x08", ":", 3, "foo"));
  assertEquals(
    dump(
      RSymbol(Uint8Array.from([0xE3, 0x81, 0x82]), { encoding: ASCII_8BIT }),
    ),
    seq("\x04\x08", ":", 3, "\xE3\x81\x82"),
  );
  assertEquals(
    dump("あ"),
    seq("\x04\x08", "I:", 3, "\xE3\x81\x82", 1, ":", 1, "E", "T"),
  );
  // // TODO
  // assertEquals(
  //   dump(RSymbol(Uint8Array.from([0x82, 0xA0]), {
  //     encoding: findEncoding("Windows-31J")!,
  //   })),
  //   seq(
  //     "\x04\x08",
  //     "I:",
  //     2,
  //     "\x82\xA0",
  //     1,
  //     ":",
  //     8,
  //     "encoding",
  //     '"',
  //     11,
  //     "Windows-31J",
  //   ),
  // );
});
