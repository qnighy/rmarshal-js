import { assertEquals } from "@std/assert/equals";
import { load } from "../load2.ts";
import { dump } from "../dump2.ts";
import { seq } from "../testutil.ts";
import { BooleanMapper, NullMapper } from "./basic.ts";

Deno.test("NullMapper loads nil as null", () => {
  assertEquals(load(seq("\x04\x080"), NullMapper), null);
});

Deno.test("NullMapper dumps null as nil", () => {
  assertEquals(dump(null, NullMapper), seq("\x04\x080"));
});

Deno.test("BooleanMapper loads true/false as true/false", () => {
  assertEquals(load(seq("\x04\x08T"), BooleanMapper), true);
  assertEquals(load(seq("\x04\x08F"), BooleanMapper), false);
});

Deno.test("BooleanMapper dumps true/false as true/false", () => {
  assertEquals(dump(true, BooleanMapper), seq("\x04\x08T"));
  assertEquals(dump(false, BooleanMapper), seq("\x04\x08F"));
});
