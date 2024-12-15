import { MarshalBoolean, MarshalNil, type MarshalValue } from "../ast.ts";
import type { Mapper } from "../mapper.ts";

/**
 * Maps the Ruby `nil` to the JS `null`.
 *
 * When dumping, `undefined` and `null` are treated uniformly.
 */
export const NullMapper: Mapper<null> = {
    classNames: ["NilClass"],
    load(value: MarshalValue): { value: null } | undefined {
        if (value.type === "NilClass") {
            return { value: null };
        }
    },
    dump(value: unknown): MarshalValue | undefined {
        if (value == null) {
            return MarshalNil();
        }
    },
};

/**
 * Maps the Ruby `nil` to the JS `undefined`.
 *
 * When dumping, `undefined` and `null` are treated uniformly.
 */
export const UndefinedMapper: Mapper<undefined> = {
    classNames: ["NilClass"],
    load(value: MarshalValue): { value: undefined } | undefined {
        if (value.type === "NilClass") {
            return { value: undefined };
        }
    },
    dump(value: unknown): MarshalValue | undefined {
        if (value == null) {
            return MarshalNil();
        }
    },
};

/**
 * Maps the Ruby `true` and `false` to the JS `true` and `false`.
 */
export const BooleanMapper: Mapper<boolean> = {
    classNames: ["Boolean"],
    load(value: MarshalValue): { value: boolean } | undefined {
        if (value.type === "Boolean") {
            return { value: value.value };
        }
    },
    dump(value: unknown): MarshalValue | undefined {
        if (typeof value === "boolean") {
            return MarshalBoolean(value);
        }
    },
};
