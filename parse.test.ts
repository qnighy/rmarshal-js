import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import {
  MarshalArray,
  MarshalBoolean,
  MarshalFloat,
  MarshalHash,
  MarshalInteger,
  MarshalNil,
  MarshalObject,
  MarshalRegexp,
  MarshalString,
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
    () => p("\x04\x08", "I:", 3, "foo", 2, ":", 1, "E", "T", ":", 1, "K", "T"),
    SyntaxError,
    "Extra ivars for Symbol",
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

Deno.test("parse rejects Symbol which is unlinked duplicate", () => {
  assertThrows(
    () => p("\x04\x08", "[", 2, ":", 3, "foo", ":", 3, "foo"),
    SyntaxError,
    "Same symbol appeared twice",
  );
});

Deno.test("parse parses Symbol link - simple case", () => {
  assertEquals(
    p("\x04\x08", "[", 2, ":", 3, "foo", ";", 0),
    MarshalArray([MarshalSymbol("foo"), MarshalSymbol("foo")]),
  );
});

Deno.test("parse rejects Symbol link with negative index", () => {
  assertThrows(
    () => p("\x04\x08", ";\xFA"),
    SyntaxError,
    "Negative index or length",
  );
});

Deno.test("parse rejects Symbol link with unassigned index", () => {
  assertThrows(
    () => p("\x04\x08", ";", 0),
    SyntaxError,
    "Invalid symbol link",
  );
});

Deno.test("parse parses Symbol link - multiple links", () => {
  assertEquals(
    p("\x04\x08", "[", 4, ":", 3, "foo", ":", 3, "bar", ";", 1, ";", 0),
    MarshalArray([
      MarshalSymbol("foo"),
      MarshalSymbol("bar"),
      MarshalSymbol("bar"),
      MarshalSymbol("foo"),
    ]),
  );
});

Deno.test("parse parses Symbol link - symbols within symbols", () => {
  assertEquals(
    p(
      "\x04\x08",
      "[",
      3,
      ...["I:", 3, "\xE3\x81\x82", 1, ":", 1, "E", "T"],
      ...[";", 0],
      ...[";", 1],
    ),
    MarshalArray([
      MarshalSymbol("あ"),
      MarshalSymbol("あ"),
      MarshalSymbol("E"),
    ]),
  );
});

Deno.test("parse parses Symbol link - symbols with same encoding", () => {
  assertEquals(
    p(
      "\x04\x08",
      "[",
      2,
      ...["I:", 3, "\xE3\x81\x82", 1, ":", 1, "E", "T"],
      ...["I:", 3, "\xE3\x81\x84", 1, ";", 1, "T"],
    ),
    MarshalArray([MarshalSymbol("あ"), MarshalSymbol("い")]),
  );
});

Deno.test("parse rejects circular Symbol link", () => {
  assertThrows(
    () => p("\x04\x08", "I:", 3, "foo", 1, ";", 0),
    SyntaxError,
    "Circular symbol link",
  );
});

Deno.test("parse parses Symbol in Symbol context - simple case", () => {
  assertEquals(
    p("\x04\x08", "o:", 6, "Object", 0),
    MarshalObject("Object", new Map()),
  );
});

Deno.test("parse parses Symbol in Symbol context - UTF-8", () => {
  assertEquals(
    p("\x04\x08", "oI:", 4, "A\xE3\x81\x82", 1, ":", 1, "E", "T", 0),
    MarshalObject("Aあ", new Map()),
  );
});

Deno.test("parse rejects nested ivar container in Symbol context", () => {
  assertThrows(
    () =>
      p(
        "\x04\x08",
        "oII:",
        4,
        "A\xE3\x81\x82",
        ...[1, ":", 1, "E", "T"],
        ...[1, ";", 1, "T"],
        0,
      ),
    SyntaxError,
    "Nested instance variable container",
  );
});

Deno.test("parse rejects non-Symbols in Symbol context", () => {
  assertThrows(
    () => p("\x04\x08", "o0", 0),
    SyntaxError,
    "nil cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "oT", 0),
    SyntaxError,
    "true cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "oF", 0),
    SyntaxError,
    "false cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "oi", 0, 0),
    SyntaxError,
    "Integer (Fixnum) cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "ol+", 2, "\x00\x00\x00\x40", 0),
    SyntaxError,
    "Integer (Bignum) cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "of", 1, "1", 0),
    SyntaxError,
    "Float cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "oe:", 8, "MyModule", ":", 6, "Object", 0),
    SyntaxError,
    "singleton extension cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "oC:", 8, "MySymbol", ":", 6, "Object", 0),
    SyntaxError,
    "subclass of Array/Hash/String/Regexp cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "oo:", 6, "Object", 0, 0),
    SyntaxError,
    "Object cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "o[", 0, 0),
    SyntaxError,
    "Array cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "oI[", 0, 1, ":", 4, "@foo", "0", 0),
    SyntaxError,
    "Array cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "o{", 0, 0),
    SyntaxError,
    "Hash cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "o}", 0, "F", 0),
    SyntaxError,
    "Hash with default value cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "oI{", 0, 1, ":", 4, "@foo", "0", 0),
    SyntaxError,
    "Hash cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "oI}", 0, "F", 1, ":", 4, "@foo", "0", 0),
    SyntaxError,
    "Hash with default value cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", 'o"', 0, 0),
    SyntaxError,
    "String cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", 'oI"', 0, 1, ":", 4, "@foo", "0", 0),
    SyntaxError,
    "String cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "o/", 0, 0x30, 0),
    SyntaxError,
    "Regexp cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "oI/", 0, 0x30, ":", 4, "@foo", "0", 0),
    SyntaxError,
    "Regexp cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "oU:", 8, "MyObject", "0", 0),
    SyntaxError,
    "#marshal_dump cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "ou:", 8, "MyObject", 0, 0),
    SyntaxError,
    "#_dump cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "od:", 8, "MyObject", "0", 0),
    SyntaxError,
    "#_dump_data cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "oS:", 8, "MyStruct", 0, 0),
    SyntaxError,
    "Struct or Data cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "oc", 7, "MyClass", 0),
    SyntaxError,
    "Class cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "om", 8, "MyModule", 0),
    SyntaxError,
    "Module cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "oM", 8, "MyModule", 0),
    SyntaxError,
    "Class or Module cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "o@", 0, 0),
    SyntaxError,
    "Object link cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "o\x0F"),
    SyntaxError,
    "Unknown type 0x0F cannot be a Symbol",
  );
  assertThrows(
    () => p("\x04\x08", "o\x7E"),
    SyntaxError,
    "Unknown type 0x7E '~' cannot be a Symbol",
  );
});

Deno.test("parse parses Object - simple case", () => {
  assertEquals(
    p("\x04\x08", "o:", 6, "Object", 0),
    MarshalObject("Object", new Map()),
  );
  assertEquals(
    p("\x04\x08", "o:", 7, "MyClass", 0),
    MarshalObject("MyClass", new Map()),
  );
});

Deno.test("parse parses Object - with ivars", () => {
  assertEquals(
    p(
      "\x04\x08",
      "o",
      ...[":", 7, "MyClass"],
      2,
      ...[":", 4, "@foo", "i", 42],
      ...[":", 4, "@bar", ":", 3, "baz"],
    ),
    MarshalObject(
      "MyClass",
      new Map<RSymbol, MarshalValue>([
        ["@foo", MarshalInteger(42n)],
        ["@bar", MarshalSymbol("baz")],
      ]),
    ),
  );
});

Deno.test("parse rejects Object with duplicate ivar", () => {
  assertThrows(
    () => p("\x04\x08", "o:", 6, "Object", 2, ":", 4, "@foo", "0", ";", 1, "0"),
    SyntaxError,
    "Duplicate instance variable",
  );
});

Deno.test("parse parses Object - with extenders", () => {
  assertEquals(
    p(
      "\x04\x08",
      ...["e:", 4, "Mod1"],
      ...["eI:", 4, "M\xE3\x81\x82", 1, ":", 1, "E", "T"],
      "o:",
      7,
      "MyClass",
      0,
    ),
    MarshalObject("MyClass", new Map(), {
      extenders: ["Mod1", "Mあ"],
    }),
  );
});

Deno.test("parse parses Array - simple case", () => {
  assertEquals(p("\x04\x08", "[", 0), MarshalArray([]));
  assertEquals(
    p("\x04\x08", "[", 2, "i", 42, "0"),
    MarshalArray([MarshalInteger(42n), MarshalNil()]),
  );
});

Deno.test("parse parses Array - with ivars", () => {
  assertEquals(
    p("\x04\x08", "I[", 1, "0", 1, ":", 4, "@foo", "i", 42),
    MarshalArray([MarshalNil()], {
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
    }),
  );
});

Deno.test("parse parses Array - with custom class", () => {
  assertEquals(
    p("\x04\x08", "C:", 7, "MyArray", "[", 0),
    MarshalArray([], { className: "MyArray" }),
  );
});

Deno.test("parse parses Array - with extenders", () => {
  assertEquals(
    p("\x04\x08", ...["e:", 4, "Mod1"], "[", 0),
    MarshalArray([], { extenders: ["Mod1"] }),
  );
});

Deno.test("parse parses Array - with all", () => {
  assertEquals(
    p(
      "\x04\x08",
      "I",
      ...["e:", 4, "Mod1"],
      ...["C:", 7, "MyArray"],
      "[",
      0,
      1,
      ":",
      4,
      "@foo",
      "i",
      42,
    ),
    MarshalArray([], {
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
      className: "MyArray",
      extenders: ["Mod1"],
    }),
  );
});

Deno.test("parse parses Hash - simple case", () => {
  assertEquals(p("\x04\x08", "{", 0), MarshalHash([]));
  assertEquals(
    p("\x04\x08", "{", 2, "i", 42, "0", "i", 100, "F"),
    MarshalHash([
      [MarshalInteger(42n), MarshalNil()],
      [MarshalInteger(100n), MarshalBoolean(false)],
    ]),
  );
});

Deno.test("parse parses Hash - with ivars", () => {
  assertEquals(
    p(
      "\x04\x08",
      "I{",
      1,
      "0",
      "0",
      1,
      ":",
      4,
      "@foo",
      "i",
      42,
    ),
    MarshalHash([[MarshalNil(), MarshalNil()]], {
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
    }),
  );
});

Deno.test("parse parses Hash - with default value", () => {
  assertEquals(
    p("\x04\x08", "}", 0, "i", 42),
    MarshalHash([], { defaultValue: MarshalInteger(42n) }),
  );
  assertEquals(
    p("\x04\x08", "}", 2, "i", 42, "0", "i", 100, "F", "i", 42),
    MarshalHash(
      [
        [MarshalInteger(42n), MarshalNil()],
        [MarshalInteger(100n), MarshalBoolean(false)],
      ],
      { defaultValue: MarshalInteger(42n) },
    ),
  );
});

Deno.test("parse parses Hash - with default value and ivars", () => {
  assertEquals(
    p(
      "\x04\x08",
      "I}",
      1,
      "0",
      "0",
      "i",
      42,
      1,
      ":",
      4,
      "@foo",
      "i",
      42,
    ),
    MarshalHash([[MarshalNil(), MarshalNil()]], {
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
      defaultValue: MarshalInteger(42n),
    }),
  );
});

Deno.test("parse parses Hash - with ruby2_keywords", () => {
  assertEquals(
    p("\x04\x08", "I{", 0, 1, ":", 1, "K", "T"),
    MarshalHash([], { ruby2Keywords: true }),
  );
});

Deno.test("parse parses Hash - with ivars and ruby2_keywords", () => {
  assertEquals(
    p(
      "\x04\x08",
      "I{",
      0,
      2,
      ":",
      1,
      "K",
      "T",
      ":",
      4,
      "@foo",
      "i",
      42,
    ),
    MarshalHash([], {
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
      ruby2Keywords: true,
    }),
  );
});

Deno.test("parse parses Hash - with custom class", () => {
  assertEquals(
    p("\x04\x08", "C:", 6, "MyHash", "{", 0),
    MarshalHash([], { className: "MyHash" }),
  );
});

Deno.test("parse parses Hash - with extenders", () => {
  assertEquals(
    p("\x04\x08", ...["e:", 4, "Mod1"], "{", 0),
    MarshalHash([], { extenders: ["Mod1"] }),
  );
});

Deno.test("parse parses Hash - with all except ruby2Keywords", () => {
  assertEquals(
    p(
      "\x04\x08",
      "I",
      ...["e:", 4, "Mod1"],
      ...["C:", 6, "MyHash"],
      ...["}", 0],
      ...["i", 42],
      1,
      ...[":", 4, "@foo", "i", 42],
    ),
    MarshalHash([], {
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
      className: "MyHash",
      extenders: ["Mod1"],
      defaultValue: MarshalInteger(42n),
    }),
  );
});

Deno.test("parse parses Hash - with all except className", () => {
  assertEquals(
    p(
      "\x04\x08",
      "I",
      ...["e:", 4, "Mod1"],
      ...["}", 0],
      ...["i", 42],
      2,
      ...[":", 1, "K", "T"],
      ...[":", 4, "@foo", "i", 42],
    ),
    MarshalHash([], {
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
      extenders: ["Mod1"],
      defaultValue: MarshalInteger(42n),
      ruby2Keywords: true,
    }),
  );
});

Deno.test("parse parses String - ASCII-8BIT simple", () => {
  assertEquals(
    p("\x04\x08", '"', 3, "foo"),
    MarshalString(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.ASCII_8BIT),
  );
  assertEquals(
    p("\x04\x08", '"', 3, "\xE3\x81\x82"),
    MarshalString(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.ASCII_8BIT),
  );
});

Deno.test("parse parses String - US-ASCII simple", () => {
  assertEquals(
    p("\x04\x08", 'I"', 3, "foo", 1, ":", 1, "E", "F"),
    MarshalString(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII),
  );
});

Deno.test("parse parses String - UTF-8 simple", () => {
  assertEquals(
    p("\x04\x08", 'I"', 3, "\xE3\x81\x82", 1, ":", 1, "E", "T"),
    MarshalString(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.UTF_8),
  );
});

// Deno.test("parse parses String - other encoding simple", () => {
//   assertEquals(
//     p(
//       "\x04\x08",
//       'I"',
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
//     MarshalString(Uint8Array.from([0x82, 0xA0]), REncoding.Windows_31J),
//   );
// });

Deno.test("parse parses String - ASCII-8BIT with ivars", () => {
  assertEquals(
    p("\x04\x08", 'I"', 3, "foo", 1, ":", 4, "@foo", "i", 42),
    MarshalString(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.ASCII_8BIT, {
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
    }),
  );
});

Deno.test("parse parses String - US-ASCII with ivars", () => {
  assertEquals(
    p(
      "\x04\x08",
      "I",
      ...['"', 3, "foo"],
      2,
      ...[":", 1, "E", "F"],
      ...[":", 4, "@foo", "i", 42],
    ),
    MarshalString(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
    }),
  );
});

