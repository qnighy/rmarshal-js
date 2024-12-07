import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import {
  RArray,
  REncoding,
  RHash,
  RObject,
  RString,
  RSymbol,
  type RValue,
} from "./rom.ts";
import { load } from "./load.ts";
import { seq, type SeqElement } from "./testutil.ts";

function l(...elems: SeqElement[]): RValue {
  return load(seq(...elems));
}

Deno.test("load loads something", () => {
  assertEquals(l("\x04\x08", "0"), null);
});

Deno.test("load rejects short or long data", () => {
  assertThrows(() => l("\x04\x08"), SyntaxError);
  assertThrows(() => l("\x04\x08", "0", "0"), SyntaxError);
});

Deno.test("load rejects invalid versions", () => {
  assertThrows(() => l("\x03\x08", "0"), SyntaxError);
  assertThrows(() => l("\x05\x08", "0"), SyntaxError);
  assertThrows(() => l("\x04\x09", "0"), SyntaxError);
  assertEquals(l("\x04\x07", "0"), null);
});

Deno.test("load loads nil", () => {
  assertEquals(l("\x04\x08", "0"), null);
});

Deno.test("load loads boolean", () => {
  assertEquals(l("\x04\x08", "F"), false);
  assertEquals(l("\x04\x08", "T"), true);
});

Deno.test("load loads Fixnum", () => {
  // Zero
  assertEquals(l("\x04\x08", "i\x00"), 0n);
  // Positive short form
  assertEquals(l("\x04\x08", "i\x06"), 1n);
  assertEquals(l("\x04\x08", "i\x7F"), 122n);
  // Negative short form
  assertEquals(l("\x04\x08", "i\xFA"), -1n);
  assertEquals(l("\x04\x08", "i\x80"), -123n);
  // Positive 1-byte form
  assertEquals(l("\x04\x08", "i\x01\x7B"), 123n);
  assertEquals(l("\x04\x08", "i\x01\xFF"), 255n);
  // Positive 2-byte form
  assertEquals(l("\x04\x08", "i\x02\x00\x01"), 256n);
  assertEquals(l("\x04\x08", "i\x02\xFF\xFF"), 0xFFFFn);
  // Positive 3-byte form
  assertEquals(l("\x04\x08", "i\x03\x00\x00\x01"), 0x10000n);
  assertEquals(l("\x04\x08", "i\x03\xFF\xFF\xFF"), 0xFFFFFFn);
  // Positive 4-byte form
  assertEquals(l("\x04\x08", "i\x04\x00\x00\x00\x01"), 0x1000000n);
  assertEquals(l("\x04\x08", "i\x04\xFF\xFF\xFF\x3F"), 0x3FFFFFFFn);
  // Negative 1-byte form
  assertEquals(l("\x04\x08", "i\xFF\x84"), -124n);
  assertEquals(l("\x04\x08", "i\xFF\x00"), -256n);
  // Negative 2-byte form
  assertEquals(l("\x04\x08", "i\xFE\xFF\xFE"), -257n);
  assertEquals(l("\x04\x08", "i\xFE\x00\x00"), -0x10000n);
  // Negative 3-byte form
  assertEquals(l("\x04\x08", "i\xFD\xFF\xFF\xFE"), -0x10001n);
  assertEquals(l("\x04\x08", "i\xFD\x00\x00\x00"), -0x1000000n);
  // Negative 4-byte form
  assertEquals(l("\x04\x08", "i\xFC\xFF\xFF\xFF\xFE"), -0x1000001n);
  assertEquals(l("\x04\x08", "i\xFC\x00\x00\x00\xC0"), -0x40000000n);
});

