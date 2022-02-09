export class NotSupported extends Error {}

export function assert(condition: boolean, error: Error) {
  if (!condition) throw Error;
}

export function assertNotNull<T>(value: T | null, error: Error): T {
  if (value == null) throw Error;
  return value;
}
