/**
 * @fileoverview This file defines the Abstract Syntax Graph
 *   for the Marshal format, but the file is named AST for familiarity.
 */

import { REncoding, RSymbol } from "./rom.ts";

/**
 * A node in the graph.
 */
export type MarshalValue =
  | MarshalNil
  | MarshalBoolean
  | MarshalInteger
  | MarshalFloat
  | MarshalSymbol
  | MarshalObject
  | MarshalArray
  | MarshalHash
  | MarshalString
  | MarshalRegexp
  | MarshalDump
  | MarshalDumpBytes
  | MarshalDumpData
  | MarshalStruct
  | MarshalModule;

/**
 * Represents nil, whose identity does not matter.
 */
export type MarshalNil = {
  type: "NilClass";
};
export function MarshalNil(): MarshalNil {
  return { type: "NilClass" };
}

/**
 * Represents true or false, whose identity does not matter.
 */
export type MarshalBoolean = {
  type: "Boolean";
  value: boolean;
};
export function MarshalBoolean(value: boolean): MarshalBoolean {
  return { type: "Boolean", value };
}

/**
 * Represents an integer.
 *
 * For values between -0x40000000 and 0x3FFFFFFF,
 * identity does not matter.
 */
export type MarshalInteger = {
  type: "Integer";
  value: bigint;
};
export function MarshalInteger(value: bigint): MarshalInteger {
  return { type: "Integer", value };
}

/**
 * Represents a floating-point number.
 */
export type MarshalFloat = {
  type: "Float";
  value: number;
};
export function MarshalFloat(value: number): MarshalFloat {
  return { type: "Float", value };
}

/**
 * Represents a Symbol, whose identity does not matter.
 */
export type MarshalSymbol = {
  type: "Symbol";
  value: RSymbol;
};
export function MarshalSymbol(value: RSymbol): MarshalSymbol {
  return { type: "Symbol", value };
}

/**
 * Represents a plain object.
 */
export type MarshalObject = {
  type: "Object";
  className: RSymbol;
  ivars: Map<RSymbol, MarshalValue>;
  extenders: RSymbol[];
  /** true if it is self-referential. */
  cycle: boolean | undefined;
};
export type MarshalObjectOptions = {
  extenders?: RSymbol[] | undefined;
  cycle?: boolean | undefined;
};
export function MarshalObject(
  className: RSymbol,
  ivars: Map<RSymbol, MarshalValue>,
  options: MarshalObjectOptions = {},
): MarshalObject {
  const { extenders = [], cycle } = options;
  return { type: "Object", className, ivars, extenders, cycle };
}

/**
 * Represents an instance of Array
 * or its subclass.
 */
export type MarshalArray = {
  type: "Array";
  elements: MarshalValue[];
  /**
   * Missing className indicates that the object is
   * a direct instance of Array.
   */
  className: RSymbol | undefined;
  ivars: Map<RSymbol, MarshalValue>;
  extenders: RSymbol[];
  /** true if it is self-referential. */
  cycle: boolean | undefined;
};
export type MarshalArrayOptions = {
  className?: RSymbol | undefined;
  ivars?: Map<RSymbol, MarshalValue> | undefined;
  extenders?: RSymbol[] | undefined;
  cycle?: boolean | undefined;
};
export function MarshalArray(
  elements: MarshalValue[],
  options: MarshalArrayOptions = {},
): MarshalArray {
  const { className, ivars = new Map(), extenders = [], cycle } = options;
  return { type: "Array", elements, className, ivars, extenders, cycle };
}

/**
 * Represents an instance of Hash
 * or its subclass.
 */
