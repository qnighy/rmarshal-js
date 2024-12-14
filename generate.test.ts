import { assertEquals } from "@std/assert";
import { REncoding, RSymbol } from "./rom.ts";
import { generate, generateAll } from "./generate.ts";
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

Deno.test("generate generates false", () => {
  assertEquals(generate(MarshalBoolean(false)), seq("\x04\x08", "F"));
});

Deno.test("generate generates true", () => {
  assertEquals(generate(MarshalBoolean(true)), seq("\x04\x08", "T"));
});

Deno.test("generate generates Fixnum zero", () => {
  assertEquals(generate(MarshalInteger(0n)), seq("\x04\x08", "i\x00"));
});

Deno.test("generate generates Fixnum in positive short form", () => {
  assertEquals(generate(MarshalInteger(1n)), seq("\x04\x08", "i\x06"));
  assertEquals(generate(MarshalInteger(122n)), seq("\x04\x08", "i\x7F"));
});

Deno.test("generate generates Fixnum in negative short form", () => {
  assertEquals(generate(MarshalInteger(-1n)), seq("\x04\x08", "i\xFA"));
  assertEquals(generate(MarshalInteger(-123n)), seq("\x04\x08", "i\x80"));
});

Deno.test("generate generates Fixnum in positive 1-byte form", () => {
  assertEquals(generate(MarshalInteger(123n)), seq("\x04\x08", "i\x01\x7B"));
  assertEquals(generate(MarshalInteger(255n)), seq("\x04\x08", "i\x01\xFF"));
});

Deno.test("generate generates Fixnum in positive 2-byte form", () => {
  assertEquals(
    generate(MarshalInteger(256n)),
    seq("\x04\x08", "i\x02\x00\x01"),
  );
  assertEquals(
    generate(MarshalInteger(0xFFFFn)),
    seq("\x04\x08", "i\x02\xFF\xFF"),
  );
});

Deno.test("generate generates Fixnum in positive 3-byte form", () => {
  assertEquals(
    generate(MarshalInteger(0x10000n)),
    seq("\x04\x08", "i\x03\x00\x00\x01"),
  );
  assertEquals(
    generate(MarshalInteger(0xFFFFFFn)),
    seq("\x04\x08", "i\x03\xFF\xFF\xFF"),
  );
});

Deno.test("generate generates Fixnum in positive 4-byte form", () => {
  assertEquals(
    generate(MarshalInteger(0x1000000n)),
    seq("\x04\x08", "i\x04\x00\x00\x00\x01"),
  );
  assertEquals(
    generate(MarshalInteger(0x3FFFFFFFn)),
    seq("\x04\x08", "i\x04\xFF\xFF\xFF\x3F"),
  );
});

Deno.test("generate generates Fixnum in negative 1-byte form", () => {
  assertEquals(generate(MarshalInteger(-124n)), seq("\x04\x08", "i\xFF\x84"));
  assertEquals(generate(MarshalInteger(-256n)), seq("\x04\x08", "i\xFF\x00"));
});

Deno.test("generate generates Fixnum in negative 2-byte form", () => {
  assertEquals(
    generate(MarshalInteger(-257n)),
    seq("\x04\x08", "i\xFE\xFF\xFE"),
  );
  assertEquals(
    generate(MarshalInteger(-0x10000n)),
    seq("\x04\x08", "i\xFE\x00\x00"),
  );
});

Deno.test("generate generates Fixnum in negative 3-byte form", () => {
  assertEquals(
    generate(MarshalInteger(-0x10001n)),
    seq("\x04\x08", "i\xFD\xFF\xFF\xFE"),
  );
  assertEquals(
    generate(MarshalInteger(-0x1000000n)),
    seq("\x04\x08", "i\xFD\x00\x00\x00"),
  );
});

Deno.test("generate generates Fixnum in negative 4-byte form", () => {
  assertEquals(
    generate(MarshalInteger(-0x1000001n)),
    seq("\x04\x08", "i\xFC\xFF\xFF\xFF\xFE"),
  );
  assertEquals(
    generate(MarshalInteger(-0x40000000n)),
    seq("\x04\x08", "i\xFC\x00\x00\x00\xC0"),
  );
});

Deno.test("generate generates Bignum - positive 2-word form", () => {
  assertEquals(
    generate(MarshalInteger(1073741824n)),
    seq("\x04\x08", "l+", 2, "\x00\x00\x00\x40"),
  );
  assertEquals(
    generate(MarshalInteger(4294967295n)),
    seq("\x04\x08", "l+", 2, "\xFF\xFF\xFF\xFF"),
  );
});

