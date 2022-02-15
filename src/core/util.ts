import * as ast from "./ast";

export class NotSupported extends Error {}

export class PlaceholderError extends Error {}

export function assert(condition: boolean, error: Error) {
  if (!condition) throw error;
}

export function assertNotNull<T>(value: T | null, error: Error): T {
  if (value == null) throw error;
  return value;
}

export function assertNameIsString(
  value: ast.Name,
  message: string
): asserts value is string {
  if (typeof value == "symbol") {
    throw new PlaceholderError(message);
  }
}
