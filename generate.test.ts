import { assertEquals } from "@std/assert";
import { REncoding, RSymbol } from "./rom.ts";
import { generate } from "./generate.ts";
import { seq } from "./testutil.ts";
import {
  MarshalArray,
  MarshalBoolean,
  MarshalFloat,
  MarshalHash,
  MarshalInteger,
  MarshalNil,
  MarshalObject,
  MarshalString,
  MarshalSymbol,
  MarshalValue,
} from "./ast.ts";

Deno.test("generate generates nil", () => {
  assertEquals(generate(MarshalNil()), seq("\x04\x08", "0"));
});

Deno.test("generate generates boolean", () => {
  assertEquals(generate(MarshalBoolean(false)), seq("\x04\x08", "F"));
  assertEquals(generate(MarshalBoolean(true)), seq("\x04\x08", "T"));
});

Deno.test("generate generates Fixnum", () => {
  // Zero
  assertEquals(generate(MarshalInteger(0n)), seq("\x04\x08", "i\x00"));
  // Positive short form
  assertEquals(generate(MarshalInteger(1n)), seq("\x04\x08", "i\x06"));
  assertEquals(generate(MarshalInteger(122n)), seq("\x04\x08", "i\x7F"));
  // Negative short form
  assertEquals(generate(MarshalInteger(-1n)), seq("\x04\x08", "i\xFA"));
  assertEquals(generate(MarshalInteger(-123n)), seq("\x04\x08", "i\x80"));
  // Positive 1-byte form
  assertEquals(generate(MarshalInteger(123n)), seq("\x04\x08", "i\x01\x7B"));
  assertEquals(generate(MarshalInteger(255n)), seq("\x04\x08", "i\x01\xFF"));
  // Positive 2-byte form
  assertEquals(
    generate(MarshalInteger(256n)),
    seq("\x04\x08", "i\x02\x00\x01"),
  );
  assertEquals(
    generate(MarshalInteger(0xFFFFn)),
    seq("\x04\x08", "i\x02\xFF\xFF"),
  );
  // Positive 3-byte form
  assertEquals(
    generate(MarshalInteger(0x10000n)),
    seq("\x04\x08", "i\x03\x00\x00\x01"),
  );
  assertEquals(
    generate(MarshalInteger(0xFFFFFFn)),
    seq("\x04\x08", "i\x03\xFF\xFF\xFF"),
  );
  // Positive 4-byte form
  assertEquals(
    generate(MarshalInteger(0x1000000n)),
    seq("\x04\x08", "i\x04\x00\x00\x00\x01"),
  );
  assertEquals(
    generate(MarshalInteger(0x3FFFFFFFn)),
    seq("\x04\x08", "i\x04\xFF\xFF\xFF\x3F"),
  );
  // Negative 1-byte form
  assertEquals(generate(MarshalInteger(-124n)), seq("\x04\x08", "i\xFF\x84"));
  assertEquals(generate(MarshalInteger(-256n)), seq("\x04\x08", "i\xFF\x00"));
  // Negative 2-byte form
  assertEquals(
    generate(MarshalInteger(-257n)),
    seq("\x04\x08", "i\xFE\xFF\xFE"),
  );
  assertEquals(
    generate(MarshalInteger(-0x10000n)),
    seq("\x04\x08", "i\xFE\x00\x00"),
  );
  // Negative 3-byte form
  assertEquals(
    generate(MarshalInteger(-0x10001n)),
    seq("\x04\x08", "i\xFD\xFF\xFF\xFE"),
  );
  assertEquals(
    generate(MarshalInteger(-0x1000000n)),
    seq("\x04\x08", "i\xFD\x00\x00\x00"),
  );
  // Negative 4-byte form
  assertEquals(
    generate(MarshalInteger(-0x1000001n)),
    seq("\x04\x08", "i\xFC\xFF\xFF\xFF\xFE"),
  );
  assertEquals(
    generate(MarshalInteger(-0x40000000n)),
    seq("\x04\x08", "i\xFC\x00\x00\x00\xC0"),
  );
});