Deno.test("parse parses String - UTF-8 with ivars", () => {
  assertEquals(
    p(
      "\x04\x08",
      "I",
      ...['"', 3, "\xE3\x81\x82"],
      2,
      ...[":", 1, "E", "T"],
      ...[":", 4, "@foo", "i", 42],
    ),
    MarshalString(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.UTF_8, {
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
    }),
  );
});

// Deno.test("parse parses String - other encoding with ivars", () => {
//   assertEquals(
//     p(
//       "\x04\x08",
//       "I",
//       ...['"', 2, "\x82\xA0"],
//       2,
//       ...[":", 8, "encoding", '"', 11, "Windows-31J"],
//       ...[":", 4, "@foo", "i", 42],
//     ),
//     MarshalString(Uint8Array.from([0x82, 0xA0]), REncoding.Windows_31J, {
//       ivars: new Map([["@foo", MarshalInteger(42n)]]),
//     }),
//   );
// });

Deno.test("parse parses String - with custom class", () => {
  assertEquals(
    p("\x04\x08", "C:", 8, "MyString", '"', 3, "foo"),
    MarshalString(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.ASCII_8BIT, {
      className: "MyString",
    }),
  );
});

Deno.test("parse parses String - with extenders", () => {
  assertEquals(
    p("\x04\x08", ...["e:", 4, "Mod1"], '"', 3, "foo"),
    MarshalString(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.ASCII_8BIT, {
      extenders: ["Mod1"],
    }),
  );
});

