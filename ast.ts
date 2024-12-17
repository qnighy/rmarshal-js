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
 * Represents nil (NilClass), whose identity does not matter.
 */
export type MarshalNil = {
  type: "NilClass";
};
export function MarshalNil(): MarshalNil {
  return { type: "NilClass" };
}

/**
 * Represents true (TrueClass) or false (FalseClass), whose identity does not matter.
 */
export type MarshalBoolean = {
  type: "Boolean";
  value: boolean;
};
export function MarshalBoolean(value: boolean): MarshalBoolean {
  return { type: "Boolean", value };
}

/**
 * Represents an integer (Integer, formerly known as Fixnum/Bignum).
 *
 * For values between -0x40000000 and 0x3FFFFFFF (i.e. 32bit Fixnum),
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
 * Represents a floating-point number (Float).
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
 * Represents a plain object, which is any instance of BasicObject
 * or its subclass other than:
 *
 * - nil (NilClass)
 * - true (TrueClass) / false (FalseClass)
 * - Integer
 * - Float
 * - Symbol
 * - Array
 * - Hash
 * - String
 * - Regexp
 * - Those that implement #marshal_dump or #_dump
 * - Those that contains extension-defined data (which must implement #_dump_data)
 * - Struct or Data (>= Ruby 3.2)
 * - Module or Class
 *
 * The object may contain cyclic references through ivars.
 */
export type MarshalObject = {
  type: "Object";
  /**
   * The fully-qualified class name of the object.
   */
  className: RSymbol;
  /**
   * Instance variables of the object, in the order of definition.
   *
   * For Ruby-defined or extension-defined classes, it may contain ivars
   * whose names do not start with `@`.
   * For example, Range objects have ivars named `begin`, `end`, and `excl`.
   */
  ivars: Map<RSymbol, MarshalValue>;
  /**
   * The fully qualified class names of the modules
   * that the object's singleton class includes,
   * in the order of Marshal declaration (i.e. in the reverse order of inclusion).
   */
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
 *
 * The object may contain cyclic references through its array elements
 * or ivars.
 */
export type MarshalArray = {
  type: "Array";
  /**
   * The elements of the array.
   */
  elements: MarshalValue[];
  /**
   * The fully-qualified class name of the object.
   *
   * Missing className indicates that the object is
   * a direct instance of Array.
   */
  className: RSymbol | undefined;
  /**
   * Instance variables of the object, in the order of definition.
   */
  ivars: Map<RSymbol, MarshalValue>;
  /**
   * The fully qualified class names of the modules
   * that the object's singleton class includes,
   * in the order of Marshal declaration (i.e. in the reverse order of inclusion).
   */
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
 *
 * The object may contain cyclic references through its keys, values,
 * the default value, or ivars.
 */
export type MarshalHash = {
  type: "Hash";
  /**
   * The entries of the hash, in the order of insertion.
   */
  entries: [MarshalValue, MarshalValue][];
  /**
   * The default value of the hash, or undefined if
   * there is no default value.
   *
   * The value, if any, should not be nil, because regular
   * Ruby operation cannot yield Hash with nil default value.
   * Instead, setting the default value through Hash#default= method
   * results in a Hash without default value.
   */
  defaultValue: MarshalValue | undefined;
  /**
   * Set to true if the Hash object was created as
   * a keyword argument container for a Method or
   * Proc with splat arguments and without keyword parameters
   * which was marked as ruby2_keywords in Ruby 2.7 or later.
   *
   * For example:
   *
   * ```ruby
   * ruby2_keywords def foo(*args)
   *   Marshal.dump(args.last)
   * end
   * foo(a: 1) # => yields Hash with ruby2Keywords=true
   * ```
   *
   * Hashes with ruby2Keywords=true must not set className
   * as there is no way to generate such Hashes in Ruby.
   */
  ruby2Keywords: boolean;
  /**
   * The fully-qualified class name of the object.
   *
   * Missing className indicates that the object is
   * a direct instance of Hash.
   */
  className: RSymbol | undefined;
  /**
   * Instance variables of the object, in the order of definition.
   */
  ivars: Map<RSymbol, MarshalValue>;
  /**
   * The fully qualified class names of the modules
   * that the object's singleton class includes,
   * in the order of Marshal declaration (i.e. in the reverse order of inclusion).
   */
  extenders: RSymbol[];
};
export type MarshalHashOptions = {
  defaultValue?: MarshalValue | undefined;
  ruby2Keywords?: boolean;
  className?: RSymbol | undefined;
  ivars?: Map<RSymbol, MarshalValue> | undefined;
  extenders?: RSymbol[] | undefined;
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
  } = options;
  return {
    type: "Hash",
    entries,
    defaultValue,
    ruby2Keywords,
    className,
    ivars,
    extenders,
  };
}

/**
 * Represents an instance of String
 * or its subclass.
 *
 * The object may contain cyclic references through its ivars.
 */
export type MarshalString = {
  type: "String";
  /**
   * The bytes of the string.
   *
   * It may contain byte sequences that deem invalid
   * in the encoding.
   */
  bytes: Uint8Array;
  /**
   * The encoding of the string.
   *
   * For strings that originate from Ruby <= 1.8,
   * it is ASCII-8BIT.
   */
  encoding: REncoding;
  /**
   * The fully-qualified class name of the object.
   *
   * Missing className indicates that the object is
   * a direct instance of String.
   */
  className: RSymbol | undefined;
  /**
   * Instance variables of the object, in the order of definition.
   */
  ivars: Map<RSymbol, MarshalValue>;
  /**
   * The fully qualified class names of the modules
   * that the object's singleton class includes,
   * in the order of Marshal declaration (i.e. in the reverse order of inclusion).
   */
  extenders: RSymbol[];
};
export type MarshalStringOptions = {
  className?: RSymbol | undefined;
  ivars?: Map<RSymbol, MarshalValue> | undefined;
  extenders?: RSymbol[] | undefined;
};
export function MarshalString(
  bytes: Uint8Array,
  encoding: REncoding,
  options: MarshalStringOptions = {},
): MarshalString {
  const { className, ivars = new Map(), extenders = [] } = options;
  return {
    type: "String",
    bytes,
    encoding,
    className,
    ivars,
    extenders,
  };
}

/**
 * Represents an instance of Regexp
 * or its subclass.
 *
 * The object may contain cyclic references through its ivars,
 * but for recent versions of Ruby, it may lead to a load error.
 */
export type MarshalRegexp = {
  type: "Regexp";
  /**
   * The bytes of the source string.
   */
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
   * - US-ASCII (only when sourceBytes are all ASCII characters)
   * - ASCII-8BIT (except when sourceBytes are all ASCII characters)
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
  /**
   * Indicates that the Regexp object originates from Ruby <= 1.8.
   * Regexp is the only class that supported multiple Kanji codes
   * (called encodings nowadays) in Ruby <= 1.8, and ruby18Compat
   * indicates that the encoding is saved in the old format.
   *
   * It also indicates that some of the escapes should be interpreted
   * differently.
   */
  ruby18Compat: boolean;
  /**
   * The fully-qualified class name of the object.
   *
   * Missing className indicates that the object is
   * a direct instance of Regexp.
   */
  className: RSymbol | undefined;
  /**
   * Instance variables of the object, in the order of definition.
   */
  ivars: Map<RSymbol, MarshalValue>;
  /**
   * The fully qualified class names of the modules
   * that the object's singleton class includes,
   * in the order of Marshal declaration (i.e. in the reverse order of inclusion).
   */
  extenders: RSymbol[];
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
  };
}