Deno.test("generate generates Bignum - negative 2-word form", () => {
  assertEquals(
    generate(MarshalInteger(-1073741825n)),
    seq("\x04\x08", "l-", 2, "\x01\x00\x00\x40"),
  );
  assertEquals(
    generate(MarshalInteger(-4294967295n)),
    seq("\x04\x08", "l-", 2, "\xFF\xFF\xFF\xFF"),
  );
});

Deno.test("generate generates Bignum - positive 3-word form", () => {
  assertEquals(
    generate(MarshalInteger(4294967296n)),
    seq("\x04\x08", "l+", 3, "\x00\x00\x00\x00\x01\x00"),
  );
  assertEquals(
    generate(MarshalInteger(281474976710655n)),
    seq("\x04\x08", "l+", 3, "\xFF\xFF\xFF\xFF\xFF\xFF"),
  );
});

Deno.test("generate generates Bignum - negative 3-word form", () => {
  assertEquals(
    generate(MarshalInteger(-4294967296n)),
    seq("\x04\x08", "l-", 3, "\x00\x00\x00\x00\x01\x00"),
  );
  assertEquals(
    generate(MarshalInteger(-281474976710655n)),
    seq("\x04\x08", "l-", 3, "\xFF\xFF\xFF\xFF\xFF\xFF"),
  );
});

Deno.test("generate generates NaN", () => {
  assertEquals(generate(MarshalFloat(NaN)), seq("\x04\x08", "f", 3, "nan"));
});

Deno.test("generate generates Infinity and -Infinity", () => {
  assertEquals(
    generate(MarshalFloat(Infinity)),
    seq("\x04\x08", "f", 3, "inf"),
  );
  assertEquals(
    generate(MarshalFloat(-Infinity)),
    seq("\x04\x08", "f", 4, "-inf"),
  );
});

Deno.test("generate generates zeroes", () => {
  assertEquals(generate(MarshalFloat(0)), seq("\x04\x08", "f", 1, "0"));
  assertEquals(generate(MarshalFloat(-0)), seq("\x04\x08", "f", 2, "-0"));
});

Deno.test("generate generates Float integers in non-scientific notation", () => {
  assertEquals(generate(MarshalFloat(1)), seq("\x04\x08", "f", 1, "1"));
  assertEquals(generate(MarshalFloat(-1)), seq("\x04\x08", "f", 2, "-1"));
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
});

Deno.test("generate generates Float integers in scientific notation", () => {
  assertEquals(generate(MarshalFloat(10)), seq("\x04\x08", "f", 3, "1e1"));
  assertEquals(generate(MarshalFloat(-10)), seq("\x04\x08", "f", 4, "-1e1"));
  assertEquals(
    generate(MarshalFloat(1.7976931348623157e+308)),
    seq("\x04\x08", "f", 22, "1.7976931348623157e308"),
  );
  assertEquals(
    generate(MarshalFloat(-1.7976931348623157e+308)),
    seq("\x04\x08", "f", 23, "-1.7976931348623157e308"),
  );
});

Deno.test("generate generates Float non-scientific fractions", () => {
  assertEquals(
    generate(MarshalFloat(1.1)),
    seq("\x04\x08", "f", 3, "1.1"),
  );
  assertEquals(
    generate(MarshalFloat(-1.1)),
    seq("\x04\x08", "f", 4, "-1.1"),
  );
  assertEquals(
    generate(MarshalFloat(0.0001)),
    seq("\x04\x08", "f", 6, "0.0001"),
  );
  assertEquals(
    generate(MarshalFloat(-0.0001)),
    seq("\x04\x08", "f", 7, "-0.0001"),
  );
});

Deno.test("generate generates Float scientific fractions", () => {
  assertEquals(
    generate(MarshalFloat(9.999999999999999e-5)),
    seq("\x04\x08", "f", 20, "9.999999999999999e-5"),
  );
  assertEquals(
    generate(MarshalFloat(-9.999999999999999e-5)),
    seq("\x04\x08", "f", 21, "-9.999999999999999e-5"),
  );
  assertEquals(
    generate(MarshalFloat(5e-324)),
    seq("\x04\x08", "f", 6, "5e-324"),
  );
  assertEquals(
    generate(MarshalFloat(-5e-324)),
    seq("\x04\x08", "f", 7, "-5e-324"),
  );
});

