import { assertEquals } from "@std/assert/equals";
import { load } from "../load2.ts";
import { dump } from "../dump2.ts";
import { seq } from "../testutil.ts";
import { BooleanMapper, NullMapper, UndefinedMapper } from "./basic.ts";

Deno.test("NullMapper loads nil as null", () => {
  assertEquals(load(seq("\x04\x080"), NullMapper), null);
});

Deno.test("NullMapper dumps null as nil", () => {
  assertEquals(dump(null, NullMapper), seq("\x04\x080"));
});

Deno.test("NullMapper dumps undefined as nil", () => {
  assertEquals(dump<null | undefined>(undefined, NullMapper), seq("\x04\x080"));
});

Deno.test("UndefinedMapper loads nil as undefined", () => {
  assertEquals(load(seq("\x04\x080"), UndefinedMapper), undefined);
});

Deno.test("UndefinedMapper dumps undefined as nil", () => {
  assertEquals(dump(undefined, UndefinedMapper), seq("\x04\x080"));
});

Deno.test("UndefinedMapper dumps null as nil", () => {
  assertEquals(dump<null | undefined>(null, UndefinedMapper), seq("\x04\x080"));
});

Deno.test("BooleanMapper loads true/false as true/false", () => {
  assertEquals(load(seq("\x04\x08T"), BooleanMapper), true);
  assertEquals(load(seq("\x04\x08F"), BooleanMapper), false);
});

Deno.test("BooleanMapper dumps true/false as true/false", () => {
  assertEquals(dump(true, BooleanMapper), seq("\x04\x08T"));
  assertEquals(dump(false, BooleanMapper), seq("\x04\x08F"));
});