Deno.test("generate generates Float", () => {
  // Non-finite values
  // NaN
  assertEquals(generate(MarshalFloat(NaN)), seq("\x04\x08", "f", 3, "nan"));
  // Infinity
  assertEquals(
    generate(MarshalFloat(Infinity)),
    seq("\x04\x08", "f", 3, "inf"),
  );

  // -Infinity
  assertEquals(
    generate(MarshalFloat(-Infinity)),
    seq("\x04\x08", "f", 4, "-inf"),
  );

  // Zeroes
  // 0
  assertEquals(generate(MarshalFloat(0)), seq("\x04\x08", "f", 1, "0"));
  // -0
  assertEquals(generate(MarshalFloat(-0)), seq("\x04\x08", "f", 2, "-0"));

  // Integers in non-scientific notation
  // 1
  assertEquals(generate(MarshalFloat(1)), seq("\x04\x08", "f", 1, "1"));
  // -1
  assertEquals(generate(MarshalFloat(-1)), seq("\x04\x08", "f", 2, "-1"));
  // 9007199254740992
  assertEquals(
    generate(MarshalFloat(9007199254740992e+0)),
    seq("\x04\x08", "f", 16, "9007199254740992"),
  );
  assertEquals(
    generate(MarshalFloat(72057594037927896e+0)),
    seq("\x04\x08", "f", 17, "72057594037927896"),
  );
  assertEquals(
    generate(MarshalFloat(-9007199254740992e+0)),
    seq("\x04\x08", "f", 17, "-9007199254740992"),
  );
  assertEquals(
    generate(MarshalFloat(-72057594037927896e+0)),
    seq("\x04\x08", "f", 18, "-72057594037927896"),
  );

  // Integers in scientific notation
  // "1e1"
  assertEquals(generate(MarshalFloat(10)), seq("\x04\x08", "f", 3, "1e1"));
  // "-1e1"
  assertEquals(generate(MarshalFloat(-10)), seq("\x04\x08", "f", 4, "-1e1"));
  // "1.7976931348623157e308"
  assertEquals(
    generate(MarshalFloat(1.7976931348623157e+308)),
    seq("\x04\x08", "f", 22, "1.7976931348623157e308"),
  );
  // "-1.7976931348623157e308"
  assertEquals(
    generate(MarshalFloat(-1.7976931348623157e+308)),
    seq("\x04\x08", "f", 23, "-1.7976931348623157e308"),
  );

  // Non-scientific fractions
  // "0.0001"
  assertEquals(
    generate(MarshalFloat(0.0001)),
    seq("\x04\x08", "f", 6, "0.0001"),
  );
  // "-0.0001"
  assertEquals(
    generate(MarshalFloat(-0.0001)),
    seq("\x04\x08", "f", 7, "-0.0001"),
  );

  // Scientific fractions
  // "9.999999999999999e-5"
  assertEquals(
    generate(MarshalFloat(9.999999999999999e-5)),
    seq("\x04\x08", "f", 20, "9.999999999999999e-5"),
  );
  // "-9.999999999999999e-5"
  assertEquals(
    generate(MarshalFloat(-9.999999999999999e-5)),
    seq("\x04\x08", "f", 21, "-9.999999999999999e-5"),
  );
  // "5e-324"
  assertEquals(
    generate(MarshalFloat(5e-324)),
    seq("\x04\x08", "f", 6, "5e-324"),
  );
  // "-5e-324"
  assertEquals(
    generate(MarshalFloat(-5e-324)),
    seq("\x04\x08", "f", 7, "-5e-324"),
  );
});

Deno.test("generate generates Symbol", () => {
  assertEquals(generate(MarshalSymbol("foo")), seq("\x04\x08", ":", 3, "foo"));
  assertEquals(
    generate(
      MarshalSymbol(
        RSymbol(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.ASCII_8BIT),
      ),
    ),
    seq("\x04\x08", ":", 3, "\xE3\x81\x82"),
  );
  assertEquals(
    generate(MarshalSymbol("あ")),
    seq("\x04\x08", "I:", 3, "\xE3\x81\x82", 1, ":", 1, "E", "T"),
  );
  assertEquals(
    generate(
      MarshalSymbol(
        RSymbol(Uint8Array.from([0x82, 0xA0]), REncoding.Windows_31J),
      ),
    ),
    seq(
      "\x04\x08",
      "I:",
      2,
      "\x82\xA0",
      1,
      ":",
      8,
      "encoding",
      '"',
      11,
      "Windows-31J",
    ),
  );
});