Deno.test("generate generates Symbol - US-ASCII", () => {
  assertEquals(generate(MarshalSymbol("foo")), seq("\x04\x08", ":", 3, "foo"));
});

Deno.test("generate generates Symbol - ASCII-8BIT", () => {
  assertEquals(
    generate(
      MarshalSymbol(
        RSymbol(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.ASCII_8BIT),
      ),
    ),
    seq("\x04\x08", ":", 3, "\xE3\x81\x82"),
  );
});

Deno.test("generate generates Symbol - UTF-8", () => {
  assertEquals(
    generate(MarshalSymbol("あ")),
    seq("\x04\x08", "I:", 3, "\xE3\x81\x82", 1, ":", 1, "E", "T"),
  );
});

Deno.test("generate generates Symbol - other encoding", () => {
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

Deno.test("generate generates Symbol link - simple case", () => {
  assertEquals(
    generate(MarshalArray([MarshalSymbol("foo"), MarshalSymbol("foo")])),
    seq("\x04\x08", "[", 2, ":", 3, "foo", ";", 0),
  );
});

Deno.test("generate generates Symbol link - multiple links", () => {
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
});

Deno.test("generate generates Symbol link - symbols within symbols", () => {
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
});

Deno.test("generate generates Symbol link - symbols with same encoding", () => {
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

Deno.test("generate generates Object - simple case", () => {
  assertEquals(
    generate(MarshalObject("Object", new Map())),
    seq("\x04\x08", "o:", 6, "Object", 0),
  );
  assertEquals(
    generate(MarshalObject("MyClass", new Map())),
    seq("\x04\x08", "o:", 7, "MyClass", 0),
  );
});

Deno.test("generate generates Object - with ivars", () => {
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

Deno.test("generate generates Object - with extenders", () => {
  assertEquals(
    generate(MarshalObject("MyClass", new Map(), {
      extenders: ["Mod1", "Mあ"],
    })),
    seq(
      "\x04\x08",
      ...["e:", 4, "Mod1"],
      ...["eI:", 4, "M\xE3\x81\x82", 1, ":", 1, "E", "T"],
      "o:",
      7,
      "MyClass",
      0,
    ),
  );
});

Deno.test("generate generates Array - simple case", () => {
  assertEquals(generate(MarshalArray([])), seq("\x04\x08", "[", 0));
  assertEquals(
    generate(MarshalArray([MarshalInteger(42n), MarshalNil()])),
    seq("\x04\x08", "[", 2, "i", 42, "0"),
  );
});

Deno.test("generate generates Array - with ivars", () => {
  assertEquals(
    generate(
      MarshalArray([MarshalNil()], {
        ivars: new Map<RSymbol, MarshalValue>([["@foo", MarshalInteger(42n)]]),
      }),
    ),
    seq("\x04\x08", "I[", 1, "0", 1, ":", 4, "@foo", "i", 42),
  );
});

Deno.test("generate generates Array - with custom class", () => {
  assertEquals(
    generate(MarshalArray([], { className: "MyArray" })),
    seq("\x04\x08", "C:", 7, "MyArray", "[", 0),
  );
});

Deno.test("generate generates Array - with extenders", () => {
  assertEquals(
    generate(MarshalArray([], { extenders: ["Mod1"] })),
    seq(
      "\x04\x08",
      ...["e:", 4, "Mod1"],
      "[",
      0,
    ),
  );
});

Deno.test("generate generates Array - with all", () => {
  assertEquals(
    generate(
      MarshalArray([], {
        ivars: new Map([["@foo", MarshalInteger(42n)]]),
        className: "MyArray",
        extenders: ["Mod1"],
      }),
    ),
    seq(
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
  );
});

Deno.test("generate generates Hash - simple case", () => {
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
});

Deno.test("generate generates Hash - with ivars", () => {
  assertEquals(
    generate(
      MarshalHash([[MarshalNil(), MarshalNil()]], {
        ivars: new Map([["@foo", MarshalInteger(42n)]]),
      }),
    ),
    seq("\x04\x08", "I{", 1, "0", "0", 1, ":", 4, "@foo", "i", 42),
  );
});

Deno.test("generate generates Hash - with default value", () => {
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
});

Deno.test("generate generates Hash - with default value and ivars", () => {
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

Deno.test("generate generates Hash - with ruby2_keywords", () => {
  assertEquals(
    generate(MarshalHash([], { ruby2Keywords: true })),
    seq("\x04\x08", "I{", 0, 1, ":", 1, "K", "T"),
  );
});

Deno.test("generate generates Hash - with ivars and ruby2_keywords", () => {
  assertEquals(
    generate(
      MarshalHash([], {
        ivars: new Map([["@foo", MarshalInteger(42n)]]),
        ruby2Keywords: true,
      }),
    ),
    seq("\x04\x08", "I{", 0, 2, ":", 1, "K", "T", ":", 4, "@foo", "i", 42),
  );
});

Deno.test("generate generates Hash - with custom class", () => {
  assertEquals(
    generate(MarshalHash([], { className: "MyHash" })),
    seq("\x04\x08", "C:", 6, "MyHash", "{", 0),
  );
});

Deno.test("generate generates Hash - with extenders", () => {
  assertEquals(
    generate(MarshalHash([], { extenders: ["Mod1"] })),
    seq(
      "\x04\x08",
      ...["e:", 4, "Mod1"],
      "{",
      0,
    ),
  );
});

Deno.test("generate generates Hash - with all", () => {
  assertEquals(
    generate(
      MarshalHash([], {
        ivars: new Map([["@foo", MarshalInteger(42n)]]),
        className: "MyHash",
        extenders: ["Mod1"],
        defaultValue: MarshalInteger(42n),
        ruby2Keywords: true,
      }),
    ),
    seq(
      "\x04\x08",
      "I",
      ...["e:", 4, "Mod1"],
      ...["C:", 6, "MyHash"],
      ...["}", 0],
      ...["i", 42],
      2,
      ...[":", 1, "K", "T"],
      ...[":", 4, "@foo", "i", 42],
    ),
  );
});

Deno.test("generate generates String - ASCII-8BIT simple", () => {
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
});

Deno.test("generate generates String - US-ASCII simple", () => {
  assertEquals(
    generate(
      MarshalString(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII),
    ),
    seq("\x04\x08", 'I"', 3, "foo", 1, ":", 1, "E", "F"),
  );
});

Deno.test("generate generates String - UTF-8 simple", () => {
  assertEquals(
    generate(
      MarshalString(Uint8Array.from([0xE3, 0x81, 0x82]), REncoding.UTF_8),
    ),
    seq("\x04\x08", 'I"', 3, "\xE3\x81\x82", 1, ":", 1, "E", "T"),
  );
});

Deno.test("generate generates String - other encoding simple", () => {
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
});

Deno.test("generate generates String - ASCII-8BIT with ivars", () => {
  assertEquals(
    generate(
      MarshalString(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.ASCII_8BIT, {
        ivars: new Map([["@foo", MarshalInteger(42n)]]),
      }),
    ),
    seq("\x04\x08", 'I"', 3, "foo", 1, ":", 4, "@foo", "i", 42),
  );
});

Deno.test("generate generates String - US-ASCII with ivars", () => {
  assertEquals(
    generate(
      MarshalString(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.US_ASCII, {
        ivars: new Map([["@foo", MarshalInteger(42n)]]),
      }),
    ),
    seq(
      "\x04\x08",
      "I",
      ...['"', 3, "foo"],
      2,
      ...[":", 1, "E", "F"],
      ...[":", 4, "@foo", "i", 42],
    ),
  );
});

Deno.test("generate generates String - UTF-8 with ivars", () => {
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

Deno.test("generate generates String - other encoding with ivars", () => {
  assertEquals(
    generate(
      MarshalString(Uint8Array.from([0x82, 0xA0]), REncoding.Windows_31J, {
        ivars: new Map([["@foo", MarshalInteger(42n)]]),
      }),
    ),
    seq(
      "\x04\x08",
      "I",
      ...['"', 2, "\x82\xA0"],
      2,
      ...[":", 8, "encoding", '"', 11, "Windows-31J"],
      ...[":", 4, "@foo", "i", 42],
    ),
  );
});

Deno.test("generate generates String - with custom class", () => {
  assertEquals(
    generate(
      MarshalString(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.ASCII_8BIT, {
        className: "MyString",
      }),
    ),
    seq("\x04\x08", "C:", 8, "MyString", '"', 3, "foo"),
  );
});

Deno.test("generate generates String - with extenders", () => {
  assertEquals(
    generate(
      MarshalString(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.ASCII_8BIT, {
        extenders: ["Mod1"],
      }),
    ),
    seq(
      "\x04\x08",
      ...["e:", 4, "Mod1"],
      ...['"', 3, "foo"],
    ),
  );
});

Deno.test("generate generates String - with all", () => {
  assertEquals(
    generate(
      MarshalString(Uint8Array.from([0x66, 0x6F, 0x6F]), REncoding.ASCII_8BIT, {
        ivars: new Map([["@foo", MarshalInteger(42n)]]),
        className: "MyString",
        extenders: ["Mod1"],
      }),
    ),
    seq(
      "\x04\x08",
      "I",
      ...["e:", 4, "Mod1"],
      ...["C:", 8, "MyString"],
      ...['"', 3, "foo"],
      1,
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

Deno.test("generate generates links - cycle simple", () => {
  assertEquals(
    generate(setupLink([MarshalArray([])], (a) => a.elements.push(a))),
    seq("\x04\x08", "[", 1, "@", 0),
  );
});

Deno.test("generate generates links - shared reference simple", () => {
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalArray([])],
        (a, b) => a.elements.push(b, b),
      ),
    ),
    seq("\x04\x08", "[", 2, "[", 0, "@", 1),
  );
});

Deno.test("generate generates links - skips nil", () => {
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalArray([])],
        (a, b) => a.elements.push(MarshalNil(), b, b),
      ),
    ),
    seq("\x04\x08", "[", 3, "0", "[", 0, "@", 1),
  );
});

Deno.test("generate generates links - skips false", () => {
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalArray([])],
        (a, b) => a.elements.push(MarshalBoolean(false), b, b),
      ),
    ),
    seq("\x04\x08", "[", 3, "F", "[", 0, "@", 1),
  );
});

Deno.test("generate generates links - skips true", () => {
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalArray([])],
        (a, b) => a.elements.push(MarshalBoolean(true), b, b),
      ),
    ),
    seq("\x04\x08", "[", 3, "T", "[", 0, "@", 1),
  );
});