export type MarshalHash = {
  type: "Hash";
  entries: [MarshalValue, MarshalValue][];
  defaultValue: MarshalValue | undefined;
  /**
   * Is this a wrapper Hash object generated
   * for a set of keyword parameters passed
   * to a Method/Proc with ruby2_keywords flag?
   */
  ruby2Keywords: boolean;
  /**
   * Missing className indicates that the object is
   * a direct instance of Hash.
   */
  className: RSymbol | undefined;
  ivars: Map<RSymbol, MarshalValue>;
  extenders: RSymbol[];
  /** true if it is self-referential. */
  cycle: boolean | undefined;
};
export type MarshalHashOptions = {
  defaultValue?: MarshalValue | undefined;
  ruby2Keywords?: boolean;
  className?: RSymbol | undefined;
  ivars?: Map<RSymbol, MarshalValue> | undefined;
  extenders?: RSymbol[] | undefined;
  cycle?: boolean | undefined;
};
export function MarshalHash(
  entries: [MarshalValue, MarshalValue][],
  options: MarshalHashOptions = {},
): MarshalHash {
  const {
    defaultValue,
    ruby2Keywords = false,
    className,
    ivars = new Map(),
    extenders = [],
    cycle,
  } = options;
  return {
    type: "Hash",
    entries,
    defaultValue,
    ruby2Keywords,
    className,
    ivars,
    extenders,
    cycle,
  };
}

/**
 * Represents an instance of String
 * or its subclass.
 */
export type MarshalString = {
  type: "String";
  bytes: Uint8Array;
  encoding: REncoding;
  /**
   * Missing className indicates that the object is
   * a direct instance of String.
   */
  className: RSymbol | undefined;
  ivars: Map<RSymbol, MarshalValue>;
  extenders: RSymbol[];
  /** true if it is self-referential. */
  cycle: boolean | undefined;
};
export type MarshalStringOptions = {
  className?: RSymbol | undefined;
  ivars?: Map<RSymbol, MarshalValue> | undefined;
  extenders?: RSymbol[] | undefined;
  cycle?: boolean | undefined;
};
export function MarshalString(
  bytes: Uint8Array,
  encoding: REncoding,
  options: MarshalStringOptions = {},
): MarshalString {
  const { className, ivars = new Map(), extenders = [], cycle } = options;
  return {
    type: "String",
    bytes,
    encoding,
    className,
    ivars,
    extenders,
    cycle,
  };
}

/**
 * Represents an instance of Regexp
 * or its subclass.
 */
export type MarshalRegexp = {
  type: "Regexp";
  sourceBytes: Uint8Array;
  /**
   * The encoding of the source string.
   * If the encoding is ASCII-compatible and the
   * sourceBytes are all ASCII characters, the
   * encoding should be US-ASCII, with the exception
   * that if the object originates from a regexp literal,
   * the following encodings are additionally allowed:
   *
   * - EUC-JP
   * - Windows-31J
   * - UTF-8
   *
   * If ruby18Compat is true, the encoding should be
   * one of the following:
   *
   * - US-ASCII
   * - ASCII-8BIT
   * - EUC-JP
   * - Windows-31J
   * - UTF-8
   */
  encoding: REncoding;
  ignoreCase: boolean;
  extended: boolean;
  multiline: boolean;
  /**
   * Indicates existence of /../n flag.
   * It should only be set if the source encoding
   * is US-ASCII or ASCII-8BIT.
   *
   * For Ruby >= 1.9, this is almost meaningless
   * but reflected in Regexp::NOENCODING flag.
   *
   * For Ruby <= 1.8, it means that the `encoding`
   * value of US-ASCII or ASCII-8BIT is effective.
   * Otherwise the encoding is meaningless and
   * $KCODE value at runtime is preferred.
   */
  noEncoding: boolean;
  ruby18Compat: boolean;
  /**
   * Missing className indicates that the object is
   * a direct instance of Regexp.
   */
  className: RSymbol | undefined;
  ivars: Map<RSymbol, MarshalValue>;
  extenders: RSymbol[];
  /** true if it is self-referential. */
  cycle: boolean | undefined;
};
export type MarshalRegexpOptions = {
  ignoreCase?: boolean | undefined;
  extended?: boolean | undefined;
  multiline?: boolean | undefined;
  noEncoding?: boolean | undefined;
  ruby18Compat?: boolean | undefined;
  className?: RSymbol | undefined;
  ivars?: Map<RSymbol, MarshalValue> | undefined;
  extenders?: RSymbol[] | undefined;
  cycle?: boolean | undefined;
};
export function MarshalRegexp(
  sourceBytes: Uint8Array,
  encoding: REncoding,
  options: MarshalRegexpOptions = {},
): MarshalRegexp {
  const {
    ignoreCase = false,
    extended = false,
    multiline = false,
    noEncoding = false,
    ruby18Compat = false,
    className,
    ivars = new Map(),
    extenders = [],
    cycle,
  } = options;
  return {
    type: "Regexp",
    sourceBytes,
    encoding,
    ignoreCase,
    extended,
    multiline,
    noEncoding,
    ruby18Compat,
    className,
    ivars,
    extenders,
    cycle,
  };
}

