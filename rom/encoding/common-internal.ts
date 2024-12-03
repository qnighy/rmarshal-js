export type EncodingImpl = {
  /**
   * Whether the encoding is compatible with ASCII.
   *
   * Note that, in Ruby, most encodings that are compatible with
   * graphic characters in ISO/IEC 646 INV are treated like ASCII-compatible,
   * ignoring the differences in C0 control characters and
   * substitutable characters (most notably 5C \ and 7E ~).
   */
  asciiCompatible: boolean;

  /**
   * Decomposes a byte sequence into characters.
   * @param bytes input
   * @returns an iterator of characters
   */
  chars(bytes: Uint8Array): IterableIterator<Char>;
};

export type Char = {
  /**
   * The position of the first byte of the character.
   */
  start: number;
  /**
   * The position of the byte after the character.
   */
  end: number;
  /**
   * Whether the character is valid.
   * If the character is invalid, end - start must be 1.
   */
  valid: boolean;
  /**
   * The Unicode codepoint of the character.
   * It should be set if:
   *
   * - The encoding is Unicode-based, or
   * - The character points to a valid ASCII character.
   *
   * Otherwise (for example if the character points to a character in JIS X 0208),
   * it should be undefined, and a transcoder should be attached externally.
   */
  unicode?: number | undefined;
};
export function Char(
  start: number,
  end: number,
  valid: boolean,
  unicode?: number | undefined,
): Char {
  return { start, end, valid, unicode };
}

export type EncodingRegistration = {
  impl: EncodingImpl;
  name: string;
  aliases: string[];
};
export function EncodingRegistration(
  impl: EncodingImpl,
  name: string,
  aliases: string[] = [],
): EncodingRegistration {
  return { impl, name, aliases };
}
