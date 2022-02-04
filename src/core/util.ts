export class NotSupported extends Error {
  constructor(readonly message: string) {
    super(message);
  }
}

export function assert(condition: boolean, error: Error) {
  if (!condition) throw Error;
}

export function assertNotNull<T>(value: T | null, error: Error): T {
  if (value == null) throw Error;
  return value;
}