Deno.test("load rejects non-canonical Fixnum", () => {
  // Non-canonical positive short form of 0
  assertThrows(() => l("\x04\x08", "i\x05"), SyntaxError);
  // Non-canonical negative short form of 0
  assertThrows(() => l("\x04\x08", "i\xFB"), SyntaxError);
  // Redundant positive 1-byte form (0 to 122)
  assertThrows(() => l("\x04\x08", "i\x01\x00"), SyntaxError);
  assertThrows(() => l("\x04\x08", "i\x01\x7A"), SyntaxError);
  // Redundant positive 2-byte form (0 to 255)
  assertThrows(() => l("\x04\x08", "i\x02\x00\x00"), SyntaxError);
  assertThrows(() => l("\x04\x08", "i\x02\xFF\x00"), SyntaxError);
  // Redundant positive 3-byte form (0 to 0xFFFF)
  assertThrows(() => l("\x04\x08", "i\x03\x00\x00\x00"), SyntaxError);
  assertThrows(() => l("\x04\x08", "i\x03\xFF\xFF\x00"), SyntaxError);
  // Redundant positive 4-byte form (0 to 0xFFFFFF)
  assertThrows(() => l("\x04\x08", "i\x04\x00\x00\x00\x00"), SyntaxError);
  assertThrows(() => l("\x04\x08", "i\x04\xFF\xFF\xFF\x00"), SyntaxError);
  // Incorrect Bignum representation as Fixnum (0x40000000 to 0xFFFFFFFF)
  assertThrows(() => l("\x04\x08", "i\x04\x00\x00\x00\x40"), SyntaxError);
  assertThrows(() => l("\x04\x08", "i\x04\xFF\xFF\xFF\xFF"), SyntaxError);
  // Redundant negative 1-byte form (-1 to -123)
  assertThrows(() => l("\x04\x08", "i\xFF\xFF"), SyntaxError);
  assertThrows(() => l("\x04\x08", "i\xFF\x85"), SyntaxError);
  // Redundant negative 2-byte form (-1 to -256)
  assertThrows(() => l("\x04\x08", "i\xFE\xFF\xFF"), SyntaxError);
  assertThrows(() => l("\x04\x08", "i\xFE\x00\xFF"), SyntaxError);
  // Redundant negative 3-byte form (-1 to -0x10000)
  assertThrows(() => l("\x04\x08", "i\xFD\xFF\xFF\xFF"), SyntaxError);
  assertThrows(() => l("\x04\x08", "i\xFD\x00\x00\xFF"), SyntaxError);
  // Redundant negative 4-byte form (-1 to -0x1000000)
  assertThrows(() => l("\x04\x08", "i\xFC\xFF\xFF\xFF\xFF"), SyntaxError);
  assertThrows(() => l("\x04\x08", "i\xFC\x00\x00\x00\xFF"), SyntaxError);
  // Incorrect Bignum representation as Fixnum (-0x40000000 to -0x1000001)
  assertThrows(() => l("\x04\x08", "i\xFC\xFF\xFF\xFF\xBF"), SyntaxError);
});

Deno.test("load loads Bignum", () => {
  // 2 words, positive
  assertEquals(l("\x04\x08", "l+", 2, "\x00\x00\x00\x40"), 0x40000000n);
  assertEquals(l("\x04\x08", "l+", 2, "\xFF\xFF\xFF\xFF"), 0xFFFFFFFFn);
  // 2 words, negative
  assertEquals(l("\x04\x08", "l-", 2, "\x01\x00\x00\x40"), -0x40000001n);
  assertEquals(l("\x04\x08", "l-", 2, "\xFF\xFF\xFF\xFF"), -0xFFFFFFFFn);
  // 3 words, positive
  assertEquals(
    l("\x04\x08", "l+", 3, "\x00\x00\x00\x00\x01\x00"),
    0x100000000n,
  );
  assertEquals(
    l("\x04\x08", "l+", 3, "\xFF\xFF\xFF\xFF\xFF\xFF"),
    0xFFFFFFFFFFFFn,
  );
  // 3 words, negative
  assertEquals(
    l("\x04\x08", "l-", 3, "\x00\x00\x00\x00\x01\x00"),
    -0x100000000n,
  );
  assertEquals(
    l("\x04\x08", "l-", 3, "\xFF\xFF\xFF\xFF\xFF\xFF"),
    -0xFFFFFFFFFFFFn,
  );
});