Deno.test("generate generates links - skips Fixnum", () => {
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalArray([])],
        (a, b) => a.elements.push(MarshalInteger(42n), b, b),
      ),
    ),
    seq("\x04\x08", "[", 3, "i", 42, "[", 0, "@", 1),
  );
});

Deno.test("generate generates links - skips Symbol", () => {
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalArray([])],
        (a, b) => a.elements.push(MarshalSymbol("foo"), b, b),
      ),
    ),
    seq("\x04\x08", "[", 3, ":", 3, "foo", "[", 0, "@", 1),
  );
});

Deno.test("generate generates links - links same Bignums", () => {
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalInteger(0x100000000n)],
        (a, b) => a.elements.push(b, b),
      ),
    ),
    seq(
      "\x04\x08",
      "[",
      2,
      ...["l+", 3, "\x00\x00\x00\x00\x01\x00"],
      ...["@", 1],
    ),
  );
});

Deno.test("generate generates links - unlinks different Bignums", () => {
  assertEquals(
    generate(
      MarshalArray([
        MarshalInteger(0x100000000n),
        MarshalInteger(0x100000000n),
      ]),
    ),
    seq(
      "\x04\x08",
      "[",
      2,
      ...["l+", 3, "\x00\x00\x00\x00\x01\x00"],
      ...["l+", 3, "\x00\x00\x00\x00\x01\x00"],
    ),
  );
});