Deno.test("parse parses String - with all", () => {
  assertEquals(
    p(
      "\x04\x08",
      "I",
      ...["e:", 4, "Mod1"],
      ...["C:", 8, "MyString"],
      ...['"', 3, "foo"],
      1,
      ...[":", 4, "@foo", "i", 42],
    ),
    MarshalString(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.ASCII_8BIT, {
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
      className: "MyString",
      extenders: ["Mod1"],
    }),
  );
});

Deno.test("parse parses Regexp - ASCII-8BIT simple", () => {
  assertEquals(
    p("\x04\x08", "/", 3, "\xE3\x81\x82", "\x10"),
    MarshalRegexp(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.ASCII_8BIT),
  );
});

Deno.test("parse parses Regexp - US-ASCII simple", () => {
  assertEquals(
    p("\x04\x08", "I/", 3, "foo", "\x00", 1, ":", 1, "E", "F"),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII),
  );
});

Deno.test("parse parses Regexp - UTF-8 simple", () => {
  assertEquals(
    p("\x04\x08", "I/", 3, "\xE3\x81\x82", "\x10", 1, ":", 1, "E", "T"),
    MarshalRegexp(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.UTF_8),
  );
});

// Deno.test("parse parses Regexp - other encoding simple", () => {
//   assertEquals(
//     p(
//       "\x04\x08",
//       "I/",
//       2,
//       "\x82\xA0",
//       "\x10",
//       1,
//       ":",
//       8,
//       "encoding",
//       '"',
//       11,
//       "Windows-31J",
//     ),
//     MarshalRegexp(Uint8Array.from([0x82, 0xA0]), REncoding.Windows_31J),
//   );
// });