Deno.test("generate generates Symbol link", () => {
  assertEquals(
    generate(MarshalArray([MarshalSymbol("foo"), MarshalSymbol("foo")])),
    seq("\x04\x08", "[", 2, ":", 3, "foo", ";", 0),
  );
  assertEquals(
    generate(
      MarshalArray([
        MarshalSymbol("foo"),
        MarshalSymbol("bar"),
        MarshalSymbol("bar"),
        MarshalSymbol("foo"),
      ]),
    ),
    seq("\x04\x08", "[", 4, ":", 3, "foo", ":", 3, "bar", ";", 1, ";", 0),
  );
  assertEquals(
    generate(
      MarshalArray([
        MarshalSymbol("あ"),
        MarshalSymbol("あ"),
        MarshalSymbol("E"),
      ]),
    ),
    seq(
      "\x04\x08",
      "[",
      3,
      ...["I:", 3, "\xE3\x81\x82", 1, ":", 1, "E", "T"],
      ...[";", 0],
      ...[";", 1],
    ),
  );
  assertEquals(
    generate(MarshalArray([MarshalSymbol("あ"), MarshalSymbol("い")])),
    seq(
      "\x04\x08",
      "[",
      2,
      ...["I:", 3, "\xE3\x81\x82", 1, ":", 1, "E", "T"],
      ...["I:", 3, "\xE3\x81\x84", 1, ";", 1, "T"],
    ),
  );
});

Deno.test("generate generates Object", () => {
  assertEquals(
    generate(MarshalObject("Object", new Map())),
    seq("\x04\x08", "o:", 6, "Object", 0),
  );
  assertEquals(
    generate(
      MarshalObject(
        "MyClass",
        new Map<RSymbol, MarshalValue>([
          ["@foo", MarshalInteger(42n)],
          ["@bar", MarshalSymbol("baz")],
        ]),
      ),
    ),
    seq(
      "\x04\x08",
      "o",
      ...[":", 7, "MyClass"],
      2,
      ...[":", 4, "@foo", "i", 42],
      ...[":", 4, "@bar", ":", 3, "baz"],
    ),
  );
});

Deno.test("generate generates Array", () => {
  assertEquals(generate(MarshalArray([])), seq("\x04\x08", "[", 0));
  assertEquals(
    generate(MarshalArray([MarshalInteger(42n), MarshalNil()])),
    seq("\x04\x08", "[", 2, "i", 42, "0"),
  );
  assertEquals(
    generate(
      MarshalArray([MarshalNil()], {
        ivars: new Map<RSymbol, MarshalValue>([["@foo", MarshalInteger(42n)]]),
      }),
    ),
    seq("\x04\x08", "I[", 1, "0", 1, ":", 4, "@foo", "i", 42),
  );
});

Deno.test("generate generates Hash", () => {
  assertEquals(generate(MarshalHash([])), seq("\x04\x08", "{", 0));
  assertEquals(
    generate(
      MarshalHash([[MarshalInteger(42n), MarshalNil()], [
        MarshalInteger(100n),
        MarshalBoolean(false),
      ]]),
    ),
    seq("\x04\x08", "{", 2, "i", 42, "0", "i", 100, "F"),
  );
  assertEquals(
    generate(
      MarshalHash([[MarshalNil(), MarshalNil()]], {
        ivars: new Map([["@foo", MarshalInteger(42n)]]),
      }),
    ),
    seq("\x04\x08", "I{", 1, "0", "0", 1, ":", 4, "@foo", "i", 42),
  );

  assertEquals(
    generate(MarshalHash([], { defaultValue: MarshalInteger(42n) })),
    seq("\x04\x08", "}", 0, "i", 42),
  );
  assertEquals(
    generate(
      MarshalHash([[MarshalInteger(42n), MarshalNil()], [
        MarshalInteger(100n),
        MarshalBoolean(false),
      ]], { defaultValue: MarshalInteger(42n) }),
    ),
    seq("\x04\x08", "}", 2, "i", 42, "0", "i", 100, "F", "i", 42),
  );
  assertEquals(
    generate(
      MarshalHash([[MarshalNil(), MarshalNil()]], {
        ivars: new Map([["@foo", MarshalInteger(42n)]]),
        defaultValue: MarshalInteger(42n),
      }),
    ),
    seq("\x04\x08", "I}", 1, "0", "0", "i", 42, 1, ":", 4, "@foo", "i", 42),
  );
});

