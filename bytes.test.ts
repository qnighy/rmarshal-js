import { assert, assertEquals, assertThrows } from "@std/assert";
import { b, Bytes } from "./bytes.ts";

Deno.test("Bytes.is", () => {
  assert(Bytes.is(""));
  assert(Bytes.is("foo"));
  assert(Bytes.is("\n\uF780\uF7FF\x7F"));
  assert(!Bytes.is("あ"));
});

Deno.test("b", () => {
  assertEquals(b`foo`, "foo");
  assertEquals(b`\x81\xFF`, "\uF781\uF7FF");
  assertEquals(b`あ`, "\uF7E3\uF781\uF782");
  assertEquals(b`\u3042`, "\uF7E3\uF781\uF782");

  assertEquals(b`n`, "n");
  assertEquals(b`\n`, "\n");
  assertEquals(b`\\n`, "\\n");
  assertEquals(b`\\\n`, "\\\n");

  assertEquals(b`\'\"\`\\\b\f\n\r\t\v\0`, "'\"\`\\\b\f\n\r\t\v\0");
  assertThrows(() => b`\00`, SyntaxError);
  assertThrows(() => b`\07`, SyntaxError);
  assertThrows(() => b`\x`, SyntaxError);
  assertThrows(() => b`\x__`, SyntaxError);
  assertThrows(() => b`\u`, SyntaxError);
});