Deno.test("parse parses Regexp - with ignoreCase", () => {
  assertEquals(
    p("\x04\x08", "I/", 3, "foo", "\x01", 1, ":", 1, "E", "F"),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      ignoreCase: true,
    }),
  );
});

Deno.test("parse parses Regexp - with multiline", () => {
  assertEquals(
    p("\x04\x08", "I/", 3, "foo", "\x02", 1, ":", 1, "E", "F"),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      multiline: true,
    }),
  );
});

Deno.test("parse parses Regexp - with extended", () => {
  assertEquals(
    p("\x04\x08", "I/", 3, "foo", "\x04", 1, ":", 1, "E", "F"),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      extended: true,
    }),
  );
});

Deno.test("parse parses Regexp - with noEncoding", () => {
  assertEquals(
    p("\x04\x08", "I/", 3, "foo", "\x20", 1, ":", 1, "E", "F"),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      noEncoding: true,
    }),
  );
});

Deno.test("parse parses Regexp - ASCII-8BIT with ivars", () => {
  assertEquals(
    p("\x04\x08", "I", ...["/", 3, "\xE3\x81\x82", "\x30"], ...[
      1,
      ":",
      4,
      "@foo",
      "i",
      42,
    ]),
    MarshalRegexp(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.ASCII_8BIT, {
      noEncoding: true,
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
    }),
  );
});