/**
 * Represents an instance of a class
 * that has `marshal_dump` and `marshal_load` methods.
 */
export type MarshalDump = {
  type: "#marshal_dump";
  className: RSymbol;
  /**
   * The return value of `klass#marshal_dump`, or
   * the argument of `klass#marshal_load`,
   * where the latter's receiver is a fresh instance of the class
   * allocated by `Class#allocate`.
   */
  dump: MarshalValue;
};
export function MarshalDump(
  className: RSymbol,
  dump: MarshalValue,
): MarshalDump {
  return { type: "#marshal_dump", className, dump };
}

/**
 * Represents an instance of a class
 * that has `_dump` and `_load` methods.
 */
export type MarshalDumpBytes = {
  type: "#_dump";
  className: RSymbol;
  /**
   * The bytes portion of the String returned by `Object#_dump`, or
   * the String argument of `klass._load`.
   */
  bytes: Uint8Array;
  /**
   * The encoding portion of the String returned by `Object#_dump`, or
   * the String argument of `klass._load`.
   */
  encoding: REncoding;
};
export function MarshalDumpBytes(
  className: RSymbol,
  bytes: Uint8Array,
  encoding: REncoding,
): MarshalDumpBytes {
  return { type: "#_dump", className, bytes, encoding };
}

/**
 * Represents an instance of an extension-defined class
 * that has `_dump_data` and `_load_data` methods.
 */
export type MarshalDumpData = {
  type: "#_dump_data";
  className: RSymbol;
  /**
   * The return value of `klass#_dump_data`, or
   * the argument of `klass#_load_data`,
   * where the latter's receiver is a fresh instance of the class
   * allocated by `Class#allocate`.
   */
  dump: MarshalValue;
};
export function MarshalDumpData(
  className: RSymbol,
  dump: MarshalValue,
): MarshalDumpData {
  return { type: "#_dump_data", className, dump };
}

/**
 * Represents an instance of a subclass
 * of Struct or Data (>= Ruby 3.2).
 */
export type MarshalStruct = {
  type: "Struct";
  className: RSymbol;
  entries: [RSymbol, MarshalValue][];
  /** true if it is self-referential. */
  cycle: boolean | undefined;
};
export type MarshalStructOptions = {
  cycle?: boolean | undefined;
};
export function MarshalStruct(
  className: RSymbol,
  entries: [RSymbol, MarshalValue][],
  options: MarshalStructOptions = {},
): MarshalStruct {
  const { cycle } = options;
  return { type: "Struct", className, entries, cycle };
}

/**
 * Represents a class or a module.
 */
export type MarshalModule = {
  type: "Module";
  /**
   * Whether the object is a class or a module that is not a class.
   *
   * - "class" indicates that the object is a class.
   * - "module" indicates that the object is a module, not a class.
   * - "legacy" indicates that it is unknown whether the object is a class or a module.
   */
  kind: "class" | "module" | "legacy";
  /**
   * Due to format limitations, the module name can only be in
   * US-ASCII or ASCII-8BIT encoding.
   */
  moduleName: RSymbol;
};
export function MarshalModule(
  kind: "class" | "module" | "legacy",
  moduleName: RSymbol,
): MarshalModule {
  return { type: "Module", kind, moduleName };
}