Deno.test("load rejects non-canonical Bignum", () => {
  // Non-canonical sign -- bytes other than '-' are treated as non-canonical positive
  assertThrows(() => l("\x04\x08", "l,", 2, "\x00\x00\x00\x40"), SyntaxError);
  // Incorrect Fixnum representation as Bignum (-0x40000000 to 0x3FFFFFFF)
  assertThrows(() => l("\x04\x08", "l-", 2, "\x00\x00\x00\x40"), SyntaxError);
  assertThrows(() => l("\x04\x08", "l-", 2, "\x00\x00\x00\x00"), SyntaxError);
  assertThrows(() => l("\x04\x08", "l+", 2, "\x00\x00\x00\x00"), SyntaxError);
  assertThrows(() => l("\x04\x08", "l+", 2, "\xFF\xFF\xFF\x3F"), SyntaxError);
  // Redundant 3-word form (0 to 0xFFFFFFFF in either sign)
  assertThrows(
    () => l("\x04\x08", "l+", 3, "\x00\x00\x00\x00\x00\x00"),
    SyntaxError,
  );
  assertThrows(
    () => l("\x04\x08", "l+", 3, "\xFF\xFF\xFF\xFF\x00\x00"),
    SyntaxError,
  );
  assertThrows(
    () => l("\x04\x08", "l-", 3, "\x00\x00\x00\x00\x00\x00"),
    SyntaxError,
  );
  assertThrows(
    () => l("\x04\x08", "l-", 3, "\xFF\xFF\xFF\xFF\x00\x00"),
    SyntaxError,
  );
});

Deno.test("load loads Float", () => {
  // Non-finite values
  // "nan"
  assertEquals(l("\x04\x08", "f", 3, "nan"), NaN);
  // "inf"
  assertEquals(l("\x04\x08", "f", 3, "inf"), Infinity);
  // "-inf"
  assertEquals(l("\x04\x08", "f", 4, "-inf"), -Infinity);

  // Zeroes
  // "0"
  assertStrictEquals(l("\x04\x08", "f", 1, "0"), 0);
  // "-0"
  assertStrictEquals(l("\x04\x08", "f", 2, "-0"), -0);

  // Integers in non-scientific notation
  // "1"
  assertEquals(l("\x04\x08", "f", 1, "1"), 1);
  // "-1"
  assertEquals(l("\x04\x08", "f", 2, "-1"), -1);
  // "9007199254740992"
  assertEquals(
    l("\x04\x08", "f", 16, "9007199254740992"),
    9007199254740992e+0,
  );
  // "72057594037927896"
  assertEquals(
    l("\x04\x08", "f", 17, "72057594037927896"),
    72057594037927896e+0,
  );
  // "-9007199254740992"
  assertEquals(
    l("\x04\x08", "f", 17, "-9007199254740992"),
    -9007199254740992e+0,
  );
  // "-72057594037927896"
  assertEquals(
    l("\x04\x08", "f", 18, "-72057594037927896"),
    -72057594037927896e+0,
  );

  // Integers in scientific notation
  // "1e1"
  assertEquals(l("\x04\x08", "f", 3, "1e1"), 10);
  // "-1e1"
  assertEquals(l("\x04\x08", "f", 4, "-1e1"), -10);
  // "1.7976931348623157e308"
  assertEquals(
    l("\x04\x08", "f", 22, "1.7976931348623157e308"),
    1.7976931348623157e+308,
  );
  // "-1.7976931348623157e308"
  assertEquals(
    l("\x04\x08", "f", 23, "-1.7976931348623157e308"),
    -1.7976931348623157e+308,
  );

  // Non-scientific fractions
  // "0.0001"
  assertEquals(l("\x04\x08", "f", 6, "0.0001"), 0.0001);
  // "-0.0001"
  assertEquals(l("\x04\x08", "f", 7, "-0.0001"), -0.0001);

  // Scientific fractions
  // "9.999999999999999e-5"
  assertEquals(
    l("\x04\x08", "f", 20, "9.999999999999999e-5"),
    9.999999999999999e-5,
  );
  // "-9.999999999999999e-5"
  assertEquals(
    l("\x04\x08", "f", 21, "-9.999999999999999e-5"),
    -9.999999999999999e-5,
  );
  // "5e-324"
  assertEquals(l("\x04\x08", "f", 6, "5e-324"), 5e-324);
  // "-5e-324"
  assertEquals(l("\x04\x08", "f", 7, "-5e-324"), -5e-324);
});

Deno.test("load loads Symbol", () => {
  // assertEquals(l([0x04, 0x08, 0x3A, 0x08, 0x66, 0x6F, 0x6F]), "foo");
  assertEquals(l("\x04\x08", ":", 3, "foo"), "foo");
  assertEquals(
    l("\x04\x08", ":", 3, "\xE3\x81\x82"),
    RSymbol(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.ASCII_8BIT),
  );
  assertEquals(
    l("\x04\x08", "I:", 3, "\xE3\x81\x82", 1, ":", 1, "E", "T"),
    "あ",
  );
  // TODO
  // assertEquals(
  //   ll(
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
  //   RSymbol(Uint8Array.from([0x82, 0xA0]), {
  //     encoding: REncoding.Windows_31J,
  //   }),
  // );
});

