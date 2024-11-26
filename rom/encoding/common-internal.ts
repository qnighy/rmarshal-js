export type EncodingImpl = {
  delimit(bytes: Uint8Array, pos: number): number;
};

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
