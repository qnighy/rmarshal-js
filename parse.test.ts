import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import {
  MarshalBoolean,
  MarshalFloat,
  MarshalInteger,
  MarshalNil,
  MarshalSymbol,
  type MarshalValue,
} from "./ast.ts";
import { parse } from "./parse.ts";
import { seq, type SeqElement } from "./testutil.ts";
import { REncoding, RSymbol } from "./rom.ts";

function p(...elems: SeqElement[]): MarshalValue {
  return parse(seq(...elems));
}

Deno.test("parse parses something", () => {
  assertEquals(p("\x04\x08", "0"), MarshalNil());
});

Deno.test("parse rejects short or long data", () => {
  assertThrows(() => p("\x04\x08"), SyntaxError, "Unexpected end of input");
  assertThrows(
    () => p("\x04\x08", "0", "0"),
    SyntaxError,
    "Unexpected trailing data",
  );
  // for #readByteSlice
  assertThrows(
    () => p("\x04\x08", "f", 1),
    SyntaxError,
    "Unexpected end of input",
  );
});

Deno.test("parse rejects invalid versions", () => {
  assertThrows(
    () => p("\x03\x08", "0"),
    SyntaxError,
    "Unsupported marshal version: 3.8 (expected 4.0 to 4.8)",
  );
  assertThrows(
    () => p("\x05\x08", "0"),
    SyntaxError,
    "Unsupported marshal version: 5.8 (expected 4.0 to 4.8)",
  );
  assertThrows(
    () => p("\x04\x09", "0"),
    SyntaxError,
    "Unsupported marshal version: 4.9 (expected 4.0 to 4.8)",
  );
  assertEquals(p("\x04\x07", "0"), MarshalNil());
});

Deno.test("parse parses nil", () => {
  assertEquals(p("\x04\x08", "0"), MarshalNil());
});

Deno.test("parse parses boolean", () => {
  assertEquals(p("\x04\x08", "F"), MarshalBoolean(false));
  assertEquals(p("\x04\x08", "T"), MarshalBoolean(true));
});

Deno.test("parse parses Fixnum zero", () => {
  assertEquals(p("\x04\x08", "i\x00"), MarshalInteger(0n));
});

Deno.test("parse parses Fixnum in positive short form", () => {
  assertEquals(p("\x04\x08", "i\x06"), MarshalInteger(1n));
  assertEquals(p("\x04\x08", "i\x7F"), MarshalInteger(122n));
});

