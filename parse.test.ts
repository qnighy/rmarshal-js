import { assertEquals, assertThrows } from "@std/assert";
import {
  MarshalBoolean,
  MarshalInteger,
  MarshalNil,
  type MarshalValue,
} from "./ast.ts";
import { parse } from "./parse.ts";
import { seq, type SeqElement } from "./testutil.ts";

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
