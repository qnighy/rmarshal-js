import { assertEquals } from "@std/assert/equals";
import { REncoding } from "./mod.ts";

Deno.test("REncoding.inspectBytes (Shift JIS example)", () => {
  const ins = (bytes: number[], quote?: "'" | '"' | undefined) =>
    REncoding.Windows_31J.inspectBytes(new Uint8Array(bytes), quote);
  assertEquals(ins([0x82, 0xA0, 0x41]), "\\x{82A0}A");
  assertEquals(ins([0x0A]), "\n");
  assertEquals(ins([0x0A, 0x27], "'"), "\\n\\'");
});

Deno.test("REncoding.inspectBytes (UTF-8 example)", () => {
  const ins = (bytes: number[]) =>
    REncoding.UTF_8.inspectBytes(new Uint8Array(bytes));
  assertEquals(ins([0xE3, 0x81, 0x82, 0x41]), "あA");
  assertEquals(ins([0xE3]), "\\xE3");
});

Deno.test("REncoding.inspectBytes (UTF-16 example)", () => {
  const ins = (bytes: number[]) =>
    REncoding.UTF_16BE.inspectBytes(new Uint8Array(bytes));
  assertEquals(ins([0x30, 0x42, 0x00, 0x41]), "あA");
  assertEquals(ins([0x41]), "\\x41");
});