Deno.test("parse rejects Fixnum non-canonical positive short form of zero", () => {
  assertThrows(
    () => p("\x04\x08", "i\x05"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
});

Deno.test("parse parses Fixnum in negative short form", () => {
  assertEquals(p("\x04\x08", "i\xFA"), MarshalInteger(-1n));
  assertEquals(p("\x04\x08", "i\x80"), MarshalInteger(-123n));
});

Deno.test("parse rejects Fixnum non-canonical negative short form of zero", () => {
  assertThrows(
    () => p("\x04\x08", "i\xFB"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
});

Deno.test("parse parses Fixnum in positive 1-byte form", () => {
  assertEquals(p("\x04\x08", "i\x01\x7B"), MarshalInteger(123n));
  assertEquals(p("\x04\x08", "i\x01\xFF"), MarshalInteger(255n));
});

Deno.test("parse rejects Fixnum redundant positive 1-byte form (0 to 122)", () => {
  assertThrows(
    () => p("\x04\x08", "i\x01\x00"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
  assertThrows(
    () => p("\x04\x08", "i\x01\x7A"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
});

Deno.test("parse parses Fixnum in negative 1-byte form", () => {
  assertEquals(p("\x04\x08", "i\xFF\x84"), MarshalInteger(-124n));
  assertEquals(p("\x04\x08", "i\xFF\x00"), MarshalInteger(-256n));
});

Deno.test("parse rejects Fixnum redundant negative 1-byte form (-123 to -1)", () => {
  assertThrows(
    () => p("\x04\x08", "i\xFF\x85"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
  assertThrows(
    () => p("\x04\x08", "i\xFF\xFF"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
});

Deno.test("parse parses Fixnum in Fixnum in positive 2-byte form", () => {
  assertEquals(p("\x04\x08", "i\x02\x00\x01"), MarshalInteger(256n));
  assertEquals(p("\x04\x08", "i\x02\xFF\xFF"), MarshalInteger(0xFFFFn));
});

Deno.test("parse rejects Fixnum redundant positive 2-byte form (0 to 255)", () => {
  assertThrows(
    () => p("\x04\x08", "i\x02\x00\x00"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
  assertThrows(
    () => p("\x04\x08", "i\x02\xFF\x00"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
});

Deno.test("parse parses Fixnum in negative 2-byte form", () => {
  assertEquals(p("\x04\x08", "i\xFE\xFF\xFE"), MarshalInteger(-257n));
  assertEquals(p("\x04\x08", "i\xFE\x00\x00"), MarshalInteger(-0x10000n));
});

Deno.test("parse rejects Fixnum redundant negative 2-byte form (-256 to -1)", () => {
  assertThrows(
    () => p("\x04\x08", "i\xFE\xFF\xFF"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
  assertThrows(
    () => p("\x04\x08", "i\xFE\x00\xFF"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
});

Deno.test("parse parses Fixnum in positive 3-byte form", () => {
  assertEquals(p("\x04\x08", "i\x03\x00\x00\x01"), MarshalInteger(0x10000n));
  assertEquals(p("\x04\x08", "i\x03\xFF\xFF\xFF"), MarshalInteger(0xFFFFFFn));
});

Deno.test("parse rejects Fixnum redundant positive 3-byte form (0 to 65535)", () => {
  assertThrows(
    () => p("\x04\x08", "i\x03\x00\x00\x00"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
  assertThrows(
    () => p("\x04\x08", "i\x03\xFF\xFF\x00"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
});

Deno.test("parse parses Fixnum in negative 3-byte form", () => {
  assertEquals(p("\x04\x08", "i\xFD\xFF\xFF\xFE"), MarshalInteger(-0x10001n));
  assertEquals(p("\x04\x08", "i\xFD\x00\x00\x00"), MarshalInteger(-0x1000000n));
});

Deno.test("parse rejects Fixnum redundant negative 3-byte form (-65536 to -1)", () => {
  assertThrows(
    () => p("\x04\x08", "i\xFD\xFF\xFF\xFF"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
  assertThrows(
    () => p("\x04\x08", "i\xFD\x00\x00\xFF"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
});

Deno.test("parse parses Fixnum in positive 4-byte form", () => {
  assertEquals(
    p("\x04\x08", "i\x04\x00\x00\x00\x01"),
    MarshalInteger(0x1000000n),
  );
  assertEquals(
    p("\x04\x08", "i\x04\xFF\xFF\xFF\x3F"),
    MarshalInteger(0x3FFFFFFFn),
  );
});

Deno.test("parse rejects Fixnum redundant positive 4-byte form (0 to 16777215)", () => {
  assertThrows(
    () => p("\x04\x08", "i\x04\x00\x00\x00\x00"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
  assertThrows(
    () => p("\x04\x08", "i\x04\xFF\xFF\xFF\x00"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
});

Deno.test("parse rejects Fixnum too large for 31bit positive", () => {
  assertThrows(
    () => p("\x04\x08", "i\x04\x00\x00\x00\x40"),
    SyntaxError,
    "Integer too large for 31bit",
  );
  assertThrows(
    () => p("\x04\x08", "i\x04\xFF\xFF\xFF\x7F"),
    SyntaxError,
    "Integer too large for 31bit",
  );
  assertThrows(
    () => p("\x04\x08", "i\x04\x00\x00\x00\x80"),
    SyntaxError,
    "Integer too large for 32bit",
  );
  assertThrows(
    () => p("\x04\x08", "i\x04\xFF\xFF\xFF\xFF"),
    SyntaxError,
    "Integer too large for 32bit",
  );
});

Deno.test("parse parses Fixnum in negative 4-byte form", () => {
  assertEquals(
    p("\x04\x08", "i\xFC\xFF\xFF\xFF\xFE"),
    MarshalInteger(-0x1000001n),
  );
  assertEquals(
    p("\x04\x08", "i\xFC\x00\x00\x00\xC0"),
    MarshalInteger(-0x40000000n),
  );
});

Deno.test("parse rejects Fixnum redundant negative 4-byte form (-16777216 to -1)", () => {
  assertThrows(
    () => p("\x04\x08", "i\xFC\xFF\xFF\xFF\xFF"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
  assertThrows(
    () => p("\x04\x08", "i\xFC\x00\x00\x00\xFF"),
    SyntaxError,
    "Non-canonical Fixnum representation",
  );
});

Deno.test("parse rejects Fixnum too large for 31bit negative", () => {
  assertThrows(
    () => p("\x04\x08", "i\xFC\xFF\xFF\xFF\xBF"),
    SyntaxError,
    "Integer too large for 31bit",
  );
  assertThrows(
    () => p("\x04\x08", "i\xFC\x00\x00\x00\x80"),
    SyntaxError,
    "Integer too large for 31bit",
  );
  assertThrows(
    () => p("\x04\x08", "i\xFC\xFF\xFF\xFF\x7F"),
    SyntaxError,
    "Integer too large for 32bit",
  );
  assertThrows(
    () => p("\x04\x08", "i\xFC\x00\x00\x00\x00"),
    SyntaxError,
    "Integer too large for 32bit",
  );
});

Deno.test("parse rejects Bignum with invalid sign", () => {
  assertThrows(
    () => p("\x04\x08", "l.", 2, "\x00\x00\x00\x40"),
    SyntaxError,
    "Invalid Bignum sign byte",
  );
});

Deno.test("parse rejects Bignum with negative length", () => {
  assertThrows(
    () => p("\x04\x08", "l+\xFA"),
    SyntaxError,
    "Negative index or length",
  );
});

Deno.test("parse rejects Bignum in non-canonical positive 0-word form", () => {
  assertThrows(
    () => p("\x04\x08", "l+", 0),
    SyntaxError,
    "Incorrect Fixnum representation as Bignum",
  );
});

Deno.test("parse rejects Bignum in non-canonical negative 0-word form", () => {
  assertThrows(
    () => p("\x04\x08", "l-", 0),
    SyntaxError,
    "Incorrect Fixnum representation as Bignum",
  );
});

Deno.test("parse rejects Bignum in non-canonical positive 1-word form", () => {
  assertThrows(
    () => p("\x04\x08", "l+", 1, "\x00\x00"),
    SyntaxError,
    "Incorrect Fixnum representation as Bignum",
  );
  assertThrows(
    () => p("\x04\x08", "l+", 1, "\xFF\xFF"),
    SyntaxError,
    "Incorrect Fixnum representation as Bignum",
  );
});

Deno.test("parse rejects Bignum in non-canonical negative 1-word form", () => {
  assertThrows(
    () => p("\x04\x08", "l-", 1, "\x00\x00"),
    SyntaxError,
    "Incorrect Fixnum representation as Bignum",
  );
  assertThrows(
    () => p("\x04\x08", "l-", 1, "\xFF\xFF"),
    SyntaxError,
    "Incorrect Fixnum representation as Bignum",
  );
});

Deno.test("parse parses Bignum - positive 2-word form", () => {
  assertEquals(
    p("\x04\x08", "l+", 2, "\x00\x00\x00\x40"),
    MarshalInteger(1073741824n),
  );
  assertEquals(
    p("\x04\x08", "l+", 2, "\xFF\xFF\xFF\xFF"),
    MarshalInteger(4294967295n),
  );
});

Deno.test("parse rejects Bignum non-canonical positive 2-word form", () => {
  assertThrows(
    () => p("\x04\x08", "l+", 2, "\x00\x00\x00\x00"),
    SyntaxError,
    "Incorrect Fixnum representation as Bignum",
  );
  assertThrows(
    () => p("\x04\x08", "l+", 2, "\xFF\xFF\xFF\x3F"),
    SyntaxError,
    "Incorrect Fixnum representation as Bignum",
  );
});

Deno.test("parse parses Bignum - negative 2-word form", () => {
  assertEquals(
    p("\x04\x08", "l-", 2, "\x01\x00\x00\x40"),
    MarshalInteger(-1073741825n),
  );
  assertEquals(
    p("\x04\x08", "l-", 2, "\xFF\xFF\xFF\xFF"),
    MarshalInteger(-4294967295n),
  );
});

Deno.test("parse rejects Bignum non-canonical negative 2-word form", () => {
  assertThrows(
    () => p("\x04\x08", "l-", 2, "\x00\x00\x00\x00"),
    SyntaxError,
    "Incorrect Fixnum representation as Bignum",
  );
  assertThrows(
    () => p("\x04\x08", "l-", 2, "\x00\x00\x00\x40"),
    SyntaxError,
    "Incorrect Fixnum representation as Bignum",
  );
});

Deno.test("parse parses Bignum - positive 3-word form", () => {
  assertEquals(
    p("\x04\x08", "l+", 3, "\x00\x00\x00\x00\x01\x00"),
    MarshalInteger(4294967296n),
  );
  assertEquals(
    p("\x04\x08", "l+", 3, "\xFF\xFF\xFF\xFF\xFF\xFF"),
    MarshalInteger(281474976710655n),
  );
});

Deno.test("parse rejects Bignum redundant positive 3-word form", () => {
  assertThrows(
    () => p("\x04\x08", "l+", 3, "\x00\x00\x00\x00\x00\x00"),
    SyntaxError,
    "Non-canonical Bignum representation",
  );
  assertThrows(
    () => p("\x04\x08", "l+", 3, "\xFF\xFF\xFF\xFF\x00\x00"),
    SyntaxError,
    "Non-canonical Bignum representation",
  );
});

Deno.test("parse parses Bignum - negative 3-word form", () => {
  assertEquals(
    p("\x04\x08", "l-", 3, "\x00\x00\x00\x00\x01\x00"),
    MarshalInteger(-4294967296n),
  );
  assertEquals(
    p("\x04\x08", "l-", 3, "\xFF\xFF\xFF\xFF\xFF\xFF"),
    MarshalInteger(-281474976710655n),
  );
});

Deno.test("parse rejects Bignum redundant negative 3-word form", () => {
  assertThrows(
    () => p("\x04\x08", "l-", 3, "\x00\x00\x00\x00\x00\x00"),
    SyntaxError,
    "Non-canonical Bignum representation",
  );
  assertThrows(
    () => p("\x04\x08", "l-", 3, "\xFF\xFF\xFF\xFF\x00\x00"),
    SyntaxError,
    "Non-canonical Bignum representation",
  );
});

Deno.test("parse rejects empty Float", () => {
  assertThrows(
    () => p("\x04\x08", "f", 0),
    SyntaxError,
    "Invalid Float format",
  );
});

Deno.test("parse parses NaN", () => {
  assertEquals(p("\x04\x08", "f", 3, "nan"), MarshalFloat(NaN));
});

Deno.test("parse parses alternative allowed NaN representations", () => {
  assertEquals(p("\x04\x08", "f", 4, "-nan"), MarshalFloat(NaN));
  assertEquals(p("\x04\x08", "f", 12, "nan(ignored)"), MarshalFloat(NaN));
  assertEquals(p("\x04\x08", "f", 13, "-nan(ignored)"), MarshalFloat(NaN));
});

Deno.test("parse rejects other non-canonical NaNs", () => {
  assertThrows(
    () => p("\x04\x08", "f", 3, "NaN"),
    SyntaxError,
    "Invalid Float format",
  );
  assertThrows(
    () => p("\x04\x08", "f", 11, "nan ignored"),
    SyntaxError,
    "Invalid Float format",
  );
});

Deno.test("parse parses Infinity and -Infinity", () => {
  assertEquals(p("\x04\x08", "f", 3, "inf"), MarshalFloat(Infinity));
  assertEquals(p("\x04\x08", "f", 4, "-inf"), MarshalFloat(-Infinity));
});

Deno.test("parse parses alternative allowed Infinity representations", () => {
  assertEquals(p("\x04\x08", "f", 8, "infinity"), MarshalFloat(Infinity));
  assertEquals(p("\x04\x08", "f", 9, "-infinity"), MarshalFloat(-Infinity));
});

Deno.test("parse rejects other non-canonical Infinities", () => {
  assertThrows(
    () => p("\x04\x08", "f", 3, "INF"),
    SyntaxError,
    "Invalid Float format",
  );
  assertThrows(
    () => p("\x04\x08", "f", 3, "Inf"),
    SyntaxError,
    "Invalid Float format",
  );
  assertThrows(
    () => p("\x04\x08", "f", 8, "Infinity"),
    SyntaxError,
    "Invalid Float format",
  );
});

Deno.test("parse parses zeroes", () => {
  assertEquals(p("\x04\x08", "f", 1, "0"), MarshalFloat(0));
  assertStrictEquals((p("\x04\x08", "f", 1, "0") as MarshalFloat).value, +0);
  assertEquals(p("\x04\x08", "f", 2, "-0"), MarshalFloat(-0));
  assertStrictEquals((p("\x04\x08", "f", 2, "-0") as MarshalFloat).value, -0);
});

Deno.test("parse rejects plus signs", () => {
  assertThrows(
    () => p("\x04\x08", "f", 2, "+0"),
    SyntaxError,
    "Invalid Float format",
  );
});

Deno.test("parse rejects leading zeroes", () => {
  assertThrows(
    () => p("\x04\x08", "f", 2, "00"),
    SyntaxError,
    "Invalid Float format",
  );
  assertThrows(
    () => p("\x04\x08", "f", 2, "01"),
    SyntaxError,
    "Invalid Float format",
  );
});

Deno.test("parse parses Float integers in non-scientific notation", () => {
  assertEquals(p("\x04\x08", "f", 1, "1"), MarshalFloat(1));
  assertEquals(p("\x04\x08", "f", 2, "-1"), MarshalFloat(-1));
  assertEquals(
    p("\x04\x08", "f", 16, "9007199254740992"),
    MarshalFloat(9007199254740992.0),
  );
  assertEquals(
    p("\x04\x08", "f", 17, "72057594037927896"),
    MarshalFloat(72057594037927896.0),
  );
  assertEquals(
    p("\x04\x08", "f", 17, "-9007199254740992"),
    MarshalFloat(-9007199254740992.0),
  );
  assertEquals(
    p("\x04\x08", "f", 18, "-72057594037927896"),
    MarshalFloat(-72057594037927896.0),
  );
});

Deno.test("parse rejects trailing decimal point", () => {
  assertThrows(
    () => p("\x04\x08", "f", 2, "1."),
    SyntaxError,
    "Invalid Float format",
  );
});

Deno.test("parse rejects trailing zeroes in fraction", () => {
  assertThrows(
    () => p("\x04\x08", "f", 3, "1.0"),
    SyntaxError,
    "Invalid Float format",
  );
});

Deno.test("parse parses Float integers in scientific notation", () => {
  assertEquals(p("\x04\x08", "f", 3, "1e1"), MarshalFloat(10));
  assertEquals(p("\x04\x08", "f", 4, "-1e1"), MarshalFloat(-10));
  assertEquals(
    p("\x04\x08", "f", 22, "1.7976931348623157e308"),
    MarshalFloat(1.7976931348623157e+308),
  );
  assertEquals(
    p("\x04\x08", "f", 23, "-1.7976931348623157e308"),
    MarshalFloat(-1.7976931348623157e+308),
  );
});

Deno.test("parse parses alternative plus sign in exponent", () => {
  assertEquals(p("\x04\x08", "f", 4, "1e+1"), MarshalFloat(10));
  assertEquals(p("\x04\x08", "f", 5, "-1e+1"), MarshalFloat(-10));
});

Deno.test("parse rejects capital E in exponent", () => {
  assertThrows(
    () => p("\x04\x08", "f", 3, "1E1"),
    SyntaxError,
    "Invalid Float format",
  );
});

Deno.test("parse rejects small fraction in scientific notation", () => {
  assertThrows(
    () => p("\x04\x08", "f", 5, "0.1e2"),
    SyntaxError,
    "Invalid Float format",
  );
});

Deno.test("parse rejects large fraction in scientific notation", () => {
  assertThrows(
    () => p("\x04\x08", "f", 4, "11e1"),
    SyntaxError,
    "Invalid Float format",
  );
});

Deno.test("parse rejects zero exponent", () => {
  assertThrows(
    () => p("\x04\x08", "f", 3, "1e0"),
    SyntaxError,
    "Invalid Float format",
  );
});

Deno.test("parse rejects leading zeroes in exponent", () => {
  assertThrows(
    () => p("\x04\x08", "f", 4, "1e01"),
    SyntaxError,
    "Invalid Float format",
  );
});

Deno.test("parse parses Float non-scientific fractions", () => {
  assertEquals(p("\x04\x08", "f", 3, "1.1"), MarshalFloat(1.1));
  assertEquals(p("\x04\x08", "f", 4, "-1.1"), MarshalFloat(-1.1));
  assertEquals(p("\x04\x08", "f", 6, "0.0001"), MarshalFloat(0.0001));
  assertEquals(p("\x04\x08", "f", 7, "-0.0001"), MarshalFloat(-0.0001));
});

Deno.test("parse parses Float scientific fractions", () => {
  assertEquals(
    p("\x04\x08", "f", 20, "9.999999999999999e-5"),
    MarshalFloat(9.999999999999999e-5),
  );
  assertEquals(
    p("\x04\x08", "f", 21, "-9.999999999999999e-5"),
    MarshalFloat(-9.999999999999999e-5),
  );
  assertEquals(p("\x04\x08", "f", 6, "5e-324"), MarshalFloat(5e-324));
  assertEquals(p("\x04\x08", "f", 7, "-5e-324"), MarshalFloat(-5e-324));
});

Deno.test("parse parses Symbol - US-ASCII", () => {
  // assertEquals(generate(MarshalSymbol("foo")), seq("\x04\x08", ":", 3, "foo"));
  assertEquals(p("\x04\x08", ":", 3, "foo"), MarshalSymbol("foo"));
});

Deno.test("parse parses Symbol - ASCII-8BIT", () => {
  // assertEquals(
  //   generate(
  //     MarshalSymbol(
  //       RSymbol(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.ASCII_8BIT),
  //     ),
  //   ),
  //   seq("\x04\x08", ":", 3, "\xE3\x81\x82"),
  // );
  assertEquals(
    p("\x04\x08", ":", 3, "\xE3\x81\x82"),
    MarshalSymbol(
      RSymbol(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.ASCII_8BIT),
    ),
  );
});

Deno.test("parse parses Symbol - UTF-8", () => {
  // assertEquals(
  //   generate(MarshalSymbol("あ")),
  //   seq("\x04\x08", "I:", 3, "\xE3\x81\x82", 1, ":", 1, "E", "T"),
  // );
  assertEquals(
    p("\x04\x08", "I:", 3, "\xE3\x81\x82", 1, ":", 1, "E", "T"),
    MarshalSymbol("あ"),
  );
});

// Deno.test("parse parses Symbol - other encoding", () => {
//   assertEquals(
//     p(
//       "\x04\x08",
//       "I:",
//       2,
//       "\x82\xA0",
//       1,
//       ":",
//       8,
//       "encoding",
//       '"',
//       11,
//       "Windows-31J",
//     ),
//     MarshalSymbol(
//       RSymbol(Uint8Array.from([0x82, 0xA0]), REncoding.Windows_31J),
//     ),
//   );
// });

Deno.test("parse rejects Symbol with incorrectly-encoded contents", () => {
  assertThrows(
    () => p("\x04\x08", "I:", 3, "\xE3\x81\x72", 1, ":", 1, "E", "T"),
    TypeError,
    "Got an invalid byte sequence as a symbol source",
  );
});

Deno.test("parse rejects Symbol with explicit US-ASCII specification", () => {
  assertThrows(
    () => p("\x04\x08", "I:", 3, "foo", 1, ":", 1, "E", "F"),
    SyntaxError,
    "Invalid explicit encoding: US-ASCII",
  );
});

Deno.test("parse rejects Symbol with ASCII-only contents and explicit encoding", () => {
  assertThrows(
    () => p("\x04\x08", "I:", 3, "foo", 1, ":", 1, "E", "T"),
    SyntaxError,
    "Redundant encoding specifier in ASCII Symbol",
  );
});

Deno.test("parse rejects Symbol with explicit zero ivars", () => {
  assertThrows(
    () => p("\x04\x08", "I:", 3, "foo", 0),
    SyntaxError,
    "Redundant ivar container with no ivars",
  );
});

Deno.test("parse rejects Symbol with many ivars", () => {
  assertThrows(
    () =>
      p("\x04\x08", "I:", 3, "foo", 2, ":", 1, "E", "T", 1, ":", 1, "K", "T"),
    SyntaxError,
    "Too many ivars for Symbol",
  );
});

Deno.test("parse rejects Symbol with non-encoding ivar", () => {
  assertThrows(
    () => p("\x04\x08", "I:", 3, "foo", 1, ":", 1, "K", "T"),
    SyntaxError,
    "Not an encoding ivar",
  );
});

Deno.test("parse rejects Symbol with invalid E value", () => {
  assertThrows(
    () => p("\x04\x08", "I:", 3, "foo", 1, ":", 1, "E", "i", 0),
    SyntaxError,
    "Invalid short encoding specifier",
  );
});
