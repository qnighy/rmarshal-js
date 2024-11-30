import { assertEquals } from "@std/assert/equals";
import { REncoding } from "./mod.ts";

const sjis = REncoding.find("Windows-31J");
Deno.test("REncoding.codepoints", () => {
  const cp = (bytes: number[]) => [...sjis.codepoints(new Uint8Array(bytes))];
  assertEquals(cp([0x82, 0xA0, 0x41]), [0x82A0, 0x41]);
});
Deno.test("REncoding.inspectBytes", () => {
  const ins = (bytes: number[]) => sjis.inspectBytes(new Uint8Array(bytes));
  assertEquals(ins([0x82, 0xA0, 0x41]), "\\x{82A0}A");
});
