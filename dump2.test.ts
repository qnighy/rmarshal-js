import { assertEquals, assertThrows } from "@std/assert";
import { dump } from "./dump2.ts";
import { NullMapper, SafeIntegerMapper } from "./mapper.ts";
import { seq } from "./testutil.ts";

Deno.test("dump dumps the value using mapper", () => {
  assertEquals(dump(null, NullMapper), seq("\x04\x080"));
  assertEquals(dump(1, SafeIntegerMapper), seq("\x04\x08i", 1));
});

Deno.test("dump throws TypeError when there is no mapping", () => {
  assertThrows(
    () => dump<string | number>("foo", SafeIntegerMapper),
    TypeError,
  );
});
