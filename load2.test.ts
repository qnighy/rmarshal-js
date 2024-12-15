import { assertEquals, assertThrows } from "@std/assert";
import { load } from "./load2.ts";
import { NullMapper, SafeIntegerMapper } from "./mapper.ts";
import { seq } from "./testutil.ts";

Deno.test("load loads the value using mapper", () => {
  assertEquals(load(seq("\x04\x080"), NullMapper), null);
  assertEquals(load(seq("\x04\x08i", 1), SafeIntegerMapper), 1);
});

Deno.test("load throws TypeError when there is no mapping", () => {
  assertThrows(
    // () => load(seq("\x04\x08:", 3, "foo"), SafeIntegerMapper),
    () => load(seq("\x04\x080"), SafeIntegerMapper),
    TypeError,
  );
});