Deno.test("load rejects invalid Symbol", () => {
  // Redundant E=false clause
  assertThrows(
    () => l("\x04\x08", "I:", 3, "foo", 1, ":", 1, "EF"),
    SyntaxError,
  );
});

Deno.test("load loads Symbol link", () => {
  assertEquals(
    l("\x04\x08", "[", 2, ":", 3, "foo", ";", 0),
    new RArray(["foo", "foo"]),
  );
  assertEquals(
    l("\x04\x08", "[", 4, ":", 3, "foo", ":", 3, "bar", ";", 1, ";", 0),
    new RArray(["foo", "bar", "bar", "foo"]),
  );
  assertEquals(
    l(
      "\x04\x08",
      "[",
      3,
      ...["I:", 3, "\xE3\x81\x82", 1, ":", 1, "E", "T"],
      ...[";", 0],
      ...[";", 1],
    ),
    new RArray(["あ", "あ", "E"]),
  );
  assertEquals(
    l(
      "\x04\x08",
      "[",
      2,
      ...["I:", 3, "\xE3\x81\x82", 1, ":", 1, "E", "T"],
      ...["I:", 3, "\xE3\x81\x84", 1, ";", 1, "T"],
    ),
    new RArray(["あ", "い"]),
  );
});

Deno.test("load loads Object", () => {
  assertEquals(
    l("\x04\x08", "o:", 6, "Object", 0),
    new RObject("Object"),
  );
  assertEquals(
    l(
      "\x04\x08",
      "o",
      ...[":", 7, "MyClass"],
      2,
      ...[":", 4, "@foo", "i", 42],
      ...[":", 4, "@bar", ":", 3, "baz"],
    ),
    new RObject("MyClass", { "@foo": 42n, "@bar": "baz" }),
  );
});

Deno.test("load loads Array", () => {
  assertEquals(l("\x04\x08", "[", 0), new RArray([]));
  assertEquals(l("\x04\x08", "[", 2, "i", 42, "0"), new RArray([42n, null]));
  assertEquals(
    l("\x04\x08", "I[", 1, "0", 1, ":", 4, "@foo", "i", 42),
    new RArray([null], { ivars: { "@foo": 42n } }),
  );
});

function setupLink<const T extends unknown[]>(
  values: T,
  callback: (...values: T) => void,
): T[0] {
  callback(...values);
  return values[0];
}

Deno.test("load loads Hash", () => {
  assertEquals(l("\x04\x08", "{", 0), new RHash());
  assertEquals(
    l("\x04\x08", "{", 2, "i", 42, "0", "i", 100, "F"),
    new RHash([[42n, null], [100n, false]]),
  );
  assertEquals(
    l("\x04\x08", "I{", 1, "0", "0", 1, ":", 4, "@foo", "i", 42),
    new RHash([[null, null]], { ivars: { "@foo": 42n } }),
  );

  assertEquals(
    l("\x04\x08", "}", 0, "i", 42),
    new RHash([], { defaultValue: 42n }),
  );
  assertEquals(
    l("\x04\x08", "}", 2, "i", 42, "0", "i", 100, "F", "i", 42),
    new RHash([[42n, null], [100n, false]], { defaultValue: 42n }),
  );
  assertEquals(
    l("\x04\x08", "I}", 1, "0", "0", "i", 42, 1, ":", 4, "@foo", "i", 42),
    new RHash([[null, null]], { ivars: { "@foo": 42n }, defaultValue: 42n }),
  );
});