Deno.test("generate generates links - links same Floats", () => {
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalFloat(1)],
        (a, b) => a.elements.push(b, b),
      ),
    ),
    seq(
      "\x04\x08",
      "[",
      2,
      ...["f", 1, "1"],
      ...["@", 1],
    ),
  );
});

Deno.test("generate generates links - unlinks different Floats", () => {
  assertEquals(
    generate(MarshalArray([MarshalFloat(1), MarshalFloat(1)])),
    seq(
      "\x04\x08",
      "[",
      2,
      ...["f", 1, "1"],
      ...["f", 1, "1"],
    ),
  );
});

Deno.test("generate generates links - links same Objects", () => {
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalObject("MyClass", new Map())],
        (a, b) => a.elements.push(b, b),
      ),
    ),
    seq(
      "\x04\x08",
      "[",
      2,
      ...["o:", 7, "MyClass", 0],
      ...["@", 1],
    ),
  );
});

Deno.test("generate generates links - unlinks different Objects", () => {
  assertEquals(
    generate(MarshalArray([
      MarshalObject("MyClass", new Map()),
      MarshalObject("MyClass", new Map()),
    ])),
    seq(
      "\x04\x08",
      "[",
      2,
      ...["o:", 7, "MyClass", 0],
      ...["o;", 0, 0],
    ),
  );
});

