/**
 * @fileoverview This file defines the Abstract Syntax Graph
 *   for the Marshal format, but the file is named AST for familiarity.
 */

import { RSymbol } from "./rom.ts";

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
};
export type MarshalObjectOptions = {
  extenders?: RSymbol[] | undefined;
};
export function MarshalObject(
  className: RSymbol,
  ivars: Map<RSymbol, MarshalValue>,
  options: MarshalObjectOptions = {},
): MarshalObject {
  const { extenders = [] } = options;
  return { type: "Object", className, ivars, extenders };
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
};
export type MarshalArrayOptions = {
  className?: RSymbol | undefined;
  ivars?: Map<RSymbol, MarshalValue> | undefined;
  extenders?: RSymbol[] | undefined;
};
export function MarshalArray(
  elements: MarshalValue[],
  options: MarshalArrayOptions = {},
): MarshalArray {
  const { className, ivars = new Map(), extenders = [] } = options;
  return { type: "Array", elements, className, ivars, extenders };
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
   * Missing className indicates that the object is
   * a direct instance of Hash.
   */
  className: RSymbol | undefined;
  ivars: Map<RSymbol, MarshalValue>;
  extenders: RSymbol[];
};
export type MarshalHashOptions = {
  defaultValue?: MarshalValue | undefined;
  className?: RSymbol | undefined;
  ivars?: Map<RSymbol, MarshalValue> | undefined;
  extenders?: RSymbol[] | undefined;
};
export function MarshalHash(
  entries: [MarshalValue, MarshalValue][],
  options: MarshalHashOptions = {},
): MarshalHash {
  const { defaultValue, className, ivars = new Map(), extenders = [] } =
    options;
  return { type: "Hash", entries, defaultValue, className, ivars, extenders };
}

/**
 * Represents an instance of String
 * or its subclass.
 */
export type MarshalString = {
  type: "String";
  bytes: Uint8Array;
  encoding: string;
  /**
   * Missing className indicates that the object is
   * a direct instance of String.
   */
  className: RSymbol | undefined;
  ivars: Map<RSymbol, MarshalValue>;
  extenders: RSymbol[];
};
export type MarshalStringOptions = {
  className?: RSymbol | undefined;
  ivars?: Map<RSymbol, MarshalValue> | undefined;
  extenders?: RSymbol[] | undefined;
};
export function MarshalString(
  bytes: Uint8Array,
  encoding: string,
  options: MarshalStringOptions = {},
): MarshalString {
  const { className, ivars = new Map(), extenders = [] } = options;
  return { type: "String", bytes, encoding, className, ivars, extenders };
}

/**
 * Represents an instance of Regexp
 * or its subclass.
 */
export type MarshalRegexp = {
  type: "Regexp";
  sourceBytes: Uint8Array;
  encoding: string;
  options: number;
  ruby18compat: boolean;
  /**
   * Missing className indicates that the object is
   * a direct instance of Regexp.
   */
  className: RSymbol | undefined;
  ivars: Map<RSymbol, MarshalValue>;
  extenders: RSymbol[];
};
export type MarshalRegexpOptions = {
  ruby18compat?: boolean | undefined;
  className?: RSymbol | undefined;
  ivars?: Map<RSymbol, MarshalValue> | undefined;
  extenders?: RSymbol[] | undefined;
};
export function MarshalRegexp(
  sourceBytes: Uint8Array,
  encoding: string,
  options: number,
  options_: MarshalRegexpOptions = {},
): MarshalRegexp {
  const { ruby18compat = false, className, ivars = new Map(), extenders = [] } =
    options_;
  return {
    type: "Regexp",
    sourceBytes,
    encoding,
    options,
    ruby18compat,
    className,
    ivars,
    extenders,
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
  dump: Uint8Array;
};
export function MarshalDumpBytes(
  className: RSymbol,
  dump: Uint8Array,
): MarshalDumpBytes {
  return { type: "#_dump", className, dump };
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
};
export function MarshalStruct(
  className: RSymbol,
  entries: [RSymbol, MarshalValue][],
): MarshalStruct {
  return { type: "Struct", className, entries };
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