Deno.test("parse parses Regexp - US-ASCII with ivars", () => {
  assertEquals(
    p(
      "\x04\x08",
      "I",
      ...["/", 3, "foo", "\x00"],
      2,
      ...[":", 1, "E", "F"],
      ...[":", 4, "@foo", "i", 42],
    ),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
    }),
  );
});

Deno.test("parse parses Regexp - UTF-8 with ivars", () => {
  assertEquals(
    p(
      "\x04\x08",
      "I",
      ...["/", 3, "\xE3\x81\x82", "\x10"],
      2,
      ...[":", 1, "E", "T"],
      ...[":", 4, "@foo", "i", 42],
    ),
    MarshalRegexp(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.UTF_8, {
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
    }),
  );
});

// Deno.test("parse parses Regexp - other encoding with ivars", () => {
//   assertEquals(
//     p(
//       "\x04\x08",
//       "I",
//       ...["/", 2, "\x82\xA0", "\x10"],
//       2,
//       ...[":", 8, "encoding", '"', 11, "Windows-31J"],
//       ...[":", 4, "@foo", "i", 42],
//     ),
//     MarshalRegexp(Uint8Array.from([0x82, 0xA0]), REncoding.Windows_31J, {
//       ivars: new Map([["@foo", MarshalInteger(42n)]]),
//     }),
//   );
// });

Deno.test("parse parses Regexp - with custom class", () => {
  assertEquals(
    p(
      "\x04\x08",
      ...["IC:", 8, "MyRegexp"],
      ...["/", 3, "foo", "\x00"],
      ...[1, ":", 1, "E", "F"],
    ),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      className: "MyRegexp",
    }),
  );
});