Deno.test("generate generates String", () => {
  assertEquals(
    generate(
      MarshalString(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.ASCII_8BIT),
    ),
    seq("\x04\x08", '"', 3, "foo"),
  );
  assertEquals(
    generate(
      MarshalString(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.ASCII_8BIT),
    ),
    seq("\x04\x08", '"', 3, "\xE3\x81\x82"),
  );
  assertEquals(
    generate(
      MarshalString(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.UTF_8),
    ),
    seq("\x04\x08", 'I"', 3, "\xE3\x81\x82", 1, ":", 1, "E", "T"),
  );
  assertEquals(
    generate(
      MarshalString(Uint8Array.from([0x82, 0xA0]), REncoding.Windows_31J),
    ),
    seq(
      "\x04\x08",
      'I"',
      2,
      "\x82\xA0",
      1,
      ":",
      8,
      "encoding",
      '"',
      11,
      "Windows-31J",
    ),
  );
  assertEquals(
    generate(
      MarshalString(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.ASCII_8BIT, {
        ivars: new Map([["@foo", MarshalInteger(42n)]]),
      }),
    ),
    seq("\x04\x08", 'I"', 3, "foo", 1, ":", 4, "@foo", "i", 42),
  );
  assertEquals(
    generate(
      MarshalString(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.UTF_8, {
        ivars: new Map([["@foo", MarshalInteger(42n)]]),
      }),
    ),
    seq(
      "\x04\x08",
      "I",
      ...['"', 3, "\xE3\x81\x82"],
      2,
      ...[":", 1, "E", "T"],
      ...[":", 4, "@foo", "i", 42],
    ),
  );
});

function setupLink<const T extends unknown[]>(
  values: T,
  callback: (...values: T) => void,
): T[0] {
  callback(...values);
  return values[0];
}

Deno.test("generate generates links", () => {
  // Cycle
  assertEquals(
    generate(setupLink([MarshalArray([])], (a) => a.elements.push(a))),
    seq("\x04\x08", "[", 1, "@", 0),
  );
  // Shared reference
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalArray([])],
        (a, b) => a.elements.push(b, b),
      ),
    ),
    seq("\x04\x08", "[", 2, "[", 0, "@", 1),
  );
  // Skips nil
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalArray([])],
        (a, b) => a.elements.push(MarshalNil(), b, b),
      ),
    ),
    seq("\x04\x08", "[", 3, "0", "[", 0, "@", 1),
  );
  // Skips false
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalArray([])],
        (a, b) => a.elements.push(MarshalBoolean(false), b, b),
      ),
    ),
    seq("\x04\x08", "[", 3, "F", "[", 0, "@", 1),
  );
  // Skips true
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalArray([])],
        (a, b) => a.elements.push(MarshalBoolean(true), b, b),
      ),
    ),
    seq("\x04\x08", "[", 3, "T", "[", 0, "@", 1),
  );
  // Skips Fixnum
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalArray([])],
        (a, b) => a.elements.push(MarshalInteger(42n), b, b),
      ),
    ),
    seq("\x04\x08", "[", 3, "i", 42, "[", 0, "@", 1),
  );
  // Skips Symbol
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalArray([])],
        (a, b) => a.elements.push(MarshalSymbol("foo"), b, b),
      ),
    ),
    seq("\x04\x08", "[", 3, ":", 3, "foo", "[", 0, "@", 1),
  );
  // Counts Bignum
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalArray([])],
        (a, b) => a.elements.push(MarshalInteger(0x100000000n), b, b),
      ),
    ),
    seq(
      "\x04\x08",
      "[",
      3,
      ...["l+", 3, "\x00\x00\x00\x00\x01\x00"],
      ...["[", 0],
      ...["@", 2],
    ),
  );
  // Counts Float
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalArray([])],
        (a, b) => a.elements.push(MarshalFloat(1), b, b),
      ),
    ),
    seq(
      "\x04\x08",
      "[",
      3,
      ...["f", 1, "1"],
      ...["[", 0],
      ...["@", 2],
    ),
  );
});
