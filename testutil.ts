export type SeqElement =
  /* raw bytes, interpreting U+0000 to U+00FF as a byte */
  | string
  /* Fixnum-encoded (non-negative only) */
  | number;
export function seq(...elems: SeqElement[]): Uint8Array {
  const bytes: number[] = [];
  for (const elem of elems) {
    if (typeof elem === "string") {
      for (const ch of elem) {
        const cp = ch.codePointAt(0)!;
        if (cp >= 0x100) {
          throw new Error(`Invalid codepoint: ${cp}`);
        }
        bytes.push(cp);
      }
    } else if (typeof elem === "number") {
      if (!Number.isInteger(elem)) {
        throw new Error(`Not an integer: ${elem}`);
      }
      if (elem < 0) {
        throw new Error(`Negative number: ${elem}`);
      }
      if (elem === 0) {
        bytes.push(0x00);
      } else if (elem < 123) {
        bytes.push(elem + 5);
      } else if (elem < 0x100) {
        bytes.push(1, elem);
      } else if (elem < 0x10000) {
        bytes.push(2, elem & 0xFF, elem >> 8);
      } else if (elem < 0x1000000) {
        bytes.push(3, elem & 0xFF, (elem >> 8) & 0xFF, elem >> 16);
      } else if (elem < 0x40000000) {
        bytes.push(
          4,
          elem & 0xFF,
          (elem >> 8) & 0xFF,
          (elem >> 16) & 0xFF,
          elem >> 24,
        );
      } else {
        throw new Error(`Fixnum too large: ${elem}`);
      }
    }
  }
  return Uint8Array.from(bytes);
}