/**
 * Represents an instance of a class
 * that has `marshal_dump` and `marshal_load` methods.
 *
 * The object may not contain cyclic references to itself
 * in its inner dump value.
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
 *
 * The object may not contain cyclic references to itself
 * in its inner dump value (which is only possible via its ivars).
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
  /**
   * The instance variables of the object, in the order of definition.
   * The current CRuby implementation has buggy loading behavior,
   * so you should avoid using this field.
   */
  // TODO: implement ivars
  ivars: Map<RSymbol, MarshalValue>;
};
export type MarshalDumpBytesOptions = {
  ivars?: Map<RSymbol, MarshalValue> | undefined;
};
export function MarshalDumpBytes(
  className: RSymbol,
  bytes: Uint8Array,
  encoding: REncoding,
  options: MarshalDumpBytesOptions = {},
): MarshalDumpBytes {
  const { ivars = new Map() } = options;
  return { type: "#_dump", className, bytes, encoding, ivars };
}

/**
 * Represents an instance of an extension-defined class
 * that has `_dump_data` and `_load_data` methods.
 *
 * The object may not contain cyclic references to itself
 * in its inner dump value.
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
 *
 * The object may contain cyclic references through its entries
 * or ivars.
 */
export type MarshalStruct = {
  type: "Struct";
  className: RSymbol;
  /**
   * The entries of the struct, in the order of definition in
   * Struct.new or Data.define.
   *
   * When loading, the order of field names must match between
   * the definition and the data to be loaded.
   */
  entries: [RSymbol, MarshalValue][];
  /**
   * Instance variables of the object, in the order of definition.
   */
  // TODO: implement ivars
  ivars: Map<RSymbol, MarshalValue>;
};
export type MarshalStructOptions = {
  ivars?: Map<RSymbol, MarshalValue> | undefined;
};
export function MarshalStruct(
  className: RSymbol,
  entries: [RSymbol, MarshalValue][],
  options: MarshalStructOptions = {},
): MarshalStruct {
  const { ivars = new Map() } = options;
  return { type: "Struct", className, entries, ivars };
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
   * The fully-qualified name of the class or module itself.
   *
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