Deno.test("load loads String", () => {
  assertEquals(
    l("\x04\x08", '"', 3, "foo"),
    new RString("foo", { encoding: REncoding.ASCII_8BIT }),
  );
  assertEquals(
    l("\x04\x08", '"', 3, "\xE3\x81\x82"),
    new RString(Uint8Array.from([0xE3, 0x81, 0x82]), {
      encoding: REncoding.ASCII_8BIT,
    }),
  );
  assertEquals(
    l("\x04\x08", 'I"', 3, "\xE3\x81\x82", 1, ":", 1, "E", "T"),
    new RString("あ"),
  );
  // // TODO
  // assertEquals(
  //   l(
  //     "\x04\x08",
  //     '":',
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
  //   new RString(Uint8Array.from([0x82, 0xA0]), {
  //     encoding: REncoding.Windows_31J,
  //   }),
  // );
  assertEquals(
    l("\x04\x08", 'I"', 3, "foo", 1, ":", 4, "@foo", "i", 42),
    new RString("foo", {
      encoding: REncoding.ASCII_8BIT,
      ivars: { "@foo": 42n },
    }),
  );
  assertEquals(
    l(
      "\x04\x08",
      "I",
      ...['"', 3, "\xE3\x81\x82"],
      2,
      ...[":", 1, "E", "T"],
      ...[":", 4, "@foo", "i", 42],
    ),
    new RString("あ", { ivars: { "@foo": 42n } }),
  );
});

Deno.test("load loads links", () => {
  // Cycle
  assertEquals(
    l("\x04\x08", "[", 1, "@", 0),
    setupLink([new RArray()], (a) => a.elements.push(a)),
  );
  // Shared reference
  assertEquals(
    l("\x04\x08", "[", 2, "[", 0, "@", 1),
    setupLink([new RArray(), new RArray()], (a, b) => a.elements.push(b, b)),
  );
  // Skips nil
  assertEquals(
    l("\x04\x08", "[", 3, "0", "[", 0, "@", 1),
    setupLink(
      [new RArray(), new RArray()],
      (a, b) => a.elements.push(null, b, b),
    ),
  );
  // Skips false
  assertEquals(
    l("\x04\x08", "[", 3, "F", "[", 0, "@", 1),
    setupLink(
      [new RArray(), new RArray()],
      (a, b) => a.elements.push(false, b, b),
    ),
  );
  // Skips true
  assertEquals(
    l("\x04\x08", "[", 3, "T", "[", 0, "@", 1),
    setupLink(
      [new RArray(), new RArray()],
      (a, b) => a.elements.push(true, b, b),
    ),
  );
  // Skips Fixnum
  assertEquals(
    l("\x04\x08", "[", 3, "i", 42, "[", 0, "@", 1),
    setupLink(
      [new RArray(), new RArray()],
      (a, b) => a.elements.push(42n, b, b),
    ),
  );
  // Skips Symbol
  assertEquals(
    l("\x04\x08", "[", 3, ":", 3, "foo", "[", 0, "@", 1),
    setupLink(
      [new RArray(), new RArray()],
      (a, b) => a.elements.push("foo", b, b),
    ),
  );
  // Counts Bignum
  assertEquals(
    l(
      "\x04\x08",
      "[",
      3,
      ...["l+", 3, "\x00\x00\x00\x00\x01\x00"],
      ...["[", 0],
      ...["@", 2],
    ),
    setupLink(
      [new RArray(), new RArray()],
      (a, b) => a.elements.push(0x100000000n, b, b),
    ),
  );
  // Allows unlinked Bignums
  assertEquals(
    l(
      "\x04\x08",
      "[",
      2,
      ...["l+", 3, "\x00\x00\x00\x00\x01\x00"],
      ...["l+", 3, "\x00\x00\x00\x00\x01\x00"],
    ),
    new RArray([0x100000000n, 0x100000000n]),
  );
  // Allows linked Bignums
  assertEquals(
    l(
      "\x04\x08",
      "[",
      2,
      ...["l+", 3, "\x00\x00\x00\x00\x01\x00"],
      ...["@", 1],
    ),
    new RArray([0x100000000n, 0x100000000n]),
  );
  // Counts Float
  assertEquals(
    l(
      "\x04\x08",
      "[",
      3,
      ...["f", 1, "1"],
      ...["[", 0],
      ...["@", 2],
    ),
    setupLink(
      [new RArray(), new RArray()],
      (a, b) => a.elements.push(1, b, b),
    ),
  );
  // Allows linked Floats
  assertEquals(
    l(
      "\x04\x08",
      "[",
      2,
      ...["f", 1, "1"],
      ...["f", 1, "1"],
    ),
    new RArray([1, 1]),
  );
  // Allows unlinked Floats
  assertEquals(
    l(
      "\x04\x08",
      "[",
      2,
      ...["f", 1, "1"],
      ...["@", 1],
    ),
    new RArray([1, 1]),
  );
});