Deno.test("parse parses Regexp - with extenders", () => {
  assertEquals(
    p(
      "\x04\x08",
      ...["Ie:", 4, "Mod1"],
      ...["/", 3, "foo", "\x00"],
      ...[1, ":", 1, "E", "F"],
    ),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      extenders: ["Mod1"],
    }),
  );
});

Deno.test("parse parses Regexp - with all", () => {
  assertEquals(
    p(
      "\x04\x08",
      "I",
      ...["e:", 4, "Mod1"],
      ...["C:", 8, "MyRegexp"],
      ...["/", 3, "foo", "\x00"],
      2,
      ...[":", 1, "E", "F"],
      ...[":", 4, "@foo", "i", 42],
    ),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
      className: "MyRegexp",
      extenders: ["Mod1"],
    }),
  );
});

Deno.test("parse parses Regexp1.8 - $KCODE simple", () => {
  assertEquals(
    p("\x04\x08", "/", 3, "\xE3\x81\x82", "\x00"),
    MarshalRegexp(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.ASCII_8BIT, {
      ruby18Compat: true,
    }),
  );
});

Deno.test("parse parses Regexp1.8 - US-ASCII simple", () => {
  assertEquals(
    p("\x04\x08", "/", 3, "foo", "\x00"),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      ruby18Compat: true,
    }),
  );
});

Deno.test("parse parses Regexp1.8 - UTF-8 simple", () => {
  assertEquals(
    p("\x04\x08", "/", 3, "\xE3\x81\x82", "\x40"),
    MarshalRegexp(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.UTF_8, {
      ruby18Compat: true,
    }),
  );
});

// // Ambiguous
// Deno.test("parse parses Regexp1.8 - Windows-31J simple", () => {
//   assertEquals(
//     p("\x04\x08", "/", 2, "\x82\xA0", "\x30"),
//     MarshalRegexp(Uint8Array.from([0x82, 0xA0]), REncoding.Windows_31J, {
//       ruby18Compat: true,
//     }),
//   );
// });

Deno.test("parse parses Regexp1.8 - with ignoreCase", () => {
  assertEquals(
    p("\x04\x08", "/", 3, "foo", "\x01"),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      ruby18Compat: true,
      ignoreCase: true,
    }),
  );
});

Deno.test("parse parses Regexp1.8 - with multiline", () => {
  assertEquals(
    p("\x04\x08", "/", 3, "foo", "\x02"),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      ruby18Compat: true,
      multiline: true,
    }),
  );
});

Deno.test("parse parses Regexp1.8 - with extended", () => {
  assertEquals(
    p("\x04\x08", "/", 3, "foo", "\x04"),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      ruby18Compat: true,
      extended: true,
    }),
  );
});

// // Ambiguous
// Deno.test("parse parses Regexp1.8 - with noEncoding", () => {
//   assertEquals(
//     p("\x04\x08", "/", 3, "foo", "\x10"),
//     MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
//       ruby18Compat: true,
//       noEncoding: true,
//     }),
//   );
// });

Deno.test("parse parses Regexp1.8 - with ivars", () => {
  assertEquals(
    p("\x04\x08", "I/", 3, "foo", "\x00", 1, ":", 4, "@foo", "i", 42),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      ruby18Compat: true,
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
    }),
  );
});

Deno.test("parse parses Regexp1.8 - with custom class", () => {
  assertEquals(
    p("\x04\x08", "C:", 8, "MyRegexp", "/", 3, "foo", "\x00"),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      ruby18Compat: true,
      className: "MyRegexp",
    }),
  );
});

Deno.test("parse parses Regexp1.8 - with extenders", () => {
  assertEquals(
    p("\x04\x08", ...["e:", 4, "Mod1"], "/", 3, "foo", "\x00"),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      ruby18Compat: true,
      extenders: ["Mod1"],
    }),
  );
});

Deno.test("parse parses Regexp1.8 - with all", () => {
  assertEquals(
    p(
      "\x04\x08",
      "I",
      ...["e:", 4, "Mod1"],
      ...["C:", 8, "MyRegexp"],
      ...["/", 3, "foo", "\x00"],
      1,
      ...[":", 4, "@foo", "i", 42],
    ),
    MarshalRegexp(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
      ruby18Compat: true,
      ivars: new Map([["@foo", MarshalInteger(42n)]]),
      className: "MyRegexp",
      extenders: ["Mod1"],
    }),
  );
});