Deno.test("generate generates links - links same Arrays", () => {
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalArray([])],
        (a, b) => a.elements.push(b, b),
      ),
    ),
    seq(
      "\x04\x08",
      "[",
      2,
      ...["[", 0],
      ...["@", 1],
    ),
  );
});

Deno.test("generate generates links - unlinks different Arrays", () => {
  assertEquals(
    generate(MarshalArray([
      MarshalArray([]),
      MarshalArray([]),
    ])),
    seq(
      "\x04\x08",
      "[",
      2,
      ...["[", 0],
      ...["[", 0],
    ),
  );
});

Deno.test("generate generates links - links same Hashes", () => {
  assertEquals(
    generate(
      setupLink(
        [MarshalArray([]), MarshalHash([])],
        (a, b) => a.elements.push(b, b),
      ),
    ),
    seq(
      "\x04\x08",
      "[",
      2,
      ...["{", 0],
      ...["@", 1],
    ),
  );
});

Deno.test("generate generates links - unlinks different Hashes", () => {
  assertEquals(
    generate(MarshalArray([
      MarshalHash([]),
      MarshalHash([]),
    ])),
    seq(
      "\x04\x08",
      "[",
      2,
      ...["{", 0],
      ...["{", 0],
    ),
  );
});

Deno.test("generate generates links - links same Strings", () => {
  assertEquals(
    generate(
      setupLink(
        [
          MarshalArray([]),
          MarshalString(Uint8Array.from([]), REncoding.ASCII_8BIT),
        ],
        (a, b) => a.elements.push(b, b),
      ),
    ),
    seq(
      "\x04\x08",
      "[",
      2,
      ...['"', 0],
      ...["@", 1],
    ),
  );
});

Deno.test("generate generates links - unlinks different Strings", () => {
  assertEquals(
    generate(MarshalArray([
      MarshalString(Uint8Array.from([]), REncoding.ASCII_8BIT),
      MarshalString(Uint8Array.from([]), REncoding.ASCII_8BIT),
    ])),
    seq(
      "\x04\x08",
      "[",
      2,
      ...['"', 0],
      ...['"', 0],
    ),
  );
});

Deno.test("generate generates links - links same Encoding names", () => {
  assertEquals(
    generate(MarshalArray([
      MarshalString(Uint8Array.from([]), REncoding.Windows_31J),
      MarshalString(Uint8Array.from([]), REncoding.Windows_31J),
    ])),
    seq(
      "\x04\x08",
      "[",
      2,
      ...['I"', 0, 1, ":", 8, "encoding", '"', 11, "Windows-31J"],
      ...['I"', 0, 1, ";", 0, "@", 2],
    ),
  );
});

Deno.test("generate generates links - unlinks Encoding names from other strings", () => {
  assertEquals(
    generate(MarshalArray([
      MarshalString(Uint8Array.from([]), REncoding.Windows_31J),
      MarshalString(
        new TextEncoder().encode("Windows-31J"),
        REncoding.ASCII_8BIT,
      ),
    ])),
    seq(
      "\x04\x08",
      "[",
      2,
      ...['I"', 0, 1, ":", 8, "encoding", '"', 11, "Windows-31J"],
      ...['"', 11, "Windows-31J"],
    ),
  );
});

Deno.test("generateAll generates multiple values", () => {
  assertEquals(
    generateAll([MarshalNil(), MarshalInteger(42n)]),
    seq("\x04\x08", "0", "\x04\x08", "i", 42),
  );
});

Deno.test("generateAll resets Symbol link counts", () => {
  assertEquals(
    generateAll([
      MarshalArray([MarshalSymbol("foo"), MarshalSymbol("foo")]),
      MarshalArray([MarshalSymbol("foo"), MarshalSymbol("foo")]),
    ]),
    seq(
      ...["\x04\x08", "[", 2, ":", 3, "foo", ";", 0],
      ...["\x04\x08", "[", 2, ":", 3, "foo", ";", 0],
    ),
  );
});

Deno.test("generateAll resets link counts", () => {
  const obj = MarshalArray([]);
  assertEquals(
    generateAll([
      MarshalArray([obj, obj]),
      MarshalArray([obj, obj]),
    ]),
    seq(
      ...["\x04\x08", "[", 2, "[", 0, "@", 1],
      ...["\x04\x08", "[", 2, "[", 0, "@", 1],
    ),
  );
});
